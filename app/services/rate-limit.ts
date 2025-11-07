/**
 * Rate Limiting Service
 * Tracks API usage per tenant/API key to prevent abuse
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // Timestamp when limit resets
  lastRequest: number;
}

// In-memory rate limit store (for production, use Redis or Firestore)
const rateLimitStore: Map<string, RateLimitEntry> = new Map();

// Rate limit configurations per tenant (can be stored in Firestore)
interface RateLimitConfig {
  aiEventsPerMinute: number;
  requestsPerMinute: number;
  requestsPerHour: number;
}

// Default rate limits
const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  aiEventsPerMinute: 50,
  requestsPerMinute: 100,
  requestsPerHour: 1000,
};

// Tenant-specific rate limits (can be loaded from Firestore)
const TENANT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  "tenant-1": {
    aiEventsPerMinute: 50,
    requestsPerMinute: 100,
    requestsPerHour: 1000,
  },
  "tenant-2": {
    aiEventsPerMinute: 100,
    requestsPerMinute: 200,
    requestsPerHour: 2000,
  },
  "test-tenant": {
    aiEventsPerMinute: 10,
    requestsPerMinute: 20,
    requestsPerHour: 100,
  },
};

/**
 * Check rate limit for a tenant
 * @param tenantId - Tenant ID
 * @param limitType - Type of limit to check ('aiEvents', 'requests', 'requestsHour')
 * @returns Object with allowed status and remaining requests
 */
export function checkRateLimit(
  tenantId: string,
  limitType: "aiEvents" | "requests" | "requestsHour" = "requests"
): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
} {
  const config = TENANT_RATE_LIMITS[tenantId] || DEFAULT_RATE_LIMITS;
  const now = Date.now();
  const key = `${tenantId}:${limitType}`;

  // Determine limit and window based on type
  let limit: number;
  let windowMs: number;

  if (limitType === "aiEvents") {
    limit = config.aiEventsPerMinute;
    windowMs = 60 * 1000; // 1 minute
  } else if (limitType === "requestsHour") {
    limit = config.requestsPerHour;
    windowMs = 60 * 60 * 1000; // 1 hour
  } else {
    limit = config.requestsPerMinute;
    windowMs = 60 * 1000; // 1 minute
  }

  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    // Reset or create new entry
    const resetAt = now + windowMs;
    rateLimitStore.set(key, {
      count: 1,
      resetAt,
      lastRequest: now,
    });
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt,
      limit,
    };
  }

  // Check if limit exceeded
  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      limit,
    };
  }

  // Increment count
  entry.count++;
  entry.lastRequest = now;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: limit - entry.count,
    resetAt: entry.resetAt,
    limit,
  };
}

/**
 * Get rate limit status for a tenant
 */
export function getRateLimitStatus(tenantId: string): {
  aiEvents: { remaining: number; limit: number; resetAt: number };
  requests: { remaining: number; limit: number; resetAt: number };
  requestsHour: { remaining: number; limit: number; resetAt: number };
} {
  const aiEvents = checkRateLimit(tenantId, "aiEvents");
  const requests = checkRateLimit(tenantId, "requests");
  const requestsHour = checkRateLimit(tenantId, "requestsHour");

  return {
    aiEvents: {
      remaining: aiEvents.remaining,
      limit: aiEvents.limit,
      resetAt: aiEvents.resetAt,
    },
    requests: {
      remaining: requests.remaining,
      limit: requests.limit,
      resetAt: requests.resetAt,
    },
    requestsHour: {
      remaining: requestsHour.remaining,
      limit: requestsHour.limit,
      resetAt: requestsHour.resetAt,
    },
  };
}

/**
 * Clean up expired rate limit entries
 */
export function cleanupRateLimits() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

// Periodic cleanup (every 5 minutes)
if (typeof setInterval !== "undefined") {
  setInterval(cleanupRateLimits, 5 * 60 * 1000);
}

