import type { UserPreferences } from "@/types/settings";
import {
  validatePartialPreferences,
  validateUserPreferences,
} from "./validation/settings-schema";
import {
  getQueryExecutor,
  setQueryExecutorForTests as setDbExecutorForTests,
  type QueryExecutor,
} from "./db";
import { logPreferenceChange } from "./telemetry";
import { randomUUID } from "crypto";

let auditTableInitialized = false;
let exportQueueInitialized = false;
let deletionQueueInitialized = false;
let consentLogInitialized = false;

const CONSENT_AUDIT_FIELDS: Array<keyof UserPreferences> = [
  "locationSharing",
  "whoCanInvite",
  "profileVisibility",
  "analyticsOptIn",
  "showReasoning",
  "autoJoin",
];

const ALL_PREF_KEYS: Array<keyof UserPreferences> = [
  "userId",
  "displayName",
  "photoUrl",
  "interests",
  "spontaneity",
  "matchStrictness",
  "autoJoin",
  "locationSharing",
  "radiusKm",
  "transportPreference",
  "defaultNavProvider",
  "offlineMaps",
  "whoCanInvite",
  "profileVisibility",
  "safetyMode",
  "accessibilityNeeds",
  "budget",
  "timeAvailability",
  "aiPersona",
  "showReasoning",
  "analyticsOptIn",
  "dndSchedule",
  "updatedAt",
];

function preparePayload(payload: UserPreferences): UserPreferences {
  const timestamp = new Date().toISOString();
  const withTimestamp = {
    ...payload,
    updatedAt: payload.updatedAt ?? timestamp,
  } satisfies UserPreferences;
  const validated = validateUserPreferences(withTimestamp);
  return {
    ...validated,
    updatedAt: timestamp,
  };
}

async function ensureAuditTable(executor: QueryExecutor) {
  if (auditTableInitialized) return;
  await executor.query(
    `CREATE TABLE IF NOT EXISTS settings_audit (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        changes JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`
  );
  auditTableInitialized = true;
}

async function ensureConsentLog(executor: QueryExecutor) {
  if (consentLogInitialized) return;
  await executor.query(
    `CREATE TABLE IF NOT EXISTS consent_log (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        field VARCHAR NOT NULL,
        old_value JSONB,
        new_value JSONB,
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`
  );
  consentLogInitialized = true;
}

async function ensureExportQueue(executor: QueryExecutor) {
  if (exportQueueInitialized) return;
  await executor.query(
    `CREATE TABLE IF NOT EXISTS settings_export_queue (
        id UUID PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        status VARCHAR NOT NULL DEFAULT 'queued',
        artifact JSONB,
        download_token TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      )`
  );
  exportQueueInitialized = true;
}

async function ensureDeletionQueue(executor: QueryExecutor) {
  if (deletionQueueInitialized) return;
  await executor.query(
    `CREATE TABLE IF NOT EXISTS settings_deletion_queue (
        id UUID PRIMARY KEY,
        user_id VARCHAR NOT NULL UNIQUE,
        status VARCHAR NOT NULL DEFAULT 'queued',
        scheduled_for TIMESTAMPTZ,
        processed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`
  );
  deletionQueueInitialized = true;
}

function toRecord(value: UserPreferences | null): Record<string, unknown> | undefined {
  return value ? (value as unknown as Record<string, unknown>) : undefined;
}

function diffPreferences(before: UserPreferences | null, after: UserPreferences) {
  const beforeRecord = toRecord(before) ?? {};
  const afterRecord = toRecord(after) ?? {};
  return ALL_PREF_KEYS.reduce<Array<{ field: string; before: unknown; after: unknown }>>((acc, key) => {
    const field = key as string;
    const previous = beforeRecord[field];
    const next = afterRecord[field];
    if (previous !== next) {
      acc.push({ field, before: previous ?? null, after: next ?? null });
    }
    return acc;
  }, []);
}

export async function getSettings(userId: string): Promise<UserPreferences | null> {
  const executor = getQueryExecutor();
  const result = await executor.query(
    "SELECT data FROM user_preferences WHERE user_id = $1",
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0] as { data: unknown };
  return validateUserPreferences(row.data);
}

export async function saveSettings(
  userId: string,
  data: UserPreferences,
  options: { previous?: UserPreferences | null } = {}
): Promise<UserPreferences> {
  const executor = getQueryExecutor();
  const previous =
    options.previous === undefined ? await getSettings(userId) : options.previous;
  const payload = preparePayload({ ...data, userId });

  const query = `
    INSERT INTO user_preferences (user_id, data, updated_at)
    VALUES ($1, $2::jsonb, $3::timestamptz)
    ON CONFLICT (user_id)
    DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
    RETURNING data;
  `;

  const now = payload.updatedAt;
  const result = await executor.query(query, [userId, JSON.stringify(payload), now]);

  const row = result.rows[0] as { data: unknown };
  const updated = validateUserPreferences(row.data);
  await recordPreferenceChanges(userId, previous, updated);
  return updated;
}

export async function patchSettings(
  userId: string,
  partialData: Partial<UserPreferences>
): Promise<UserPreferences> {
  const executor = getQueryExecutor();
  const current = await getSettings(userId);

  if (!current) {
    throw new Error(`Cannot patch settings for user ${userId}: no existing preferences found.`);
  }

  const partial = validatePartialPreferences(partialData);
  const merged = validateUserPreferences({
    ...current,
    ...partial,
    userId,
    updatedAt: new Date().toISOString(),
  });

  const query = `
    UPDATE user_preferences
    SET data = $2::jsonb, updated_at = $3::timestamptz
    WHERE user_id = $1
    RETURNING data;
  `;

  const result = await executor.query(query, [userId, JSON.stringify(merged), merged.updatedAt]);

  const row = result.rows[0] as { data: unknown };
  const updated = validateUserPreferences(row.data);
  await recordPreferenceChanges(userId, current, updated);
  return updated;
}

export function setQueryExecutorForTests(executor: QueryExecutor | null) {
  setDbExecutorForTests(executor);
  if (!executor) {
    auditTableInitialized = false;
    exportQueueInitialized = false;
    deletionQueueInitialized = false;
    consentLogInitialized = false;
  }
}

export async function logConsentChanges(
  userId: string,
  before: UserPreferences | null,
  after: UserPreferences
): Promise<void> {
  const beforeRecord = toRecord(before);
  const afterRecord = toRecord(after) ?? {};
  const changes = CONSENT_AUDIT_FIELDS.reduce<Array<{ field: string; before: unknown; after: unknown }>>(
    (acc, field) => {
      const key = field as string;
      const previous = beforeRecord ? beforeRecord[key] : undefined;
      const next = afterRecord[key];
      if (previous !== next) {
        acc.push({ field, before: previous ?? null, after: next ?? null });
      }
      return acc;
    },
    []
  );

  if (changes.length === 0) {
    return;
  }

  const executor = getQueryExecutor();
  await ensureAuditTable(executor);
  await ensureConsentLog(executor);
  await executor.query(
    `INSERT INTO settings_audit (user_id, changes) VALUES ($1, $2::jsonb)`,
    [userId, JSON.stringify(changes)]
  );
  for (const change of changes) {
    await executor.query(
      `INSERT INTO consent_log (user_id, field, old_value, new_value) VALUES ($1, $2, $3::jsonb, $4::jsonb)`,
      [userId, change.field, JSON.stringify(change.before), JSON.stringify(change.after)]
    );
  }
}

async function recordPreferenceChanges(
  userId: string,
  before: UserPreferences | null,
  after: UserPreferences
) {
  const diffs = diffPreferences(before, after);
  await Promise.all(
    diffs.map((change) =>
      logPreferenceChange({
        userId,
        field: change.field,
        previous: change.before,
        next: change.after,
      })
    )
  );
  await logConsentChanges(userId, before, after);
}

export async function enqueueSettingsExport(userId: string, jobId: string): Promise<void> {
  const executor = getQueryExecutor();
  await ensureExportQueue(executor);
  await executor.query(
    `INSERT INTO settings_export_queue (id, user_id) VALUES ($1, $2)
     ON CONFLICT (id) DO NOTHING`,
    [jobId, userId]
  );
}

export async function enqueueSettingsDeletion(userId: string, jobId: string): Promise<void> {
  const executor = getQueryExecutor();
  await ensureDeletionQueue(executor);
  await executor.query(
    `INSERT INTO settings_deletion_queue (id, user_id) VALUES ($1, $2)
     ON CONFLICT (id) DO NOTHING`,
    [jobId, userId]
  );
}

export async function createSettingsExport(userId: string, artifact: Record<string, unknown>) {
  const executor = getQueryExecutor();
  await ensureExportQueue(executor);
  const id = randomUUID();
  const downloadToken = randomUUID();
  await executor.query(
    `INSERT INTO settings_export_queue (id, user_id, status, artifact, download_token, completed_at)
     VALUES ($1, $2, 'completed', $3::jsonb, $4, NOW())`,
    [id, userId, JSON.stringify(artifact), downloadToken]
  );
  return { id, downloadToken };
}

export async function getSettingsExportByToken(token: string) {
  const executor = getQueryExecutor();
  await ensureExportQueue(executor);
  const result = await executor.query(
    `SELECT id, user_id, status, artifact FROM settings_export_queue WHERE download_token = $1`,
    [token]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0] as { id: string; user_id: string; status: string; artifact: unknown };
  return row;
}

export async function scheduleSettingsDeletion(userId: string, scheduledFor: Date) {
  const executor = getQueryExecutor();
  await ensureDeletionQueue(executor);
  const id = randomUUID();
  await executor.query(
    `INSERT INTO settings_deletion_queue (id, user_id, status, scheduled_for)
     VALUES ($1, $2, 'scheduled', $3)
     ON CONFLICT (user_id) DO UPDATE SET status = 'scheduled', scheduled_for = EXCLUDED.scheduled_for, processed_at = NULL`,
    [id, userId, scheduledFor.toISOString()]
  );
  return { id, scheduledFor };
}
