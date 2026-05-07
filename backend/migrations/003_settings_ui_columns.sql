BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS theme_mode TEXT NOT NULL DEFAULT 'light',
  ADD COLUMN IF NOT EXISTS assistant_voice TEXT NOT NULL DEFAULT 'feminine';

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_theme_mode_check;
ALTER TABLE users ADD CONSTRAINT users_theme_mode_check
  CHECK (theme_mode IN ('light', 'dark'));

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_assistant_voice_check;
ALTER TABLE users ADD CONSTRAINT users_assistant_voice_check
  CHECK (assistant_voice IN ('feminine', 'masculine', 'neutral'));

COMMIT;
