import { getQueryExecutor, type QueryExecutor } from "./db";
import type { FeatureFlagKey, FeatureFlagSnapshot } from "./feature-flag-types";
export type { FeatureFlagKey, FeatureFlagSnapshot } from "./feature-flag-types";

const FLAG_KEYS: FeatureFlagKey[] = ["settings_ui_enabled", "auto_join_v1", "live_location"];

const DEFAULT_SNAPSHOT: FeatureFlagSnapshot = {
  settings_ui_enabled: { enabled: true, payload: null },
  auto_join_v1: { enabled: false, payload: null },
  live_location: { enabled: false, payload: null },
};

type FeatureFlagRecord = {
  key: string;
  enabled: boolean;
  payload: unknown;
  updated_at: string;
};

let featureTableInitialized = false;

function parsePayload(raw: unknown): Record<string, unknown> | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object") {
    return raw as Record<string, unknown>;
  }
  return null;
}

function logFeatureFlagError(message: string, error: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[feature-flags] ${message}`, error);
  }
}

async function withExecutor<T>(
  task: (executor: QueryExecutor) => Promise<T>,
  fallback: () => T
): Promise<T> {
  try {
    const executor = getQueryExecutor();
    return await task(executor);
  } catch (error) {
    logFeatureFlagError("Falling back to default snapshot", error);
    return fallback();
  }
}

async function ensureFeatureTable(executor: QueryExecutor) {
  if (featureTableInitialized) return;
  await executor.query(`
    CREATE TABLE IF NOT EXISTS feature_flags (
      key VARCHAR PRIMARY KEY,
      enabled BOOLEAN NOT NULL DEFAULT FALSE,
      payload JSONB,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  featureTableInitialized = true;
}

export async function getFeatureFlag(
  key: FeatureFlagKey,
  defaultValue = false
): Promise<{ enabled: boolean; payload: Record<string, unknown> | null }> {
  return withExecutor(async (executor) => {
    await ensureFeatureTable(executor);

    const result = await executor.query(`SELECT key, enabled, payload FROM feature_flags WHERE key = $1`, [key]);
    if (result.rows.length === 0) {
      return { enabled: defaultValue, payload: null };
    }

    const row = result.rows[0] as FeatureFlagRecord;
    return { enabled: row.enabled, payload: parsePayload(row.payload) };
  }, () => ({ enabled: defaultValue, payload: null }));
}

export async function setFeatureFlag(
  key: FeatureFlagKey,
  enabled: boolean,
  payload: Record<string, unknown> | null = null
): Promise<void> {
  await withExecutor(async (executor) => {
    await ensureFeatureTable(executor);

    await executor.query(
      `INSERT INTO feature_flags (key, enabled, payload, updated_at)
       VALUES ($1, $2, $3::jsonb, NOW())
       ON CONFLICT (key)
       DO UPDATE SET enabled = EXCLUDED.enabled, payload = EXCLUDED.payload, updated_at = NOW()`
,      [key, enabled, payload ? JSON.stringify(payload) : null]
    );
  }, () => undefined);
}

export async function listFeatureFlags(): Promise<Array<{ key: FeatureFlagKey; enabled: boolean; payload: Record<string, unknown> | null }>> {
  return withExecutor(async (executor) => {
    await ensureFeatureTable(executor);

    const result = await executor.query(`SELECT key, enabled, payload FROM feature_flags`);
    const rows = result.rows as FeatureFlagRecord[];
    const map = new Map<string, FeatureFlagRecord>();
    rows.forEach((row) => map.set(row.key, row));

    return FLAG_KEYS.map((key) => {
      const record = map.get(key);
      return {
        key,
        enabled: record?.enabled ?? false,
        payload: record ? parsePayload(record.payload) : null,
      };
    });
  }, () =>
    FLAG_KEYS.map((key) => ({ key, enabled: DEFAULT_SNAPSHOT[key].enabled, payload: DEFAULT_SNAPSHOT[key].payload }))
  );
}

export async function ensureDefaultFlags(): Promise<void> {
  await withExecutor(async (executor) => {
    await ensureFeatureTable(executor);

    await Promise.all(
      FLAG_KEYS.map((key) =>
        executor.query(
          `INSERT INTO feature_flags (key, enabled)
           VALUES ($1, FALSE) ON CONFLICT (key) DO NOTHING`,
          [key]
        )
      )
    );
  }, () => undefined);
}

export function resetFeatureFlagCacheForTests() {
  featureTableInitialized = false;
}

export async function isFeatureEnabled(key: FeatureFlagKey, defaultValue = false): Promise<boolean> {
  const flag = await getFeatureFlag(key, defaultValue);
  return flag.enabled;
}

export async function getFeatureFlagSnapshot(): Promise<FeatureFlagSnapshot> {
  const flags = await listFeatureFlags();
  return flags.reduce<FeatureFlagSnapshot>((acc, flag) => {
    acc[flag.key] = { enabled: flag.enabled, payload: flag.payload };
    return acc;
  }, { ...DEFAULT_SNAPSHOT });
}
