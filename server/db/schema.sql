CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS demo_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  email TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK (length(trim(email)) > 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS files (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_name TEXT NOT NULL CHECK (length(trim(original_name)) > 0),
  storage_path TEXT NOT NULL UNIQUE CHECK (length(trim(storage_path)) > 0),
  mime_type TEXT NOT NULL CHECK (length(trim(mime_type)) > 0),
  size_bytes INTEGER NOT NULL CHECK (typeof(size_bytes) = 'integer' AND size_bytes >= 0),
  source_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  file_id INTEGER REFERENCES files(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (length(trim(action)) > 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS files_user_idx ON files(user_id);
CREATE INDEX IF NOT EXISTS activity_user_idx ON activity(user_id);
CREATE INDEX IF NOT EXISTS activity_file_idx ON activity(file_id);

INSERT INTO app_meta(key, value) VALUES ('schema_version', '2')
ON CONFLICT(key) DO UPDATE SET value = excluded.value;
