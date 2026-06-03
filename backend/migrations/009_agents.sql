BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_type') THEN
    CREATE TYPE agent_type AS ENUM ('research', 'shopping', 'travel', 'custom');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_status') THEN
    CREATE TYPE agent_status AS ENUM ('planned', 'queued', 'working', 'paused', 'completed', 'error');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_effort') THEN
    CREATE TYPE agent_effort AS ENUM ('low', 'medium', 'high');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_step_status') THEN
    CREATE TYPE agent_step_status AS ENUM ('pending', 'working', 'completed', 'error');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_message_role') THEN
    CREATE TYPE agent_message_role AS ENUM ('user', 'agent');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type agent_type NOT NULL,
  task TEXT NOT NULL,
  status agent_status NOT NULL DEFAULT 'planned',
  effort agent_effort NOT NULL DEFAULT 'medium',
  progress INTEGER NOT NULL DEFAULT 0,
  color TEXT NOT NULL,
  current_action TEXT,
  results TEXT,
  error_message TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  queued_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT agents_task_non_empty CHECK (length(trim(task)) > 0),
  CONSTRAINT agents_name_non_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT agents_progress_range CHECK (progress >= 0 AND progress <= 100)
);

CREATE TABLE IF NOT EXISTS agent_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  description TEXT NOT NULL,
  status agent_step_status NOT NULL DEFAULT 'pending',
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT agent_steps_description_non_empty CHECK (length(trim(description)) > 0),
  CONSTRAINT agent_steps_agent_position_unique UNIQUE (agent_id, position)
);

CREATE TABLE IF NOT EXISTS agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role agent_message_role NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT agent_messages_content_non_empty CHECK (length(trim(content)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_agents_user_status ON agents(user_id, status);
CREATE INDEX IF NOT EXISTS idx_agents_queue ON agents(status, queued_at, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_steps_agent_position ON agent_steps(agent_id, position);
CREATE INDEX IF NOT EXISTS idx_agent_messages_agent_created ON agent_messages(agent_id, created_at);

DROP TRIGGER IF EXISTS trg_agents_set_updated_at ON agents;
CREATE TRIGGER trg_agents_set_updated_at
BEFORE UPDATE ON agents
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_agent_steps_set_updated_at ON agent_steps;
CREATE TRIGGER trg_agent_steps_set_updated_at
BEFORE UPDATE ON agent_steps
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

COMMIT;
