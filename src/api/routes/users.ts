import { Router, Request, Response } from "express";
import { pool } from "../../db/client";

export const usersRouter = Router();

/**
 * GET /users
 * Lists all users currently being tracked (auto-populated from your LeetCode following list).
 */
usersRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT id, username, added_at FROM tracked_users ORDER BY added_at"
    );
    res.json({
      count: result.rowCount,
      users: result.rows,
      note: "This list is automatically synced from your LeetCode following list every 30 minutes.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});
