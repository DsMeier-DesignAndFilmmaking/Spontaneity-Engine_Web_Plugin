CREATE TABLE IF NOT EXISTS user_preferences (
  user_id VARCHAR PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_spontaneity ON user_preferences ((data->>'spontaneity'));
