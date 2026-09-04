const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL ?? "";

/**
 * Send a message to your Discord channel via webhook.
 */
async function sendDiscordMessage(content: string, embeds?: object[]): Promise<void> {
  if (!DISCORD_WEBHOOK_URL) return;

  const body: any = {};
  if (embeds) {
    body.embeds = embeds;
  } else {
    body.content = content;
  }

  const res = await fetch(DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[Discord] Failed to send message:", text);
  }
}

/**
 * Notify: someone you follow solved a problem.
 */
export async function notifyNewSolve(opts: {
  username: string;
  problemTitle: string;
  problemSlug: string;
  lang: string;
  solvedAt: Date;
  contestRating?: number | null;
}): Promise<void> {
  const problemUrl = `https://leetcode.com/problems/${opts.problemSlug}/`;
  const profileUrl = `https://leetcode.com/${opts.username}/`;
  const time = opts.solvedAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  const fields: any[] = [
    { name: "👤 User", value: `[${opts.username}](${profileUrl})`, inline: true },
    { name: "💻 Language", value: opts.lang, inline: true },
    { name: "⏰ Solved At", value: time, inline: false },
  ];

  if (opts.contestRating) {
    fields.push({ name: "📊 Contest Rating", value: `${Math.round(opts.contestRating)}`, inline: true });
  }

  const embed = {
    title: `🆕 ${opts.problemTitle}`,
    url: problemUrl,
    color: 0x00c853, // green
    description: `**${opts.username}** solved a new problem!`,
    fields,
    timestamp: opts.solvedAt.toISOString(),
  };

  await sendDiscordMessage("", [embed]);
}

/**
 * Notify: contest rating changed.
 */
export async function notifyRatingChange(opts: {
  username: string;
  oldRating: number | null;
  newRating: number;
}): Promise<void> {
  const profileUrl = `https://leetcode.com/${opts.username}/`;
  const isIncrease = opts.oldRating !== null && opts.newRating > opts.oldRating;
  const change = opts.oldRating !== null
    ? ` (${isIncrease ? "+" : ""}${Math.round(opts.newRating - opts.oldRating)})`
    : "";

  const arrow = opts.oldRating === null
    ? `→ **${Math.round(opts.newRating)}**`
    : `${Math.round(opts.oldRating)} → **${Math.round(opts.newRating)}**${change}`;

  const embed = {
    title: `📊 Contest Rating Update`,
    url: profileUrl,
    color: isIncrease ? 0x2196f3 : 0xff5722, // blue if up, orange if down
    description: `**[${opts.username}](${profileUrl})**\n⭐ ${arrow}`,
    timestamp: new Date().toISOString(),
  };

  await sendDiscordMessage("", [embed]);
}

/**
 * Check if Discord is configured.
 */
export function isDiscordConfigured(): boolean {
  return !!DISCORD_WEBHOOK_URL;
}
