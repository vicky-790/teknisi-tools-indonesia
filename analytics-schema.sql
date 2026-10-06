-- Optional reference only. V1.7 auto-creates this schema on first API request.
CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  day_jakarta TEXT NOT NULL,
  event_type TEXT NOT NULL,
  path TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  session_id TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_analytics_day ON analytics_events(day_jakarta);
CREATE INDEX IF NOT EXISTS idx_analytics_type_day ON analytics_events(event_type, day_jakarta);
CREATE INDEX IF NOT EXISTS idx_analytics_path_type ON analytics_events(path, event_type);
