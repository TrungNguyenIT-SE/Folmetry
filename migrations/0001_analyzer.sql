CREATE TABLE IF NOT EXISTS folmetry_analyzer_account (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook')),
  label TEXT NOT NULL,
  username TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS folmetry_analyzer_account_owner_created_idx
  ON folmetry_analyzer_account(owner_id, created_at, id);

CREATE TABLE IF NOT EXISTS folmetry_analyzer_snapshot (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES folmetry_analyzer_account(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook')),
  snapshot_at BIGINT NOT NULL,
  imported_at BIGINT NOT NULL,
  source_file_name TEXT,
  source_file_size BIGINT,
  fingerprint CHAR(64) NOT NULL,
  parser_version TEXT NOT NULL,
  friends JSONB NOT NULL DEFAULT '[]'::jsonb,
  followers JSONB NOT NULL,
  following JSONB NOT NULL,
  warnings JSONB NOT NULL,
  follower_count INTEGER NOT NULL,
  following_count INTEGER NOT NULL,
  friend_count INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT folmetry_analyzer_snapshot_owner_time_unique
    UNIQUE(owner_id, account_id, snapshot_at),
  CONSTRAINT folmetry_analyzer_snapshot_owner_fingerprint_unique
    UNIQUE(owner_id, account_id, fingerprint)
);

CREATE INDEX IF NOT EXISTS folmetry_analyzer_snapshot_owner_account_time_idx
  ON folmetry_analyzer_snapshot(owner_id, account_id, snapshot_at DESC);

ALTER TABLE folmetry_analyzer_snapshot
  ADD COLUMN IF NOT EXISTS friends JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE folmetry_analyzer_snapshot
  ADD COLUMN IF NOT EXISTS friend_count INTEGER NOT NULL DEFAULT 0;
