import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { newDb } from "pg-mem";
import type { Pool } from "pg";

import { setQueryExecutorForTests } from "../db";
import { logAutoJoinTriggered, logPreferenceChange, resetTelemetryForTests } from "../telemetry";

let pool: Pool;

before(async () => {
  const db = newDb();
  const adapter = db.adapters.createPg();
  pool = new adapter.Pool();
  setQueryExecutorForTests(pool);
});

after(async () => {
  resetTelemetryForTests();
  setQueryExecutorForTests(null);
  await pool.end();
});

test("logs preference change telemetry", async () => {
  await logPreferenceChange({ userId: "telemetry-user", field: "spontaneity", previous: "medium", next: "high" });
  const rows = await pool.query(
    "SELECT name, metadata FROM telemetry_events WHERE user_id = $1",
    ["telemetry-user"]
  );
  assert.equal(rows.rows.length, 1);
  const event = rows.rows[0];
  assert.equal(event.name, "pref_changed");
  assert.equal((event.metadata as any).field, "spontaneity");
});

test("logs auto join triggered telemetry", async () => {
  await logAutoJoinTriggered({ userId: "telemetry-user", eventId: "hangout-1", outcome: "joined" });
  const rows = await pool.query(
    "SELECT name, metadata FROM telemetry_events WHERE user_id = $1 AND name = 'auto_join_triggered'",
    ["telemetry-user"]
  );
  assert.equal(rows.rows.length, 1);
  assert.equal((rows.rows[0].metadata as any).outcome, "joined");
});
