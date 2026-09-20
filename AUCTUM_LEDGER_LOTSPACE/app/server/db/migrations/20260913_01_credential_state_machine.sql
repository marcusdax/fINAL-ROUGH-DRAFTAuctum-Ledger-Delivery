-- up
CREATE TABLE IF NOT EXISTS credential_states (
  id SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert initial state rows
INSERT INTO credential_states (name, description) VALUES
  ('active', 'valid, not expiring'),
  ('expiring', 'within renewal window'),
  ('stale', 'earned against superseded SOP'),
  ('lapsed', 'expired or drift-suspended')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS credential (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  credential_type TEXT NOT NULL,
  state_id SMALLINT NOT NULL DEFAULT 1 REFERENCES credential_states(id) ON DELETE RESTRICT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  issued_by_user_id UUID,
  content_version_set_json JSONB,
  external_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credential_state_id ON credential(state_id);
CREATE INDEX IF NOT EXISTS idx_credential_user_id ON credential(user_id);
CREATE INDEX IF NOT EXISTS idx_credential_type ON credential(credential_type);

CREATE TABLE IF NOT EXISTS credential_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id UUID NOT NULL REFERENCES credential(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_user_id UUID,
  reason TEXT,
  evidence_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credential_events_credential_id ON credential_events(credential_id);
CREATE INDEX IF NOT EXISTS idx_credential_events_type ON credential_events(event_type);
CREATE INDEX IF NOT EXISTS idx_credential_events_occurred_at ON credential_events(occurred_at);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS credential_states_updated_at ON credential_states;
DROP TRIGGER IF EXISTS credential_updated_at ON credential;
CREATE TRIGGER credential_states_updated_at BEFORE UPDATE ON credential_states FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER credential_updated_at BEFORE UPDATE ON credential FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- down
DROP TRIGGER IF EXISTS credential_updated_at ON credential;
DROP TRIGGER IF EXISTS credential_states_updated_at ON credential_states;
DROP TABLE IF EXISTS credential_events;
DROP TABLE IF EXISTS credential;
DROP TABLE IF EXISTS credential_states;
