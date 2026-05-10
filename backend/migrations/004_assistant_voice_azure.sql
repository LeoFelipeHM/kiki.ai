BEGIN;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_assistant_voice_check;

UPDATE users SET assistant_voice = 'pt-BR-FranciscaNeural' WHERE assistant_voice = 'feminine';
UPDATE users SET assistant_voice = 'pt-BR-AntonioNeural' WHERE assistant_voice = 'masculine';
UPDATE users SET assistant_voice = 'pt-BR-ThalitaNeural' WHERE assistant_voice = 'neutral';

ALTER TABLE users ALTER COLUMN assistant_voice SET DEFAULT 'pt-BR-FranciscaNeural';

COMMIT;
