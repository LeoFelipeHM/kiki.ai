BEGIN;

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT contacts_user_email_unique UNIQUE (user_id, email),
  CONSTRAINT contacts_name_non_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT contacts_email_non_empty CHECK (length(trim(email)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user_name ON contacts(user_id, name);

DROP TRIGGER IF EXISTS trg_contacts_set_updated_at ON contacts;
CREATE TRIGGER trg_contacts_set_updated_at
BEFORE UPDATE ON contacts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

COMMIT;
