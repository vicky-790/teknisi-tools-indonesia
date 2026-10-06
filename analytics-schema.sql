-- Optional reference only. V1.7.2 auto-creates and auto-migrates this schema.
CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  day_jakarta TEXT NOT NULL,
  event_type TEXT NOT NULL,
  path TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  session_id TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '', region TEXT NOT NULL DEFAULT '', city TEXT NOT NULL DEFAULT '',
  continent TEXT NOT NULL DEFAULT '', cf_timezone TEXT NOT NULL DEFAULT '', device_type TEXT NOT NULL DEFAULT '',
  browser TEXT NOT NULL DEFAULT '', os TEXT NOT NULL DEFAULT '', referrer_host TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '', medium TEXT NOT NULL DEFAULT '', landing_path TEXT NOT NULL DEFAULT '',
  approx_lat REAL, approx_lon REAL,
  gps_lat REAL, gps_lon REAL, gps_accuracy REAL, gps_permission TEXT NOT NULL DEFAULT ''
);
