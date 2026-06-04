BEGIN;

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'Nova conversa',
  ADD COLUMN IF NOT EXISTS summary TEXT;

CREATE INDEX IF NOT EXISTS idx_conversations_user_updated
  ON conversations(user_id, updated_at DESC);

COMMIT;
