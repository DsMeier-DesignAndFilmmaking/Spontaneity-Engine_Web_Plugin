import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "crypto";
import { NextRequest } from "next/server";

import { getUserFromReq, UnauthorizedError } from "@/lib/server-auth";

const SECRET = "auth-test-secret";

function makeToken(payload: Record<string, unknown>) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

test("getUserFromReq rejects missing authorization header", async () => {
  const request = new NextRequest("http://localhost/auth");
  await assert.rejects(() => getUserFromReq(request), UnauthorizedError);
});

test("getUserFromReq rejects malformed token", async () => {
  process.env.JWT_SECRET = SECRET;
  const request = new NextRequest("http://localhost/auth", {
    headers: { Authorization: "Bearer invalid" },
  });
  await assert.rejects(() => getUserFromReq(request), UnauthorizedError);
});

test("getUserFromReq returns authenticated user", async () => {
  process.env.JWT_SECRET = SECRET;
  const token = makeToken({ sub: "auth-user", email: "auth@example.com" });
  const request = new NextRequest("http://localhost/auth", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const user = await getUserFromReq(request);
  assert.equal(user.id, "auth-user");
  assert.equal(user.email, "auth@example.com");
});
