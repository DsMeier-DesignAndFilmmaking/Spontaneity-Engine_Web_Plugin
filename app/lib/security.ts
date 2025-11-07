import { NextResponse } from "next/server";
import { getTenantId } from "@/app/services/tenant";
import { checkRateLimit as checkTenantRateLimit } from "@/app/services/rate-limit";

// Example tenant API keys (replace with secure storage for production)
// In production, these should be stored in Firestore or environment variables
const TENANT_API_KEYS: Record<string, string> = {
  "tenant1": process.env.TENANT1_API_KEY || "",
  "tenant2": process.env.TENANT2_API_KEY || "",
};

// In-memory rate limiter (per API key, simple for demo purposes)
// In production, use Redis or Firestore for distributed rate limiting
const rateLimits: Record<string, { count: number; reset: number }> = {};
const LIMIT = 50; // max requests per window
const WINDOW_MS = 60 * 1000; // 1 minute

/**
 * Validate API key and return tenant ID
 * Uses the existing tenant service for validation
 * @throws Error if API key is invalid
 */
export function validateApiKey(apiKey?: string | null): string {
  if (!apiKey) {
    throw new Error("Missing API key");
  }

  // Use existing tenant service to validate API key
  const tenantId = getTenantId(apiKey, undefined);
  
  if (!tenantId) {
    throw new Error("Invalid API key");
  }

  return apiKey;
}

/**
 * Check rate limit for an API key
 * Uses the existing rate limit service which is more sophisticated
 * @throws Error if rate limit exceeded
 */
export function checkRateLimit(apiKey: string): void {
  // Get tenant ID from API key
  const tenantId = getTenantId(apiKey, undefined);
  
  if (!tenantId) {
    throw new Error("Invalid API key");
  }

  // Use existing rate limit service (per tenant)
  const rateLimitCheck = checkTenantRateLimit(tenantId, "requests");
  
  if (!rateLimitCheck.allowed) {
    throw new Error(`Rate limit exceeded. Limit: ${rateLimitCheck.limit} per minute. Reset at: ${new Date(rateLimitCheck.resetAt).toISOString()}`);
  }
}

/**
 * Get rate limit status for an API key
 */
export function getRateLimitStatus(apiKey: string): {
  remaining: number;
  resetAt: number;
  limit: number;
} {
  const now = Date.now();

  if (!rateLimits[apiKey]) {
    return {
      remaining: LIMIT,
      resetAt: now + WINDOW_MS,
      limit: LIMIT,
    };
  }

  const limit = rateLimits[apiKey];

  if (now > limit.reset) {
    return {
      remaining: LIMIT,
      resetAt: now + WINDOW_MS,
      limit: LIMIT,
    };
  }

  return {
    remaining: LIMIT - limit.count,
    resetAt: limit.reset,
    limit: LIMIT,
  };
}

/**
 * Clean up expired rate limit entries
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  Object.keys(rateLimits).forEach((key) => {
    if (now > rateLimits[key].reset) {
      delete rateLimits[key];
    }
  });
}

// Periodic cleanup (every 5 minutes)
if (typeof setInterval !== "undefined") {
  setInterval(cleanupRateLimits, 5 * 60 * 1000);
}

