import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { newDb } from "pg-mem";
import type { Pool } from "pg";

import {
  ensureDefaultFlags,
  getFeatureFlag,
  getFeatureFlagSnapshot,
  isFeatureEnabled,
  listFeatureFlags,
  setFeatureFlag,
  resetFeatureFlagCacheForTests,
} from "../feature-flags";
import { setQueryExecutorForTests } from "../db";

let pool: Pool;

before(async () => {
  const db = newDb();
  const adapter = db.adapters.createPg();
  pool = new adapter.Pool();
  setQueryExecutorForTests(pool);
});

after(async () => {
  resetFeatureFlagCacheForTests();
  setQueryExecutorForTests(null);
  await pool.end();
});

test("feature flags default to disabled", async () => {
  await ensureDefaultFlags();
  const snapshot = await getFeatureFlagSnapshot();
  const expected: Record<string, boolean> = {
    settings_ui_enabled: true,
    auto_join_v1: false,
    live_location: false,
  };
  Object.entries(snapshot).forEach(([key, flag]) => {
    assert.equal(flag.enabled, expected[key] ?? false);
  });
});

test("feature flags can be toggled", async () => {
  await setFeatureFlag("settings_ui_enabled", true);
  const flag = await getFeatureFlag("settings_ui_enabled");
  assert.equal(flag.enabled, true);

  const enabled = await isFeatureEnabled("settings_ui_enabled");
  assert.equal(enabled, true);
});

test("feature flag snapshot includes payload", async () => {
  await setFeatureFlag("auto_join_v1", true, { rollout: "beta" });
  const flags = await listFeatureFlags();
  const autoJoin = flags.find((item) => item.key === "auto_join_v1");
  assert.ok(autoJoin);
  assert.equal(autoJoin?.payload?.rollout, "beta");
});
