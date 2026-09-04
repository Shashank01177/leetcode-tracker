# LeetCode Friends Tracker

Get **Telegram notifications** whenever people you follow on LeetCode solve a problem.  
Tracks contest ratings too. Stores everything in PostgreSQL.

---

## How it works

```
Your LeetCode account
        │
        ▼ (every 30 min)
 Fetch your following list
        │
        ▼ (every 5 min)
 Poll each person's recent solves + contest rating
        │
        ├─▶ 💾 Store in PostgreSQL
        └─▶ 📬 Send Telegram notification to your phone
```

---

## Setup (5 minutes)

### Step 1 — Start the database
```bash
docker-compose up -d
```

### Step 2 — Configure your `.env`
```bash
cp .env.example .env
```

Edit `.env` and fill in:

| Variable | How to get it |
|----------|--------------|
| `MY_LEETCODE_USERNAME` | Your LeetCode handle |
| `LEETCODE_SESSION` | Log into leetcode.com → DevTools (F12) → Application → Cookies → copy `LEETCODE_SESSION` value |
| `TELEGRAM_BOT_TOKEN` | Message **@BotFather** on Telegram → `/newbot` → copy the token |
| `TELEGRAM_CHAT_ID` | Message your bot `/start`, then open `https://api.telegram.org/bot<TOKEN>/getUpdates` → find `chat.id` |

### Step 3 — Run
```bash
npm install
npm run dev
```

On startup you'll see your following list get fetched and the first poll fire immediately.

---

## What you get on your phone

**When someone solves a problem:**
```
🔔 New Solve!

👤 neal_wu solved a problem:
🧩 Two Sum
💻 Language: cpp
⏰ Solved at: 4/9/2026, 7:15:00 pm
📊 Contest Rating: 3542
```

**When their contest rating changes:**
```
📊 Rating Update!

👤 neal_wu
⭐ 3540 → 3542 (+2)
```

---

## REST API (for history & querying)

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/users` | Who you're following (auto-synced) |
| `GET /api/v1/submissions` | All solves (`?username=` `?since=` `?limit=`) |
| `GET /api/v1/submissions/:username` | Solves by one person |
| `GET /api/v1/ratings/:username` | Latest contest rating |
| `GET /api/v1/ratings/:username/history` | Rating over time |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MY_LEETCODE_USERNAME` | *(required)* | Your LeetCode handle |
| `LEETCODE_SESSION` | *(required)* | Your session cookie for fetching following list |
| `TELEGRAM_BOT_TOKEN` | *(required for notifications)* | Telegram bot token |
| `TELEGRAM_CHAT_ID` | *(required for notifications)* | Your Telegram chat ID |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/leetcode_tracker` | PostgreSQL URL |
| `PORT` | `3000` | API server port |
| `POLL_CRON` | `*/5 * * * *` | How often to check for new solves |
| `SYNC_FOLLOWING_CRON` | `*/30 * * * *` | How often to sync your following list |
