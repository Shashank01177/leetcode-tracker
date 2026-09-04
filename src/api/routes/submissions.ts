import { Router, Request, Response } from "express";
import { pool } from "../../db/client";

export const submissionsRouter = Router();

/**
 * GET /submissions
 * Query params:
 *   ?username=  — filter by username
 *   ?limit=     — max rows (default 50, max 200)
 *   ?since=     — ISO datetime, only return submissions after this time
 */
submissionsRouter.get("/", async (req: Request, res: Response) => {
  const { username, limit: limitStr, since } = req.query;

  const limit = Math.min(parseInt((limitStr as string) || "50", 10), 200);
  if (isNaN(limit) || limit < 1) {
    res.status(400).json({ error: "Invalid limit parameter" });
    return;
  }

  const conditions: string[] = [];
  const values: unknown[] = [];

  if (username) {
    conditions.push(`username = $${values.length + 1}`);
    values.push(username);
  }

  if (since) {
    const sinceDate = new Date(since as string);
    if (isNaN(sinceDate.getTime())) {
      res.status(400).json({ error: "Invalid since parameter (use ISO 8601)" });
      return;
    }
    conditions.push(`solved_at >= $${values.length + 1}`);
    values.push(sinceDate);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  values.push(limit);

  try {
    const result = await pool.query(
      `SELECT id, username, lc_submission_id, problem_title, problem_slug,
              problem_url, solved_at, detected_at
       FROM submissions
       ${where}
       ORDER BY solved_at DESC
       LIMIT $${values.length}`,
      values
    );

    res.json({ submissions: result.rows, count: result.rowCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

/** GET /submissions/:username — all submissions for a specific user */
submissionsRouter.get("/:username", async (req: Request, res: Response) => {
  const { username } = req.params;
  const limit = Math.min(parseInt((req.query.limit as string) || "50", 10), 200);

  try {
    const result = await pool.query(
      `SELECT id, username, lc_submission_id, problem_title, problem_slug,
              problem_url, solved_at, detected_at
       FROM submissions
       WHERE username = $1
       ORDER BY solved_at DESC
       LIMIT $2`,
      [username, limit]
    );

    res.json({ username, submissions: result.rows, count: result.rowCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});
