import express from "express";
import { usersRouter } from "./routes/users";
import { submissionsRouter } from "./routes/submissions";
import { ratingsRouter } from "./routes/ratings";

export function createApp(): express.Application {
  const app = express();

  app.use(express.json());

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // API routes
  app.use("/api/v1/users", usersRouter);
  app.use("/api/v1/submissions", submissionsRouter);
  app.use("/api/v1/ratings", ratingsRouter);

  // 404 fallback
  app.use((_req, res) => {
    res.status(404).json({ error: "Route not found" });
  });

  return app;
}
