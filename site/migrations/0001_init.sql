-- One row per app launch.
-- No IP, no user agent, no hardware details: a random device id, the UTC date,
-- and whatever coarse geo Cloudflare derived from the request.
CREATE TABLE IF NOT EXISTS launches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL,
  date TEXT NOT NULL,
  country TEXT,
  region TEXT,
  city TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_launches_date ON launches (date);
CREATE INDEX IF NOT EXISTS idx_launches_device ON launches (device_id);
CREATE INDEX IF NOT EXISTS idx_launches_city ON launches (city);
