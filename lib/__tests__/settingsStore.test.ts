import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { newDb } from "pg-mem";
import type { Pool } from "pg";
import { randomUUID } from "crypto";

import {
  getSettings,
  saveSettings,
  patchSettings,
  setQueryExecutorForTests,
  enqueueSettingsExport,
  enqueueSettingsDeletion,
} from "../settings-store";
import type { UserPreferences } from "@/types/settings";
import { resetTelemetryForTests } from "../telemetry";

let pool: Pool;

const basePreferences: UserPreferences = {
  userId: "mem-user",
  displayName: "River",
  photoUrl: "https://example.com/river.png",
  interests: ["sunsets", "coffee"],
  spontaneity: "high",
  matchStrictness: "flexible",
  autoJoin: true,
  locationSharing: "nearby",
  radiusKm: 12,
  transportPreference: "walking",
  defaultNavProvider: "mapbox",
  offlineMaps: true,
  whoCanInvite: "anyone",
  profileVisibility: "full",
  safetyMode: "standard",
  accessibilityNeeds: [],
  budget: "$",
  timeAvailability: { from: "08:00", to: "22:00" },
  aiPersona: "adventurous",
  showReasoning: true,
  analyticsOptIn: true,
  dndSchedule: [{ day: 5, from: "21:00", to: "06:00" }],
  updatedAt: new Date().toISOString(),
};

before(async () => {
  const db = newDb();
  const adapter = db.adapters.createPg();
  pool = new adapter.Pool();
  setQueryExecutorForTests(pool);

  await pool.query(`
    CREATE TABLE user_preferences (
      user_id VARCHAR PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
});

after(async () => {
  setQueryExecutorForTests(null);
  resetTelemetryForTests();
  await pool.end();
});

test("saveSettings persists and normalizes preferences", async () => {
  const saved = await saveSettings(basePreferences.userId, basePreferences);

  assert.equal(saved.userId, basePreferences.userId);
  assert.equal(saved.spontaneity, basePreferences.spontaneity);
  assert.notEqual(saved.updatedAt, basePreferences.updatedAt);

  const row = await pool.query("SELECT data FROM user_preferences WHERE user_id = $1", [basePreferences.userId]);
  assert.equal(row.rows.length, 1);
  assert.equal((row.rows[0].data as any).userId, basePreferences.userId);
});

test("getSettings retrieves stored preferences", async () => {
  const fetched = await getSettings(basePreferences.userId);
  assert.ok(fetched);
  assert.equal(fetched?.userId, basePreferences.userId);
  assert.equal(fetched?.autoJoin, true);
});

test("patchSettings updates subset of fields", async () => {
  const updated = await patchSettings(basePreferences.userId, {
    spontaneity: "medium",
    radiusKm: 20,
    showReasoning: false,
  });

  assert.equal(updated.spontaneity, "medium");
  assert.equal(updated.radiusKm, 20);
  assert.equal(updated.showReasoning, false);

  const fetched = await getSettings(basePreferences.userId);
  assert.equal(fetched?.radiusKm, 20);
});

test("patchSettings rejects invalid updates", async () => {
  await assert.rejects(
    () => patchSettings(basePreferences.userId, { radiusKm: 100 }),
    /radiusKm/
  );
});

test("preference changes emit telemetry events", async () => {
  await patchSettings(basePreferences.userId, {
    locationSharing: "live",
    analyticsOptIn: false,
  });

  const rows = await pool.query(
    "SELECT name, metadata FROM telemetry_events WHERE user_id = $1",
    [basePreferences.userId]
  );

  assert.ok(rows.rows.length > 0);
  const fields = rows.rows.map((row) => (row.metadata as any).field);
  assert.ok(fields.includes("locationSharing"));
  assert.ok(fields.includes("analyticsOptIn"));
});

test("enqueueSettingsExport inserts queue row", async () => {
  const jobId = randomUUID();
  await enqueueSettingsExport(basePreferences.userId, jobId);
  const queueRows = await pool.query(
    "SELECT id FROM settings_export_queue WHERE id = $1",
    [jobId]
  );
  assert.equal(queueRows.rows.length, 1);
});

test("enqueueSettingsDeletion inserts queue row", async () => {
  const jobId = randomUUID();
  await enqueueSettingsDeletion(basePreferences.userId, jobId);
  const queueRows = await pool.query(
    "SELECT id FROM settings_deletion_queue WHERE id = $1",
    [jobId]
  );
  assert.equal(queueRows.rows.length, 1);
});
