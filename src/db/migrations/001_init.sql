-- Migration: 001_init
-- Idempotent (uses IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS tracked_users (
  id         SERIAL PRIMARY KEY,
  username   TEXT UNIQUE NOT NULL,
  added_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS submissions (
  id                SERIAL PRIMARY KEY,
  username          TEXT NOT NULL,
  lc_submission_id  TEXT NOT NULL UNIQUE,
  problem_title     TEXT NOT NULL,
  problem_slug      TEXT NOT NULL,
  problem_url       TEXT GENERATED ALWAYS AS (
                      'https://leetcode.com/problems/' || problem_slug || '/'
                    ) STORED,
  solved_at         TIMESTAMPTZ NOT NULL,
  detected_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submissions_username ON submissions (username);
CREATE INDEX IF NOT EXISTS idx_submissions_solved_at ON submissions (solved_at DESC);

CREATE TABLE IF NOT EXISTS rating_snapshots (
  id                 SERIAL PRIMARY KEY,
  username           TEXT NOT NULL,
  rating             NUMERIC,
  global_ranking     INT,
  contests_attended  INT,
  top_percentage     NUMERIC,
  snapshotted_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rating_snapshots_username ON rating_snapshots (username);
