import { NextResponse } from "next/server";
import { submitEvent } from "@/app/services/events";
import { getTenantId } from "@/app/services/tenant";
import { checkRateLimit } from "@/app/services/rate-limit";
import { extractTenantId, respondMissingTenantId } from "@/app/api/_utils/tenant";

type RawCreator = {
  uid?: string;
  name?: string;
  profileImageUrl?: string;
};

type RawLocation =
  | {
      lat?: unknown;
      lng?: unknown;
      [key: string]: unknown;
    }
  | string
  | null;

type SubmitEventBody = {
  userId?: string;
  apiKey?: string;
  tenantId?: string;
  creator?: RawCreator;
  creatorName?: string;
  creatorProfileImageUrl?: string;
  consentGiven?: boolean;
  title?: string;
  description?: string;
  location?: RawLocation;
  [key: string]: unknown;
};

type NormalizedEvent = {
  title?: string;
  description?: string;
  location?: { lat: number; lng: number };
  [key: string]: unknown;
  createdBy: string;
  creator: {
    uid: string;
    name?: string;
    profileImageUrl?: string;
  };
  consentGiven: boolean;
};

export async function POST(req: Request) {
  try {
    const { tenantId: extractedTenantId, sources, parsedBody } = await extractTenantId(
      req,
      "/app/api/plugin/submit-event",
    );

    let data: Record<string, unknown>;
    if (parsedBody && typeof parsedBody === "object") {
      data = parsedBody as Record<string, unknown>;
    } else {
      try {
        const body = await req.json();
        data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
      } catch (parseError) {
        console.error("Failed to parse request body:", parseError);
        return NextResponse.json(
          { error: "Invalid JSON in request body", message: "Request body must be valid JSON" },
          { status: 400 },
        );
      }
    }

    const {
      userId,
      apiKey,
      tenantId: tenantIdParam,
      creator,
      creatorName,
      creatorProfileImageUrl,
      consentGiven,
      title,
      description,
      location,
      ...additionalFields
    } = data as SubmitEventBody;

    const creatorPayload = creator;

    const apiKeyCandidate =
      (typeof apiKey === "string" && apiKey.trim().length > 0 ? apiKey.trim() : null) ??
      sources.bodyApiKey ??
      sources.queryApiKey ??
      sources.headerApiKey ??
      null;

    const tenantId =
      extractedTenantId ??
      getTenantId(apiKeyCandidate || undefined, tenantIdParam ?? undefined) ??
      undefined;

    if (!tenantId) {
      const traceSources = { ...sources, apiKey: apiKeyCandidate };  
      return respondMissingTenantId("/app/api/plugin/submit-event", traceSources);
    }

    const rateLimitCheck = checkRateLimit(tenantId, "requests");
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: `Too many requests. Limit: ${rateLimitCheck.limit} per minute. Reset at: ${new Date(rateLimitCheck.resetAt).toISOString()}`,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": rateLimitCheck.limit.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimitCheck.resetAt.toString(),
            "Retry-After": Math.ceil((rateLimitCheck.resetAt - Date.now()) / 1000).toString(),
          },
        },
      );
    }

    if (consentGiven === false) {
      return NextResponse.json(
        { error: "Consent required", message: "User consent is required for data processing" },
        { status: 400 },
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required", message: "User ID is required" },
        { status: 401 },
      );
    }

    const fallbackCreatorName =
      typeof creatorName === "string" && creatorName.trim().length > 0 ? creatorName.trim() : undefined;
    const fallbackCreatorImage =
      typeof creatorProfileImageUrl === "string" && creatorProfileImageUrl.trim().length > 0
        ? creatorProfileImageUrl.trim()
        : undefined;

    const eventCreator =
      creatorPayload && typeof creatorPayload === "object"
        ? {
            uid:
              typeof creatorPayload.uid === "string" && creatorPayload.uid.trim().length > 0
                ? creatorPayload.uid.trim()
                : userId,
            name:
              typeof creatorPayload.name === "string" && creatorPayload.name.trim().length > 0
                ? creatorPayload.name.trim()
                : fallbackCreatorName,
            profileImageUrl:
              typeof creatorPayload.profileImageUrl === "string" && creatorPayload.profileImageUrl.trim().length > 0
                ? creatorPayload.profileImageUrl.trim()
                : fallbackCreatorImage,
          }
        : {
            uid: userId,
            name: fallbackCreatorName,
            profileImageUrl: fallbackCreatorImage,
          };

    const normalizedTitle =
      typeof title === "string" && title.trim().length > 0 ? title.trim() : undefined;
    const normalizedDescription =
      typeof description === "string" && description.trim().length > 0 ? description.trim() : undefined;

    const normalizedLocation = (() => {
      if (!location) {
        return undefined;
      }
      if (typeof location === "string") {
        const match = location.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
        if (match) {
          const lat = parseFloat(match[1]);
          const lng = parseFloat(match[2]);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            return { lat, lng };
          }
        }
        return undefined;
      }
      if (
        typeof location === "object" &&
        typeof (location as { lat?: unknown }).lat === "number" &&
        typeof (location as { lng?: unknown }).lng === "number"
      ) {
        const lat = (location as { lat: number }).lat;
        const lng = (location as { lng: number }).lng;
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          return { lat, lng };
        }
      }
      return undefined;
    })();

    const event: NormalizedEvent = {
      ...additionalFields,
      title: normalizedTitle,
      description: normalizedDescription,
      location: normalizedLocation,
      createdBy: userId,
      creator: eventCreator,
      consentGiven: typeof consentGiven === "boolean" ? consentGiven : true,
    };

    if (!event.title || !event.description || !event.location) {
      return NextResponse.json(
        { error: "Missing required fields", message: "Title, description, and location are required" },
        { status: 400 },
      );
    }

    if (
      typeof event.location.lat !== "number" ||
      typeof event.location.lng !== "number" ||
      Number.isNaN(event.location.lat) ||
      Number.isNaN(event.location.lng)
    ) {
      return NextResponse.json(
        { error: "Invalid location", message: "Location must have both lat and lng" },
        { status: 400 },
      );
    }

    console.log("Submitting event with:", {
      tenantId,
      title: event.title,
      hasLocation: !!event.location,
      hasUserId: !!userId,
    });

    const result = await submitEvent(event, tenantId);
    const { id, ...rest } = result ?? {};
    console.log("submitEvent succeeded:", { id, tenantId });
    return NextResponse.json({ success: true, id, ...rest, tenantId });
  } catch (err) {
    console.error("=== SUBMIT EVENT ERROR ===");
    console.error("Error type:", typeof err);
    console.error("Error object:", err);
    const errorLike =
      typeof err === "object" && err !== null
        ? (err as Partial<{ message: string; code: string; name: string; stack: string }>)
        : {};
    console.error("Error message:", errorLike.message);
    console.error("Error code:", errorLike.code);
    console.error("Error name:", errorLike.name);
    console.error("Error stack:", errorLike.stack);

    const errorMessage =
      errorLike.message && errorLike.message.length > 0
        ? errorLike.message
        : typeof err === "string" && err.length > 0
        ? err
        : "An unexpected error occurred";
    const errorCode = errorLike.code || "unknown";

    const statusCode =
      errorMessage.includes("required") || errorMessage.includes("Authentication")
        ? 400
        : errorMessage.includes("Unauthorized") || errorMessage.includes("Tenant")
        ? 403
        : errorMessage.includes("Permission denied") || errorMessage.includes("permission") || errorCode === "permission-denied"
        ? 403
        : 500;

    type ErrorResponse = {
      error: string;
      message: string;
      code: string;
      details?: {
        name?: string;
        stack?: string;
        fullError?: string;
      };
    };

    const errorResponse: ErrorResponse = {
      error: "Failed to submit event",
      message: errorMessage,
      code: errorCode,
    };

    if (process.env.NODE_ENV === "development") {
      const fullError =
        typeof err === "object" && err !== null
          ? JSON.stringify(err, Object.getOwnPropertyNames(err))
          : undefined;
      errorResponse.details = {
        name: errorLike.name,
        stack: errorLike.stack,
        fullError,
      };
    }

    console.error("Returning error response:", errorResponse);
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
