import * as dotenv from "dotenv";
dotenv.config();

import { runMigrations } from "./db/migrate";
import { startPoller } from "./poller";
import { createApp } from "./api";

const PORT        = parseInt(process.env.PORT ?? "3000", 10);
const MY_USERNAME = process.env.MY_LEETCODE_USERNAME ?? "(not set)";

async function main(): Promise<void> {
  console.log("🚀 LeetCode Friends Tracker starting...");
  console.log(`👤 Your LeetCode username  : ${MY_USERNAME}`);
  console.log(`📬 Discord notifications   : ${process.env.DISCORD_WEBHOOK_URL ? "enabled ✅" : "disabled ⚠️"}`);

  // 1. Run DB migrations (idempotent)
  await runMigrations();

  // 2. Start background poller
  startPoller();

  // 3. Start HTTP API server
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`\n✅ API server ready at http://localhost:${PORT}`);
    console.log(`   GET  /health`);
    console.log(`   GET  /api/v1/users`);
    console.log(`   GET  /api/v1/submissions`);
    console.log(`   GET  /api/v1/submissions/:username`);
    console.log(`   GET  /api/v1/ratings/:username`);
    console.log(`   GET  /api/v1/ratings/:username/history\n`);
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
