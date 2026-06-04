BEGIN;

DO $$
BEGIN
  -- Usuário seed: leo / leo@gmail.com / senha 123 / admin
  -- Hash gerado com passlib CryptContext(schemes=["pbkdf2_sha256"]) igual a PasswordHasher.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'nickname'
  ) THEN
    INSERT INTO users (name, email, nickname, role, password_hash, password_updated_at)
    VALUES (
      'leo',
      'leo@gmail.com',
      'leo',
      'admin'::user_role,
      '$pbkdf2-sha256$29000$53wvJSTkXCuFUAoBYExpbQ$1jZOWVYrMoJtc2MprzuqrEYNfWtU/ZmNjP167swekzI',
      NOW()
    )
    ON CONFLICT (email) DO UPDATE SET
      name = EXCLUDED.name,
      nickname = COALESCE(users.nickname, EXCLUDED.nickname),
      role = EXCLUDED.role,
      password_hash = EXCLUDED.password_hash,
      password_updated_at = EXCLUDED.password_updated_at,
      updated_at = NOW();
  ELSE
    INSERT INTO users (name, email, role, password_hash, password_updated_at)
    VALUES (
      'leo',
      'leo@gmail.com',
      'admin'::user_role,
      '$pbkdf2-sha256$29000$53wvJSTkXCuFUAoBYExpbQ$1jZOWVYrMoJtc2MprzuqrEYNfWtU/ZmNjP167swekzI',
      NOW()
    )
    ON CONFLICT (email) DO UPDATE SET
      name = EXCLUDED.name,
      role = EXCLUDED.role,
      password_hash = EXCLUDED.password_hash,
      password_updated_at = EXCLUDED.password_updated_at,
      updated_at = NOW();
  END IF;
END$$;

COMMIT;
