import { createHmac } from "crypto";
import type { NextRequest } from "next/server";

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

function verifyJwt(token: string): JwtPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new UnauthorizedError("Server misconfigured: missing JWT secret");
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new UnauthorizedError("Malformed bearer token");
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const expected = createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  if (expected !== signature) {
    throw new UnauthorizedError("Invalid bearer token signature");
  }

  const payloadJson = base64UrlDecode(encodedPayload);

  let payload: JwtPayload;
  try {
    payload = JSON.parse(payloadJson) as JwtPayload;
  } catch {
    throw new UnauthorizedError("Unable to parse token payload");
  }

  if (!payload.sub) {
    throw new UnauthorizedError("Token missing subject");
  }

  if (payload.exp && Date.now() / 1000 > payload.exp) {
    throw new UnauthorizedError("Token expired");
  }

  return payload;
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

  const payload = verifyJwt(token);

  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    scopes: normalizeScopes(payload.scope),
  };
}
