import { createHmac } from "crypto";
import type { NextRequest } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";

export class UnauthorizedError extends Error {
  status: number;

  constructor(message: string = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
    this.status = 401;
  }
}

export interface AuthenticatedUser {
  id: string;
  email?: string;
  name?: string;
  scopes: string[];
}

interface JwtPayload {
  sub: string;
  email?: string;
  name?: string;
  scope?: string | string[];
  exp?: number;
  aud?: string | string[];
  iss?: string;
}

function base64UrlDecode(segment: string): string {
  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const buffer = Buffer.from(normalized, "base64");
  return buffer.toString("utf8");
}

function tryVerifyHmacJwt(token: string): JwtPayload | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const expected = createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  if (expected !== signature) {
    return null;
  }

  const payloadJson = base64UrlDecode(encodedPayload);

  let payload: JwtPayload;
  try {
    payload = JSON.parse(payloadJson) as JwtPayload;
  } catch {
    return null;
  }

  if (!payload.sub) {
    return null;
  }

  if (payload.exp && Date.now() / 1000 > payload.exp) {
    return null;
  }

  return payload;
}

async function tryVerifyFirebaseIdToken(token: string): Promise<JwtPayload | null> {
  try {
    const adminAuth = getAdminAuth();
    if (!adminAuth) {
      return null;
    }
    const decoded = await adminAuth.verifyIdToken(token);
    return {
      sub: decoded.uid,
      email: decoded.email,
      name: decoded.name,
      scope: decoded.scope ?? decoded.roles ?? decoded.role ?? undefined,
    } satisfies JwtPayload;
  } catch (error) {
    console.warn("Firebase token verification failed", error);
    return null;
  }
}

async function resolveJwtPayload(token: string): Promise<JwtPayload> {
  const hmacPayload = tryVerifyHmacJwt(token);
  if (hmacPayload) {
    return hmacPayload;
  }

  const firebasePayload = await tryVerifyFirebaseIdToken(token);
  if (firebasePayload) {
    return firebasePayload;
  }

  throw new UnauthorizedError("Invalid bearer token");
}

function normalizeScopes(scope?: string | string[]): string[] {
  if (!scope) return [];
  if (Array.isArray(scope)) return scope;
  return scope.split(/[\s,]+/).filter(Boolean);
}

export async function getUserFromReq(req: NextRequest): Promise<AuthenticatedUser> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing bearer token");
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    throw new UnauthorizedError("Empty bearer token");
  }

  const payload = await resolveJwtPayload(token);

  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    scopes: normalizeScopes(payload.scope),
  };
}
