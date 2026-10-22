-- One row per app launch.
--
-- 2026-10-22: this site's D1 database is now the shared `common` database (the free plan
-- allows 10 databases and both miaomiao sites only keep a few dozen rows), so the table
-- and its indexes carry the `bar_` prefix. The prefix belongs to the bootstrap rather
-- than a later rename because `common` already holds sendtk_* / codetk_* tables and
-- miaomiao-notes' notes_*: a bare `launches` table would be identical to that site's
-- schema, and `CREATE TABLE IF NOT EXISTS` would silently keep writing into it.
--
-- `d1_migrations` is shared by every project that points at `common`, and it records
-- migrations **by file name**. That is why this file is `0001_bar_init.sql` and not
-- `0001_init.sql`: sendtk already recorded a `0001_init.sql` in `common`, and a name
-- collision would make wrangler treat this migration as already applied and skip it.
-- Keep the `NNNN_bar_` prefix on every file added to this folder.
--
-- What is stored: no IP, no user agent, no hardware details — a random device id, the
-- UTC date, and whatever coarse geo Cloudflare derived from the request.
CREATE TABLE IF NOT EXISTS bar_launches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL,
  date TEXT NOT NULL,
  country TEXT,
  region TEXT,
  city TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bar_launches_date ON bar_launches (date);
CREATE INDEX IF NOT EXISTS idx_bar_launches_device ON bar_launches (device_id);
CREATE INDEX IF NOT EXISTS idx_bar_launches_city ON bar_launches (city);
