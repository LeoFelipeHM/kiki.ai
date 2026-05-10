BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS theme_mode TEXT NOT NULL DEFAULT 'light',
  ADD COLUMN IF NOT EXISTS assistant_voice TEXT NOT NULL DEFAULT 'feminine';

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_theme_mode_check;
ALTER TABLE users ADD CONSTRAINT users_theme_mode_check
  CHECK (theme_mode IN ('light', 'dark'));

-- Não recriar CHECK em assistant_voice aqui: a 004 migra para IDs Azure e remove o CHECK.
-- Recriar feminine|masculine|neutral quebra re-execução quando os dados já são pt-BR-*.

COMMIT;
