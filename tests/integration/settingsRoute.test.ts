import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "crypto";
import { NextRequest } from "next/server";
import { newDb } from "pg-mem";
import type { Pool } from "pg";

import { GET, POST } from "@/app/api/v1/settings/route";
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

type NextRequestInit = Omit<RequestInit, "signal"> & { signal?: AbortSignal };

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

  const { signal, ...rest } = init as RequestInit & { signal?: AbortSignal | null };
  const nextInit: NextRequestInit = { ...rest };
  if (signal ?? undefined) {
    nextInit.signal = signal as AbortSignal;
  }

  return new NextRequest(`http://localhost${pathname}`, nextInit);
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

test("GET returns mock preferences", async () => {
  const response = await GET(buildRequest("GET"));
  assert.equal(response.status, 200);
  const json = (await response.json()) as {
    environment: string;
    preferences: Record<string, unknown>;
    user: { id: string; name: string };
  };
  assert.ok(json.preferences);
  assert.ok(Array.isArray(json.preferences.interests));
  assert.ok(typeof json.environment === "string");
});

test("POST persists mock preferences", async () => {
  const payload = {
    spontaneousMode: false,
    preferredRadius: 9,
    notifications: { push: false, email: true },
    interests: ["art"],
    aiPersonalizationLevel: "experimental" as const,
  };
  const response = await POST(buildRequest("POST", payload));
  assert.equal(response.status, 200);
  const json = (await response.json()) as { preferences: typeof payload };
  assert.equal(json.preferences.preferredRadius, 9);
  assert.equal(json.preferences.aiPersonalizationLevel, "experimental");
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
