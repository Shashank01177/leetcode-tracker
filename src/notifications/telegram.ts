const TELEGRAM_API = "https://api.telegram.org";

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set in .env");
  return token;
}

function getChatId(): string {
  const id = process.env.TELEGRAM_CHAT_ID;
  if (!id) throw new Error("TELEGRAM_CHAT_ID is not set in .env");
  return id;
}

/**
 * Send a plain text or HTML message to your Telegram chat.
 */
export async function sendTelegramMessage(html: string): Promise<void> {
  const token = getBotToken();
  const chatId = getChatId();

  const url = `${TELEGRAM_API}/bot${token}/sendMessage`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: html,
      parse_mode: "HTML",
      disable_web_page_preview: false,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[Telegram] Failed to send message:", body);
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
  const ratingLine = opts.contestRating
    ? `\n📊 <b>Contest Rating:</b> ${Math.round(opts.contestRating)}`
    : "";

  const msg =
    `🔔 <b>New Solve!</b>\n\n` +
    `👤 <a href="${profileUrl}">${opts.username}</a> solved a problem:\n` +
    `🧩 <b><a href="${problemUrl}">${opts.problemTitle}</a></b>\n` +
    `💻 Language: <code>${opts.lang}</code>\n` +
    `⏰ Solved at: ${time}` +
    ratingLine;

  await sendTelegramMessage(msg);
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
  const arrow = opts.oldRating === null
    ? `→ <b>${Math.round(opts.newRating)}</b>`
    : `${Math.round(opts.oldRating)} → <b>${Math.round(opts.newRating)}</b>`;
  const change = opts.oldRating !== null
    ? ` (${opts.newRating > opts.oldRating ? "+" : ""}${Math.round(opts.newRating - opts.oldRating)})`
    : "";

  const msg =
    `📊 <b>Rating Update!</b>\n\n` +
    `👤 <a href="${profileUrl}">${opts.username}</a>\n` +
    `⭐ ${arrow}${change}`;

  await sendTelegramMessage(msg);
}

/**
 * Check if Telegram is configured.
 */
export function isTelegramConfigured(): boolean {
  return !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}
