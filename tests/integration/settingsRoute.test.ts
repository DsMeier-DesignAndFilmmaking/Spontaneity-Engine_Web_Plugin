import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "crypto";
import { NextRequest } from "next/server";
import { newDb } from "pg-mem";
import type { Pool } from "pg";

import { GET, PATCH, PUT } from "@/app/api/v1/settings/route";
import { POST as exportPost } from "@/app/api/v1/settings/export/route";
import { GET as exportDownload } from "@/app/api/v1/settings/export/[token]/route";
import { POST as deletePost } from "@/app/api/v1/settings/delete/route";
import { setQueryExecutorForTests } from "@/lib/db";
import {
  ensureDefaultFlags,
  setFeatureFlag,
  resetFeatureFlagCacheForTests,
} from "@/lib/feature-flags";
import { resetTelemetryForTests } from "@/lib/telemetry";
import type { UserPreferences } from "@/types/settings";

let pool: Pool;
const JWT_SECRET = "integration-secret";
const USER_ID = "integration-user";

function createToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

type RequestOptions = {
  rawBody?: string;
  headers?: Record<string, string>;
  includeAuth?: boolean;
};

function buildRequest(
  method: string,
  body?: unknown,
  pathname = "/api/v1/settings",
  options: RequestOptions = {}
): NextRequest {
  const token = createToken({ sub: USER_ID, email: "qa@example.com" });
  const headers = new Headers(options.headers ?? {});
  const includeAuth = options.includeAuth !== false;
  if (includeAuth && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const init: RequestInit = { method, headers };
  if (options.rawBody !== undefined) {
    init.body = options.rawBody;
  } else if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  return new NextRequest(`http://localhost${pathname}`, init);
}

before(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
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
  await ensureDefaultFlags();
  await setFeatureFlag("settings_ui_enabled", true);
  await setFeatureFlag("auto_join_v1", true);
  await setFeatureFlag("live_location", true);
});

after(async () => {
  resetTelemetryForTests();
  resetFeatureFlagCacheForTests();
  setQueryExecutorForTests(null);
  await pool.end();
});

test("GET returns default preferences when none stored", async () => {
  const response = await GET(buildRequest("GET"));
  assert.equal(response.status, 200);
  const json = (await response.json()) as { data: any };
  assert.equal(json.data.userId, USER_ID);
  assert.equal(json.data.spontaneity, "medium");
});

test("PATCH persists changes and records telemetry", async () => {
  const patchPayload = {
    radiusKm: 12,
    spontaneity: "high",
  };
  const response = await PATCH(buildRequest("PATCH", patchPayload));
  assert.equal(response.status, 200);
  const json = (await response.json()) as { data: any };
  assert.equal(json.data.radiusKm, 12);
  assert.equal(json.data.spontaneity, "high");

  const telemetry = await pool.query(
    "SELECT name, metadata FROM telemetry_events WHERE user_id = $1 ORDER BY created_at DESC",
    [USER_ID]
  );
  assert.ok(telemetry.rows.length >= 2, "preference change should emit telemetry events");
  const fields = telemetry.rows.map((row) => (row.metadata as any).field);
  assert.ok(fields.includes("radiusKm"));
  assert.ok(fields.includes("spontaneity"));
});

test("PATCH enforces feature flags", async () => {
  await setFeatureFlag("live_location", false);
  const response = await PATCH(buildRequest("PATCH", { locationSharing: "live" }));
  assert.equal(response.status, 200);
  const json = (await response.json()) as { data: any };
  assert.equal(json.data.locationSharing, "off");
  await setFeatureFlag("live_location", true);
});

test("GET returns 404 when settings UI disabled", async () => {
  await setFeatureFlag("settings_ui_enabled", false);
  const response = await GET(buildRequest("GET"));
  assert.equal(response.status, 404);
  await setFeatureFlag("settings_ui_enabled", true);
});

test("PATCH rejects invalid payload", async () => {
  const response = await PATCH(buildRequest("PATCH", { radiusKm: 0 }));
  assert.equal(response.status, 400);
});

test("POST /settings/export respects flag", async () => {
  await setFeatureFlag("settings_ui_enabled", false);
  const response = await exportPost(buildRequest("POST", undefined, "/api/v1/settings/export"));
  assert.equal(response.status, 404);
  await setFeatureFlag("settings_ui_enabled", true);
});

test("POST /settings/export returns downloadable archive", async () => {
  const response = await exportPost(buildRequest("POST", undefined, "/api/v1/settings/export"));
  assert.equal(response.status, 201);
  const json = (await response.json()) as { downloadUrl: string };
  const token = json.downloadUrl.split("/").pop() as string;
  const download = await exportDownload(
    buildRequest("GET", undefined, `/api/v1/settings/export/${token}`),
    { params: Promise.resolve({ token }) }
  );
  assert.equal(download.status, 200);
  const disposition = download.headers.get("content-disposition");
  assert.ok(disposition?.includes("attachment"));
});

test("export download rejects unauthorized access", async () => {
  const response = await exportPost(buildRequest("POST", undefined, "/api/v1/settings/export"));
  assert.equal(response.status, 201);
  const json = (await response.json()) as { downloadUrl: string };
  const token = json.downloadUrl.split("/").pop() as string;
  const download = await exportDownload(
    buildRequest("GET", undefined, `/api/v1/settings/export/${token}`, { includeAuth: false }),
    { params: Promise.resolve({ token }) }
  );
  assert.equal(download.status, 401);
});

test("POST /settings/delete schedules deletion and sanitizes location", async () => {
  const response = await deletePost(buildRequest("POST", undefined, "/api/v1/settings/delete"));
  assert.equal(response.status, 202);
  const json = (await response.json()) as { scheduledFor: string };
  assert.ok(new Date(json.scheduledFor).getTime() > Date.now());

  const state = await pool.query(
    "SELECT data FROM user_preferences WHERE user_id = $1",
    [USER_ID]
  );
  const prefs = state.rows[0]?.data as UserPreferences;
  assert.equal(prefs.locationSharing, "off");
});

test("POST /settings/delete returns 404 when feature disabled", async () => {
  await setFeatureFlag("settings_ui_enabled", false);
  const response = await deletePost(buildRequest("POST", undefined, "/api/v1/settings/delete"));
  assert.equal(response.status, 404);
  await setFeatureFlag("settings_ui_enabled", true);
});

test("PUT replaces the full settings document", async () => {
  const payload: UserPreferences = {
    userId: USER_ID,
    displayName: "QA Tester",
    photoUrl: "https://example.com/avatar.png",
    interests: ["coffee"],
    spontaneity: "low",
    matchStrictness: "strict",
    autoJoin: true,
    locationSharing: "nearby",
    radiusKm: 9,
    transportPreference: "transit",
    defaultNavProvider: "google",
    offlineMaps: true,
    whoCanInvite: "followers",
    profileVisibility: "anonymous",
    safetyMode: "high",
    accessibilityNeeds: ["wheelchair"],
    budget: { maxCents: 2500 },
    timeAvailability: "now",
    aiPersona: "adventurous",
    showReasoning: true,
    analyticsOptIn: false,
    dndSchedule: [],
    updatedAt: new Date().toISOString(),
  };

  const response = await PUT(buildRequest("PUT", payload));
  assert.equal(response.status, 200);
  const json = (await response.json()) as { data: UserPreferences };
  assert.equal(json.data.profileVisibility, "anonymous");
});

test("PATCH returns 400 on malformed JSON", async () => {
  const request = buildRequest(
    "PATCH",
    undefined,
    "/api/v1/settings",
    { rawBody: "{\"radiusKm\":", includeAuth: true }
  );
  const response = await PATCH(request);
  assert.equal(response.status, 400);
});
