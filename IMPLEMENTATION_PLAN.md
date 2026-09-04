# LeetCode Friends Activity Tracker

A background service that watches your followed LeetCode users, detects when they solve problems, persists the data to PostgreSQL, and serves it via a REST API.

---

## Overview

The system has three main responsibilities:
1. **Poller** — Runs every 5 minutes, calls LeetCode's (unofficial) GraphQL API for each tracked user and stores new accepted submissions + current contest rating.
2. **Database** — PostgreSQL stores tracked users, their submissions, and rating snapshots.
3. **REST API** — Express + TypeScript serves endpoints to query this data.

LeetCode data will be fetched using the `leetcode-query` npm package, which wraps LeetCode's public GraphQL endpoint (`https://leetcode.com/graphql`). Public profile data (recent accepted submissions + contest rating) is accessible without authentication.

---

## Proposed Changes

### Project Root

#### [NEW] `package.json`
- Dependencies: `express`, `leetcode-query`, `pg` (node-postgres), `node-cron`, `dotenv`, `zod`
- Dev dependencies: `typescript`, `ts-node`, `@types/*`, `tsx`

#### [NEW] `.env.example`
- `DATABASE_URL`, `PORT`, `POLL_INTERVAL_CRON`

#### [NEW] `tsconfig.json`

#### [NEW] `docker-compose.yml`
- Spins up a local PostgreSQL container for development

---

### Database Layer — `src/db/`

#### [NEW] `src/db/client.ts`
- Creates and exports a `pg.Pool` instance using `DATABASE_URL`

#### [NEW] `src/db/migrations/001_init.sql`
Schema with three tables:

```sql
-- Users you want to track
CREATE TABLE tracked_users (
  id         SERIAL PRIMARY KEY,
  username   TEXT UNIQUE NOT NULL,
  added_at   TIMESTAMPTZ DEFAULT NOW()
);

-- One row per accepted submission detected
CREATE TABLE submissions (
  id              SERIAL PRIMARY KEY,
  username        TEXT NOT NULL,
  lc_submission_id TEXT NOT NULL UNIQUE,
  problem_title   TEXT NOT NULL,
  problem_slug    TEXT NOT NULL,
  problem_url     TEXT GENERATED ALWAYS AS ('https://leetcode.com/problems/' || problem_slug || '/') STORED,
  solved_at       TIMESTAMPTZ NOT NULL,
  detected_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Snapshot of contest rating each time we poll
CREATE TABLE rating_snapshots (
  id               SERIAL PRIMARY KEY,
  username         TEXT NOT NULL,
  rating           NUMERIC,
  global_ranking   INT,
  contests_attended INT,
  top_percentage   NUMERIC,
  snapshotted_at   TIMESTAMPTZ DEFAULT NOW()
);
```

#### [NEW] `src/db/migrate.ts`
- Runs the SQL migration on startup (idempotent)

---

### LeetCode API Layer — `src/leetcode/`

#### [NEW] `src/leetcode/client.ts`
- Instantiates `leetcode-query`'s `LeetCode` class

#### [NEW] `src/leetcode/queries.ts`
- `getRecentAcSubmissions(username, limit = 20)` — fetches recent accepted submissions
- `getContestRating(username)` — fetches current contest ranking data

---

### Poller — `src/poller/`

#### [NEW] `src/poller/index.ts`
- Uses `node-cron` to schedule a job every 5 minutes (`*/5 * * * *`)
- For each user in `tracked_users`:
  1. Fetches recent AC submissions → inserts any with `lc_submission_id` not already in `submissions` (upsert / ignore duplicate)
  2. Fetches contest rating → inserts a new `rating_snapshots` row (only when rating changes)
- Logs new detections to stdout

---

### REST API — `src/api/`

#### [NEW] `src/api/routes/users.ts`
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/users` | List all tracked users |
| `POST` | `/users` | Add a user to track `{ username }` |
| `DELETE` | `/users/:username` | Stop tracking a user |

#### [NEW] `src/api/routes/submissions.ts`
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/submissions` | All submissions (supports `?username=`, `?limit=`, `?since=`) |
| `GET` | `/submissions/:username` | Submissions for one user |

#### [NEW] `src/api/routes/ratings.ts`
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/ratings/:username` | Latest rating snapshot for a user |
| `GET` | `/ratings/:username/history` | All rating snapshots over time |

#### [NEW] `src/api/index.ts`
- Express app wiring all routes under `/api/v1`

---

### Entry Point

#### [NEW] `src/index.ts`
- Runs migration → starts poller → starts HTTP server

---

## Decisions Made
- Rating snapshots: only stored when rating value actually changes (diff check) to keep table lean
- Poll interval: every 5 minutes (`*/5 * * * *`)
- Max submissions fetched per poll: 20 (LeetCode API limit)
- No auth required: only public profile data is tracked
