import { NextResponse } from "next/server";
import { fetchUserEvents } from "@/app/services/events";
import { generateLocalAISuggestions, type WeatherContext } from "@/app/services/ai";
import { getTenantId } from "@/app/services/tenant";
import { checkRateLimit } from "@/app/services/rate-limit";

// Enhanced in-memory cache for AI events with incremental updates support
interface CacheEntry {
  event: EventResponse | EventResponse[];
  timestamp: number;
  location: string;
  tenantId: string;
}

const aiEventCache: Map<string, CacheEntry> = new Map();
const DEFAULT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Clean up expired cache entries
 */
function cleanupCache(cacheDuration: number = DEFAULT_CACHE_DURATION) {
  const now = Date.now();
  for (const [key, entry] of aiEventCache.entries()) {
    if (now - entry.timestamp >= cacheDuration) {
      aiEventCache.delete(key);
    }
  }
}

/**
 * API Response format for plugin/API consumption
 */
interface EventResponse {
  id: string;
  title: string;
  description: string;
  tags: string[];
  location: { lat: number; lng: number };
  createdBy: string;
  source: "AI" | "User";
  tenantId?: string;
  createdAt?: string | Date;
  startTime?: string;
}

import type { FirestoreEventRecord } from "@/types/firestore";
import type { FirestoreTimestampLike } from "@/types/firestore";

const logMissingTenant = (eventTitle: string, eventId: string) => {
  console.warn(
    `[Firestore Warning] Missing tenantId for event "${eventTitle}" (id: ${eventId}). Using fallback.`
  );
};

const resolveEventDate = (value?: unknown): Date => {
  if (value instanceof Date) {
    return value;
  }

  if (value && typeof value === "object") {
    const timestampLike = value as FirestoreTimestampLike;
    if (typeof timestampLike.toDate === "function") {
      try {
        const date = timestampLike.toDate();
        if (date instanceof Date && !Number.isNaN(date.getTime())) {
          return date;
        }
      } catch (error) {
        console.warn("Failed to convert Firestore timestamp via toDate:", error);
      }
    }
    if (typeof timestampLike.seconds === "number") {
      return new Date(timestampLike.seconds * 1000);
    }
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date();
};

const sanitizeText = (value?: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const OUTDOOR_TAG_PATTERNS = [/outdoor/i, /outdoors/i, /outside/i, /hike/i, /trail/i, /park/i, /camp/i, /beach/i];

function pruneOutdoorTags(tags: string[] | undefined, shouldAvoidOutdoor: boolean): string[] | undefined {
  if (!shouldAvoidOutdoor || !tags) {
    return tags;
  }

  const filtered = tags.filter((tag) => !OUTDOOR_TAG_PATTERNS.some((pattern) => pattern.test(tag)));
  if (!filtered.some((tag) => /indoor/i.test(tag))) {
    filtered.push("indoor");
  }
  return filtered;
}

function parseWeatherParam(
  raw: string | null,
): { weatherInput: string | WeatherContext | null; avoidOutdoor: boolean } {
  if (!raw) {
    return { weatherInput: null, avoidOutdoor: false };
  }

  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // If decode fails, fall back to original value
  }

  const trimmed = decoded.trim();
  if (!trimmed) {
    return { weatherInput: null, avoidOutdoor: false };
  }

  let parsed: unknown;
  if (trimmed.startsWith("{")) {
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      parsed = null;
    }
  }

  if (parsed && typeof parsed === "object") {
    const maybeWeather = parsed as Record<string, unknown>;

    const temperatureC =
      typeof maybeWeather.temperatureC === "number" ? maybeWeather.temperatureC : undefined;
    const feelsLikeC =
      typeof maybeWeather.feelsLikeC === "number" ? maybeWeather.feelsLikeC : undefined;
    const condition =
      typeof maybeWeather.condition === "string"
        ? maybeWeather.condition
        : typeof maybeWeather.title === "string"
        ? maybeWeather.title
        : typeof maybeWeather.description === "string"
        ? maybeWeather.description
        : undefined;
    const windSpeedMph =
      typeof maybeWeather.windSpeedMph === "number"
        ? maybeWeather.windSpeedMph
        : typeof maybeWeather.windSpeed === "number"
        ? maybeWeather.windSpeed
        : undefined;
    const humidity =
      typeof maybeWeather.humidity === "number" ? maybeWeather.humidity : undefined;

    let precipitationChance: number | undefined;
    if (typeof maybeWeather.precipitationChance === "number") {
      precipitationChance = maybeWeather.precipitationChance;
    } else if (typeof maybeWeather.precipitationProbability === "number") {
      precipitationChance = maybeWeather.precipitationProbability;
    }

    const summary =
      typeof maybeWeather.summary === "string"
        ? maybeWeather.summary
        : typeof maybeWeather.description === "string"
        ? maybeWeather.description
        : undefined;

    const conditionLower = condition?.toLowerCase() ?? "";
    const precipPercent =
      typeof precipitationChance === "number"
        ? precipitationChance > 1
          ? precipitationChance
          : precipitationChance * 100
        : undefined;

    const shouldAvoidOutdoor =
      conditionLower.includes("rain") ||
      conditionLower.includes("storm") ||
      conditionLower.includes("thunder") ||
      conditionLower.includes("snow") ||
      (typeof precipPercent === "number" && precipPercent >= 60);

    const advisory =
      typeof maybeWeather.advisory === "string" && maybeWeather.advisory.trim().length > 0
        ? maybeWeather.advisory
        : shouldAvoidOutdoor
        ? "Conditions are wet or changeable—prioritize indoor or covered experiences."
        : undefined;

    const weatherInput: WeatherContext = {
      summary: summary ?? undefined,
      temperatureC,
      feelsLikeC,
      condition,
      windSpeedMph,
      precipitationChance:
        typeof precipitationChance === "number" ? precipitationChance : undefined,
      humidity,
      advisory,
    };

    return { weatherInput, avoidOutdoor: shouldAvoidOutdoor };
  }

  const lower = trimmed.toLowerCase();
  const avoidOutdoor =
    lower.includes("rain") ||
    lower.includes("storm") ||
    lower.includes("thunder") ||
    lower.includes("snow");

  return { weatherInput: trimmed, avoidOutdoor };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // Extract API key or tenantId from query params or headers
    const apiKey = searchParams.get("apiKey") || req.headers.get("x-api-key");
    const tenantIdParam = searchParams.get("tenantId");
    
    // Validate API key and get tenantId (server-side validation)
    const tenantId = getTenantId(apiKey || undefined, tenantIdParam || undefined);
    
    if (!tenantId) {
      return NextResponse.json(
        {
          error: "Authentication required",
          message: "Valid API key or tenantId is required",
          events: [],
          meta: {},
        },
        { status: 401 }
      );
    }

    // Rate limiting: Check general request limit
    const rateLimitCheck = checkRateLimit(tenantId, "requests");
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: `Too many requests. Limit: ${rateLimitCheck.limit} per minute. Reset at: ${new Date(rateLimitCheck.resetAt).toISOString()}`,
          events: [],
          meta: {},
          rateLimit: {
            remaining: 0,
            resetAt: rateLimitCheck.resetAt,
            limit: rateLimitCheck.limit,
          },
        },
        { 
          status: 429,
          headers: {
            "X-RateLimit-Limit": rateLimitCheck.limit.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimitCheck.resetAt.toString(),
            "Retry-After": Math.ceil((rateLimitCheck.resetAt - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Parse query parameters
    const limit = searchParams.get("limit") 
      ? parseInt(searchParams.get("limit")!, 10) 
      : 50;
    const location = searchParams.get("location") || "New York";
    const userLatParam = searchParams.get("userLat");
    const userLngParam = searchParams.get("userLng");
    const cityParam = searchParams.get("city");
    const travelerType = searchParams.get("travelerType");
    const mood = searchParams.get("mood");
    const { weatherInput, avoidOutdoor } = parseWeatherParam(searchParams.get("weather"));
    const timezone = searchParams.get("timezone");
    const includeAI = searchParams.get("includeAI") !== "false"; // Default to true
    const tagsParam = searchParams.get("tags");
    const parsedTags = tagsParam ? tagsParam.split(",").map(t => t.trim()).filter(t => t.length > 0) : undefined;
    const tags = pruneOutdoorTags(parsedTags, avoidOutdoor);
    const createdBy = searchParams.get("createdBy") || undefined;
    const sortBy = searchParams.get("sortBy") || "newest"; // newest, nearest (future)
    
    // Incremental updates: only fetch events created after this timestamp
    const sinceTimestamp = searchParams.get("since");
    const sinceDate = sinceTimestamp ? new Date(parseInt(sinceTimestamp, 10)) : undefined;

    // Fetch user events with filters (tenant-filtered)
    // If sinceDate is provided, only fetch events created after that date (incremental updates)
    const userEvents = (await fetchUserEvents({
      limit: sinceDate ? 1000 : limit, // Fetch more if incremental to filter properly
      tags,
      createdBy,
      tenantId, // Multi-tenant filtering
    })) as FirestoreEventRecord[];
    
    // Filter by timestamp if incremental update requested
    const filteredUserEvents = sinceDate 
      ? userEvents.filter((event) => resolveEventDate(event.createdAt) > sinceDate)
      : userEvents;

    // Normalize user events to consistent schema
    const normalizedUserEvents: EventResponse[] = filteredUserEvents.map((event, index) => {
      const eventTenantId =
        typeof event.tenantId === "string" && event.tenantId.trim().length > 0
          ? event.tenantId.trim()
          : undefined;

      const safeLocation =
        event.location &&
        typeof event.location === "object" &&
        typeof (event.location as { lat?: unknown }).lat === "number" &&
        typeof (event.location as { lng?: unknown }).lng === "number"
          ? (event.location as { lat: number; lng: number })
          : { lat: 0, lng: 0 };

      const tagList = Array.isArray(event.tags)
        ? event.tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
        : [];

      const resolvedTenantId = eventTenantId ?? tenantId ?? "defaultTenant";
      if (!eventTenantId) {
        logMissingTenant(event.title || `Event ${index + 1}`, event.id ?? `unknown-${index}`);
      }

      return {
        id:
          typeof event.id === "string" && event.id.trim().length > 0
            ? event.id.trim()
            : `user-${tenantId}-${index}`,
        title: sanitizeText(event.title) || "Community Hang Out",
        description: sanitizeText(event.description) || "",
        tags: tagList,
        location: safeLocation,
        createdBy: sanitizeText(event.createdBy) || "unknown",
        source: "User" as const,
        tenantId: resolvedTenantId,
        createdAt: resolveEventDate(event.createdAt),
        startTime:
          typeof event.startTime === "string" && event.startTime.trim().length > 0
            ? event.startTime
            : undefined,
      };
    });

    let allEvents: EventResponse[] = [...normalizedUserEvents];

        // Optionally include AI event (with tenant-specific caching and incremental updates)
        if (includeAI) {
          try {
            // Get cache duration from query params (in minutes, default 5)
            const cacheDurationParam = searchParams.get("cacheDuration");
            const cacheDuration = cacheDurationParam 
              ? parseInt(cacheDurationParam, 10) * 60 * 1000 
              : DEFAULT_CACHE_DURATION;

            // Create cache key based on tenant and location (normalize coordinates for caching)
            const normalizedLocation = location.replace(/\s+/g, '-').toLowerCase();
            const cacheKey = `ai-${tenantId}-${normalizedLocation}`;
            const cached = aiEventCache.get(cacheKey);
            const now = Date.now();

            let aiEventsForResponse: EventResponse[] = [];
            if (cached && (now - cached.timestamp) < cacheDuration) {
              // Use cached event (incremental update - no new AI generation)
              aiEventsForResponse = Array.isArray(cached.event) ? cached.event : [cached.event];
              console.log(`[Cache Hit] Using cached AI event for ${tenantId} at ${location}`);
            } else {
              // Rate limiting: Check AI event generation limit (only if not cached)
              const aiRateLimit = checkRateLimit(tenantId, "aiEvents");
              if (!aiRateLimit.allowed) {
                console.warn(`[Rate Limit] AI event generation limit exceeded for ${tenantId}`);
                // Return cached event if available, otherwise skip AI event
                if (cached) {
                  aiEventsForResponse = Array.isArray(cached.event) ? cached.event : [cached.event];
                } else {
                  throw new Error(`AI event generation rate limit exceeded. Limit: ${aiRateLimit.limit} per minute. Reset at: ${new Date(aiRateLimit.resetAt).toISOString()}`);
                }
              } else {
                // Generate new AI event with tenant-specific prompt (server-side only)
                console.log(`[Cache Miss] Generating new AI event for ${tenantId} at ${location}`);
                const coordinates =
                  userLatParam && userLngParam
                    ? {
                        lat: parseFloat(userLatParam),
                        lng: parseFloat(userLngParam),
                      }
                    : undefined;
                const generatedSuggestions = await generateLocalAISuggestions({
                  location,
                  tenantId,
                  coordinates: coordinates && !Number.isNaN(coordinates.lat) && !Number.isNaN(coordinates.lng) ? coordinates : null,
                  city: cityParam,
                  travelerType: travelerType || undefined,
                  mood: mood || undefined,
                  weather: weatherInput || undefined,
                  timezone: timezone || undefined,
                });

                aiEventsForResponse = generatedSuggestions.map((suggestion) => ({
                  id: suggestion.id || `AI-${tenantId || "default"}-${normalizedLocation}-${Date.now()}`,
                  title: suggestion.title || "AI Generated Experience",
                  description: suggestion.description || "",
                  tags: suggestion.tags || [],
                  location: suggestion.location || { lat: 40.7128, lng: -74.0060 },
                  createdBy: suggestion.createdBy || "ai",
                  source: "AI" as const,
                  tenantId: suggestion.tenantId || tenantId,
                  createdAt: resolveEventDate(suggestion.createdAt),
                  startTime:
                    typeof suggestion.startTime === "string" && suggestion.startTime.trim().length > 0
                      ? suggestion.startTime
                      : undefined,
                }));
                // Cache it per tenant with metadata
                aiEventCache.set(cacheKey, { 
                  event: aiEventsForResponse, 
                  timestamp: now,
                  location: normalizedLocation,
                  tenantId,
                });
              }
            }
            
            // Periodic cleanup of expired cache entries
            cleanupCache(cacheDuration);
            
            allEvents = [...aiEventsForResponse, ...normalizedUserEvents];
          } catch (aiError) {
            const message = aiError instanceof Error ? aiError.message : "Unknown AI generation error";
            console.warn("Failed to generate AI event:", message);
            // Continue without AI event if generation fails
          }
        }

    // Apply sorting (currently only newest is supported)
    if (sortBy === "newest") {
      allEvents.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt || 0);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      });
    }

    // Apply limit after sorting
    const limitedEvents = allEvents.slice(0, limit);

    // Return consistent JSON structure
    return NextResponse.json({
      events: limitedEvents,
      meta: {
        total: limitedEvents.length,
        limit,
        includeAI,
        location,
        tags: tags || [],
        sortBy,
        tenantId, // Include tenantId in response
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error fetching events:", err);
    return NextResponse.json(
      { 
        error: "Failed to fetch events",
        message,
        events: [],
        meta: {},
      },
      { status: 500 }
    );
  }
}
