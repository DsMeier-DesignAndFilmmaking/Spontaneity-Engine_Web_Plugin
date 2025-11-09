import { NextResponse } from "next/server";
import { submitEvent } from "@/app/services/events";
import { getTenantId } from "@/app/services/tenant";
import { checkRateLimit } from "@/app/services/rate-limit";
import { extractTenantId, respondMissingTenantId } from "@/app/api/_utils/tenant";

export async function POST(req: Request) {
  try {
    const { tenantId: extractedTenantId, sources } = await extractTenantId(
      req,
      "/app/api/plugin/submit-event",
    );

    let data: any;
    if (sources.parsedBody && typeof sources.parsedBody === "object") {
      data = sources.parsedBody;
    } else {
      try {
        data = await req.json();
      } catch (parseError) {
        console.error("Failed to parse request body:", parseError);
        return NextResponse.json(
          { error: "Invalid JSON in request body", message: "Request body must be valid JSON" },
          { status: 400 },
        );
      }
    }

    const { userId, apiKey, tenantId: tenantIdParam, ...eventData } = data ?? {};

    const apiKeyFromHeader = req.headers.get("x-api-key");
    const apiKeyToUse = apiKey || apiKeyFromHeader;

    const tenantId = getTenantId(apiKeyToUse || undefined, extractedTenantId || tenantIdParam || undefined);

    if (!tenantId) {
      const traceSources = { ...sources, apiKey: apiKeyToUse ?? null };
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

    if (eventData?.consentGiven === false) {
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

    const creator =
      eventData?.creator && typeof eventData.creator === "object"
        ? {
            uid:
              typeof eventData.creator.uid === "string" && eventData.creator.uid.trim().length > 0
                ? eventData.creator.uid.trim()
                : userId,
            name:
              typeof eventData.creator.name === "string" && eventData.creator.name.trim().length > 0
                ? eventData.creator.name.trim()
                : undefined,
            profileImageUrl:
              typeof eventData.creator.profileImageUrl === "string" && eventData.creator.profileImageUrl.trim().length > 0
                ? eventData.creator.profileImageUrl.trim()
                : undefined,
          }
        : {
            uid: userId,
            name:
              typeof eventData?.creatorName === "string" && eventData.creatorName.trim().length > 0
                ? eventData.creatorName.trim()
                : undefined,
            profileImageUrl:
              typeof eventData?.creatorProfileImageUrl === "string" && eventData.creatorProfileImageUrl.trim().length > 0
                ? eventData.creatorProfileImageUrl.trim()
                : undefined,
          };

    const event = {
      ...eventData,
      createdBy: userId,
      creator,
      consentGiven: eventData?.consentGiven ?? true,
    };

    if (!event.title || !event.description || !event.location) {
      return NextResponse.json(
        { error: "Missing required fields", message: "Title, description, and location are required" },
        { status: 400 },
      );
    }

    if (!event.location.lat || !event.location.lng) {
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
    console.log("submitEvent succeeded:", { id });
    return NextResponse.json({ success: true, id, ...rest });
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
