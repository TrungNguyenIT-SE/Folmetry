CREATE TABLE IF NOT EXISTS folmetry_ai_conversation (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('auto', 'folmetry', 'general', 'web')),
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS folmetry_ai_conversation_owner_updated_idx
  ON folmetry_ai_conversation(owner_id, updated_at DESC, id);

CREATE TABLE IF NOT EXISTS folmetry_ai_message (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES folmetry_ai_conversation(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  provider TEXT CHECK (provider IS NULL OR provider IN ('groq', 'cloudflare', 'google')),
  model TEXT,
  citations JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS folmetry_ai_message_conversation_created_idx
  ON folmetry_ai_message(owner_id, conversation_id, created_at ASC, id ASC);
CREATE INDEX IF NOT EXISTS folmetry_ai_message_owner_role_created_idx
  ON folmetry_ai_message(owner_id, role, created_at DESC);

DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'folmetry_ai_message_provider_check'
      AND pg_get_constraintdef(oid) NOT LIKE '%cloudflare%'
  ) THEN
    ALTER TABLE folmetry_ai_message DROP CONSTRAINT folmetry_ai_message_provider_check;
    ALTER TABLE folmetry_ai_message
      ADD CONSTRAINT folmetry_ai_message_provider_check
      CHECK (provider IS NULL OR provider IN ('groq', 'cloudflare', 'google'));
  END IF;
END
$migration$;
