import { Router, Request, Response } from "express";
import { pool } from "../../db/client";

export const ratingsRouter = Router();

/** GET /ratings/:username — latest contest rating snapshot for a user */
ratingsRouter.get("/:username", async (req: Request, res: Response) => {
  const { username } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, username, rating, global_ranking, contests_attended,
              top_percentage, snapshotted_at
       FROM rating_snapshots
       WHERE username = $1
       ORDER BY snapshotted_at DESC
       LIMIT 1`,
      [username]
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        error: `No rating data found for "${username}". Either they are not being tracked or have no contest history.`,
      });
      return;
    }

    res.json({ rating: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

/** GET /ratings/:username/history — full rating history for a user */
ratingsRouter.get("/:username/history", async (req: Request, res: Response) => {
  const { username } = req.params;
  const limit = Math.min(parseInt((req.query.limit as string) || "100", 10), 500);

  try {
    const result = await pool.query(
      `SELECT id, username, rating, global_ranking, contests_attended,
              top_percentage, snapshotted_at
       FROM rating_snapshots
       WHERE username = $1
       ORDER BY snapshotted_at ASC
       LIMIT $2`,
      [username, limit]
    );

    res.json({ username, history: result.rows, count: result.rowCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});
