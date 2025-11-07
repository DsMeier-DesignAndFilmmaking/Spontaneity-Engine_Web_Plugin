import { NextResponse } from "next/server";
import { submitEvent } from "@/app/services/events";
import { getTenantId } from "@/app/services/tenant";
import { checkRateLimit } from "@/app/services/rate-limit";

export async function POST(req: Request) {
  try {
    let data;
    try {
      data = await req.json();
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON in request body", message: "Request body must be valid JSON" },
        { status: 400 }
      );
    }

    const { userId, apiKey, tenantId: tenantIdParam, ...eventData } = data;
    
    // Extract API key from body or headers
    const apiKeyFromHeader = req.headers.get("x-api-key");
    const apiKeyToUse = apiKey || apiKeyFromHeader;
    
    // Get tenantId from API key or direct parameter (server-side validation)
    const tenantId = getTenantId(apiKeyToUse || undefined, tenantIdParam || undefined);
    
    if (!tenantId) {
      console.error("Authentication failed:", { apiKey: apiKeyToUse ? "provided" : "missing", tenantIdParam });
      return NextResponse.json(
        { error: "Authentication required", message: "Valid API key or tenantId is required" },
        { status: 401 }
      );
    }

    // Rate limiting: Check request limit
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
        }
      );
    }

    // GDPR: Validate consent if provided
    if (eventData.consentGiven === false) {
      return NextResponse.json(
        { error: "Consent required", message: "User consent is required for data processing" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required", message: "User ID is required" },
        { status: 401 }
      );
    }
    
    // Prepare event with userId as createdBy and tenantId
    // Include consent flag for GDPR compliance
    const creator =
      eventData.creator && typeof eventData.creator === "object"
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
              typeof eventData.creatorName === "string" && eventData.creatorName.trim().length > 0
                ? eventData.creatorName.trim()
                : undefined,
            profileImageUrl:
              typeof eventData.creatorProfileImageUrl === "string" && eventData.creatorProfileImageUrl.trim().length > 0
                ? eventData.creatorProfileImageUrl.trim()
                : undefined,
          };

    const event = {
      ...eventData,
      createdBy: userId,
      creator,
      consentGiven: eventData.consentGiven ?? true, // Default to true if not provided
    };

    // Validate required fields
    if (!event.title || !event.description || !event.location) {
      return NextResponse.json(
        { error: "Missing required fields", message: "Title, description, and location are required" },
        { status: 400 }
      );
    }

    // Validate location structure
    if (!event.location.lat || !event.location.lng) {
      return NextResponse.json(
        { error: "Invalid location", message: "Location must have both lat and lng" },
        { status: 400 }
      );
    }
    
    console.log("Submitting event with:", {
      tenantId,
      title: event.title,
      hasLocation: !!event.location,
      hasUserId: !!userId,
    });

    console.log("Calling submitEvent with:", { tenantId, hasTitle: !!event.title });
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
    
    // Ensure we always return a valid JSON response
    const errorMessage =
      (errorLike.message && errorLike.message.length > 0)
        ? errorLike.message
        : (typeof err === "string" && err.length > 0 ? err : "An unexpected error occurred");
    const errorCode = errorLike.code || "unknown";
    
    const statusCode = errorMessage.includes("required") || errorMessage.includes("Authentication") 
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
    
    // Add debug details in development
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
