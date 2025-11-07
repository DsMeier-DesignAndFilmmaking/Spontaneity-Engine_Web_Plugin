import { randomUUID } from "crypto";
import { getQueryExecutor, type QueryExecutor } from "./db";

let telemetryTableInitialized = false;

async function ensureTelemetryTable(executor: QueryExecutor) {
  if (telemetryTableInitialized) return;
  await executor.query(`
    CREATE TABLE IF NOT EXISTS telemetry_events (
      id TEXT,
      name TEXT,
      user_id TEXT,
      metadata JSONB,
      created_at TIMESTAMPTZ
    )
  `);
  await executor.query(`CREATE INDEX IF NOT EXISTS idx_telemetry_events_name ON telemetry_events (name)`);
  await executor.query(`CREATE INDEX IF NOT EXISTS idx_telemetry_events_user ON telemetry_events (user_id)`);
  telemetryTableInitialized = true;
}

async function insertEvent(
  name: string,
  userId: string | null,
  metadata: Record<string, unknown>
): Promise<void> {
  const executor = getQueryExecutor();
  await ensureTelemetryTable(executor);
  await executor.query(
    `INSERT INTO telemetry_events (id, name, user_id, metadata, created_at) VALUES ($1, $2, $3, $4::jsonb, NOW())`,
    [randomUUID(), name, userId, JSON.stringify(metadata)]
  );
}

export async function logPreferenceChange({
  userId,
  field,
  previous,
  next,
}: {
  userId: string;
  field: string;
  previous: unknown;
  next: unknown;
}): Promise<void> {
  const metadata = {
    field,
    old: previous ?? null,
    new: next ?? null,
    timestamp: new Date().toISOString(),
  };
  await insertEvent("pref_changed", userId, metadata);
}

export async function logAutoJoinTriggered({
  userId,
  eventId,
  outcome,
}: {
  userId: string;
  eventId: string;
  outcome: "joined" | "skipped" | "failed";
}): Promise<void> {
  const metadata = {
    event_id: eventId,
    outcome,
    timestamp: new Date().toISOString(),
  };
  await insertEvent("auto_join_triggered", userId, metadata);
}

export function resetTelemetryForTests() {
  telemetryTableInitialized = false;
}
