import fs from "fs";
import path from "path";
import { pool } from "./client";

export async function runMigrations(): Promise<void> {
  const migrationsDir = path.join(__dirname, "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const client = await pool.connect();
  try {
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
      console.log(`[DB] Running migration: ${file}`);
      await client.query(sql);
    }
    console.log("[DB] Migrations complete.");
  } finally {
    client.release();
  }
}

// Allow running directly: tsx src/db/migrate.ts
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[DB] Migration failed:", err);
      process.exit(1);
    });
}
