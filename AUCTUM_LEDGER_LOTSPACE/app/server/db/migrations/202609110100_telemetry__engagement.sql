-- up
-- TimescaleDB engagement telemetry (brief §4). The hypertable conversion is
-- guarded so this migration no-ops cleanly on plain PostgreSQL.

CREATE SCHEMA IF NOT EXISTS telemetry;

CREATE TABLE IF NOT EXISTS telemetry.engagement_events (
  time TIMESTAMPTZ NOT NULL,
  event_id UUID DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  source TEXT,
  campaign_id UUID,
  session_id UUID,
  value NUMERIC,
  dimensions JSONB NOT NULL DEFAULT '{}',
  ingest_idem_key TEXT
);

CREATE INDEX IF NOT EXISTS idx_engagement_events_account_time
  ON telemetry.engagement_events(account_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_engagement_events_type_time
  ON telemetry.engagement_events(event_type, time DESC);

-- Guarded hypertable creation: requires the TimescaleDB extension. On plain
-- postgres the missing function raises and we deliberately swallow it.
DO $$
BEGIN
  PERFORM create_hypertable('telemetry.engagement_events', 'time',
    chunk_time_interval => INTERVAL '7 days',
    if_not_exists => TRUE);
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- down
DROP TABLE IF EXISTS telemetry.engagement_events;
