import cron from "node-cron";
import { pool } from "../db/client";
import { getRecentAcSubmissions, getContestRating } from "../leetcode/queries";
import { getFollowingList } from "../leetcode/following";
import { notifyNewSolve, notifyRatingChange, isTelegramConfigured } from "../notifications/telegram";

const POLL_CRON          = process.env.POLL_CRON           ?? "*/5 * * * *";
const SYNC_FOLLOWING_CRON = process.env.SYNC_FOLLOWING_CRON ?? "*/30 * * * *";
const MY_USERNAME        = process.env.MY_LEETCODE_USERNAME ?? "";

// ─── Following list sync ──────────────────────────────────────────────────────

async function syncFollowingList(): Promise<void> {
  if (!MY_USERNAME) {
    console.warn("[Sync] MY_LEETCODE_USERNAME not set in .env — skipping following sync.");
    return;
  }

  console.log(`[Sync] Fetching following list for @${MY_USERNAME}...`);

  let followed;
  try {
    followed = await getFollowingList(MY_USERNAME);
  } catch (err) {
    console.error("[Sync] Failed to fetch following list:", err);
    return;
  }

  if (!followed.length) {
    console.log("[Sync] No followed users found (or session cookie is invalid).");
    return;
  }

  console.log(`[Sync] Found ${followed.length} followed user(s).`);

  // Upsert each followed user into tracked_users
  for (const user of followed) {
    await pool.query(
      `INSERT INTO tracked_users (username) VALUES ($1) ON CONFLICT (username) DO NOTHING`,
      [user.username]
    );
  }

  // Remove users that are no longer followed
  const followedUsernames = followed.map((u) => u.username);
  if (followedUsernames.length > 0) {
    const placeholders = followedUsernames.map((_, i) => `$${i + 1}`).join(", ");
    const removed = await pool.query(
      `DELETE FROM tracked_users WHERE username NOT IN (${placeholders}) RETURNING username`,
      followedUsernames
    );
    if (removed.rowCount && removed.rowCount > 0) {
      const names = removed.rows.map((r: any) => r.username).join(", ");
      console.log(`[Sync] Removed unfollowed users: ${names}`);
    }
  }

  console.log("[Sync] Following list synced.");
}

// ─── Per-user submission polling ──────────────────────────────────────────────

async function processSubmissions(username: string): Promise<void> {
  let submissions;
  try {
    submissions = await getRecentAcSubmissions(username, 20);
  } catch (err) {
    console.error(`[Poller] Failed to fetch submissions for ${username}:`, err);
    return;
  }

  if (!submissions.length) return;

  for (const sub of submissions) {
    const solvedAt  = new Date(parseInt(sub.timestamp, 10) * 1000);
    const uniqueKey = `${username}::${sub.titleSlug}::${sub.timestamp}`;

    try {
      const result = await pool.query(
        `INSERT INTO submissions (username, lc_submission_id, problem_title, problem_slug, solved_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (lc_submission_id) DO NOTHING
         RETURNING id`,
        [username, uniqueKey, sub.title, sub.titleSlug, solvedAt]
      );

      if (result.rowCount && result.rowCount > 0) {
        // ✅ New solve detected — log it
        console.log(
          `[Poller] 🆕 ${username} solved "${sub.title}" (${sub.lang}) at ${solvedAt.toISOString()}`
        );

        // 📬 Send Telegram notification
        if (isTelegramConfigured()) {
          // Fetch latest rating to include in the notification
          const latestRating = await pool.query<{ rating: string }>(
            `SELECT rating FROM rating_snapshots WHERE username = $1 ORDER BY snapshotted_at DESC LIMIT 1`,
            [username]
          );
          const rating = latestRating.rows[0]
            ? parseFloat(latestRating.rows[0].rating)
            : null;

          notifyNewSolve({
            username,
            problemTitle : sub.title,
            problemSlug  : sub.titleSlug,
            lang         : sub.lang,
            solvedAt,
            contestRating: rating,
          }).catch((err) => console.error("[Telegram] Notification failed:", err));
        }
      }
    } catch (err) {
      console.error(`[Poller] DB insert error for ${uniqueKey}:`, err);
    }
  }
}

// ─── Per-user rating polling ──────────────────────────────────────────────────

async function processRating(username: string): Promise<void> {
  let rating;
  try {
    rating = await getContestRating(username);
  } catch (err) {
    console.error(`[Poller] Failed to fetch rating for ${username}:`, err);
    return;
  }

  if (rating.rating === null) return; // Never entered a contest

  try {
    const last = await pool.query<{ rating: string }>(
      `SELECT rating FROM rating_snapshots WHERE username = $1 ORDER BY snapshotted_at DESC LIMIT 1`,
      [username]
    );
    const lastRating = last.rows[0] ? parseFloat(last.rows[0].rating) : null;

    const ratingChanged = lastRating === null || Math.abs(lastRating - rating.rating) > 0.001;

    if (ratingChanged) {
      // Store new snapshot in DB
      await pool.query(
        `INSERT INTO rating_snapshots (username, rating, global_ranking, contests_attended, top_percentage)
         VALUES ($1, $2, $3, $4, $5)`,
        [username, rating.rating, rating.globalRanking, rating.attendedContestsCount, rating.topPercentage]
      );

      console.log(`[Poller] 📊 ${username} rating: ${lastRating ?? "N/A"} → ${Math.round(rating.rating)}`);

      // 📬 Send Telegram notification for rating change
      if (isTelegramConfigured()) {
        notifyRatingChange({
          username,
          oldRating: lastRating,
          newRating: rating.rating,
        }).catch((err) => console.error("[Telegram] Rating notification failed:", err));
      }
    }
  } catch (err) {
    console.error(`[Poller] DB error for rating of ${username}:`, err);
  }
}

// ─── Main poll cycle ──────────────────────────────────────────────────────────

async function pollAll(): Promise<void> {
  const result = await pool.query<{ username: string }>(
    "SELECT username FROM tracked_users ORDER BY added_at"
  );
  const users = result.rows.map((r) => r.username);

  if (!users.length) {
    console.log("[Poller] No tracked users yet — waiting for following list sync.");
    return;
  }

  console.log(`[Poller] Polling ${users.length} followed user(s)...`);

  for (const username of users) {
    await processSubmissions(username);
    await processRating(username);
  }

  console.log("[Poller] Poll cycle complete.");
}

// ─── Startup ──────────────────────────────────────────────────────────────────

export function startPoller(): void {
  if (!isTelegramConfigured()) {
    console.warn(
      "[Poller] ⚠️  TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set — " +
      "notifications are disabled. Data will still be stored in the DB."
    );
  }

  // 1. Sync following list immediately, then on schedule
  console.log(`[Sync] Following list sync schedule: "${SYNC_FOLLOWING_CRON}"`);
  syncFollowingList()
    .then(() => pollAll())                                          // poll immediately after first sync
    .catch((err) => console.error("[Startup] Initial sync error:", err));

  cron.schedule(SYNC_FOLLOWING_CRON, () => {
    syncFollowingList().catch((err) => console.error("[Sync] Sync error:", err));
  });

  // 2. Poll submissions + ratings on schedule
  console.log(`[Poller] Submission poll schedule: "${POLL_CRON}"`);
  cron.schedule(POLL_CRON, () => {
    pollAll().catch((err) => console.error("[Poller] Poll error:", err));
  });
}
