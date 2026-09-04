# 🚀 Deploy to Railway — Step by Step

No Docker. No laptop running 24/7. Everything runs free in the cloud.

---

## Part 1 — Push your code to GitHub (2 min)

Railway deploys from GitHub. You need to push the project there first.

1. Go to [github.com](https://github.com) → **New repository** → name it `leetcode-tracker` → **Create**

2. Open a terminal in your project folder and run:
```bash
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/leetcode-tracker.git
git push -u origin main
```

---

## Part 2 — Set up Railway (3 min)

1. Go to **[railway.app](https://railway.app)** → Sign up with GitHub

2. Click **New Project** → **Deploy from GitHub repo** → select `leetcode-tracker`

3. Railway detects Node.js automatically. **Don't deploy yet.**

---

## Part 3 — Add a PostgreSQL database (1 min)

1. In your Railway project, click **+ Add a Service** → **Database** → **PostgreSQL**

2. Railway creates the DB and sets `DATABASE_URL` automatically.

---

## Part 4 — Add your environment variables (2 min)

Click your **Node.js service** → **Variables** tab → add these:

| Variable | Value |
|----------|-------|
| `MY_LEETCODE_USERNAME` | Your LeetCode handle |
| `LEETCODE_SESSION` | Your session cookie *(see below)* |
| `TELEGRAM_BOT_TOKEN` | Your bot token *(see below)* |
| `TELEGRAM_CHAT_ID` | Your chat ID *(see below)* |

> `DATABASE_URL` and `PORT` are auto-set by Railway — don't add them manually.

---

## How to get each value

### `LEETCODE_SESSION` cookie
1. Open leetcode.com → log in
2. Press **F12** → **Application** → **Cookies** → `leetcode.com`
3. Find `LEETCODE_SESSION` → copy the value

### `TELEGRAM_BOT_TOKEN`
1. Open Telegram → search **@BotFather** → send `/newbot`
2. Give it a name → copy the token it gives you

### `TELEGRAM_CHAT_ID`
1. Open your new bot in Telegram → send it `/start`
2. Open in browser (replace YOUR_TOKEN):
   ```
   https://api.telegram.org/botYOUR_TOKEN/getUpdates
   ```
3. Find `"chat":{"id":XXXXXXX}` → that number is your Chat ID

---

## Part 5 — Deploy

Click **Deploy** in Railway → check the **Logs** tab. You'll see:
```
🚀 LeetCode Friends Tracker starting...
📬 Telegram notifications : enabled ✅
[DB] Migrations complete.
[Sync] Found X followed user(s).
✅ API server ready
```

**Done! Your phone gets notified 24/7.**

---

## Updating later

```bash
git add . && git commit -m "update" && git push
```
Railway auto-redeploys on every push.
