BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname TEXT;

WITH base AS (
  SELECT
    id,
    lower(regexp_replace(split_part(email, '@', 1), '[^a-zA-Z0-9_]+', '_', 'g')) AS raw_nickname
  FROM users
  WHERE nickname IS NULL OR length(trim(nickname)) = 0
),
normalized AS (
  SELECT
    id,
    CASE
      WHEN length(trim(raw_nickname, '_')) >= 3 THEN trim(raw_nickname, '_')
      ELSE 'user'
    END AS nickname_base
  FROM base
),
ranked AS (
  SELECT
    id,
    nickname_base,
    row_number() OVER (PARTITION BY nickname_base ORDER BY id) AS rn
  FROM normalized
)
UPDATE users u
SET nickname = CASE
  WHEN r.rn = 1 THEN r.nickname_base
  ELSE r.nickname_base || '_' || r.rn::text
END
FROM ranked r
WHERE u.id = r.id;

ALTER TABLE users ALTER COLUMN nickname SET NOT NULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_nickname_non_empty'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_nickname_non_empty CHECK (length(trim(nickname)) >= 3);
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_nickname_unique ON users (lower(nickname));
CREATE INDEX IF NOT EXISTS idx_users_search_name ON users (lower(name));

CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_low_id UUID GENERATED ALWAYS AS (LEAST(requester_id, addressee_id)) STORED,
  user_high_id UUID GENERATED ALWAYS AS (GREATEST(requester_id, addressee_id)) STORED,
  status TEXT NOT NULL DEFAULT 'pending',
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT friendships_distinct_users CHECK (requester_id <> addressee_id),
  CONSTRAINT friendships_status_check CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  CONSTRAINT friendships_pair_unique UNIQUE (user_low_id, user_high_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

DROP TRIGGER IF EXISTS trg_friendships_set_updated_at ON friendships;
CREATE TRIGGER trg_friendships_set_updated_at
BEFORE UPDATE ON friendships
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS friend_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  friendship_id UUID NOT NULL REFERENCES friendships(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  can_view_calendar BOOLEAN NOT NULL DEFAULT TRUE,
  can_request_calendar_events BOOLEAN NOT NULL DEFAULT TRUE,
  can_create_calendar_events_direct BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT friend_permissions_distinct_users CHECK (owner_user_id <> friend_user_id),
  CONSTRAINT friend_permissions_owner_unique UNIQUE (friendship_id, owner_user_id)
);

CREATE INDEX IF NOT EXISTS idx_friend_permissions_owner_friend
  ON friend_permissions(owner_user_id, friend_user_id);

DROP TRIGGER IF EXISTS trg_friend_permissions_set_updated_at ON friend_permissions;
CREATE TRIGGER trg_friend_permissions_set_updated_at
BEFORE UPDATE ON friend_permissions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  related_entity_type TEXT,
  related_entity_id UUID,
  read_at TIMESTAMPTZ,
  actioned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT app_notifications_status_check CHECK (status IN ('pending', 'read', 'actioned', 'dismissed'))
);

CREATE INDEX IF NOT EXISTS idx_app_notifications_user_created
  ON app_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_notifications_kind_status
  ON app_notifications(kind, status);

DROP TRIGGER IF EXISTS trg_app_notifications_set_updated_at ON app_notifications;
CREATE TRIGGER trg_app_notifications_set_updated_at
BEFORE UPDATE ON app_notifications
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS note_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT note_collaborators_role_check CHECK (role IN ('owner', 'editor', 'viewer')),
  CONSTRAINT note_collaborators_note_user_unique UNIQUE (note_id, user_id)
);

INSERT INTO note_collaborators (note_id, user_id, role, accepted_at)
SELECT id, user_id, 'owner', NOW()
FROM notes
ON CONFLICT (note_id, user_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_note_collaborators_user
  ON note_collaborators(user_id, accepted_at);
CREATE INDEX IF NOT EXISTS idx_note_collaborators_note
  ON note_collaborators(note_id);

DROP TRIGGER IF EXISTS trg_note_collaborators_set_updated_at ON note_collaborators;
CREATE TRIGGER trg_note_collaborators_set_updated_at
BEFORE UPDATE ON note_collaborators
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS source_request_id UUID REFERENCES app_notifications(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON calendar_events(created_by_user_id);

COMMIT;
