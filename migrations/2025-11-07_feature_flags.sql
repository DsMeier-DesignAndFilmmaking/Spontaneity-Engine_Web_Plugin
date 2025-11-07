CREATE TABLE IF NOT EXISTS feature_flags (
  key VARCHAR PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  payload JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS telemetry_events (
  id TEXT,
  name TEXT,
  user_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags (enabled);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_name ON telemetry_events (name);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_user ON telemetry_events (user_id);

CREATE TABLE IF NOT EXISTS consent_log (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  field VARCHAR NOT NULL,
  old_value JSONB,
  new_value JSONB,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings_export_queue (
  id UUID PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'queued',
  artifact JSONB,
  download_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS settings_deletion_queue (
  id UUID PRIMARY KEY,
  user_id VARCHAR NOT NULL UNIQUE,
  status VARCHAR NOT NULL DEFAULT 'queued',
  scheduled_for TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settings_export_user ON settings_export_queue (user_id);
CREATE INDEX IF NOT EXISTS idx_settings_deletion_user ON settings_deletion_queue (user_id);
