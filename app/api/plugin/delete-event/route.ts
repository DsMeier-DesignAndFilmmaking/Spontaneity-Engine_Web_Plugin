import { NextResponse } from "next/server";
import { deleteEvent } from "@/app/services/events";
import { getTenantId } from "@/app/services/tenant";
import { checkRateLimit } from "@/app/services/rate-limit";

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id") || searchParams.get("eventId");
    let userId = searchParams.get("userId");
    let apiKey = searchParams.get("apiKey");
    let tenantIdParam = searchParams.get("tenantId");
    
    // If not in query params, try JSON body
    if (!id || !userId) {
      try {
        const body = await req.json();
        id = id || body.id || body.eventId;
        userId = userId || body.userId;
        apiKey = apiKey || body.apiKey;
        tenantIdParam = tenantIdParam || body.tenantId;
      } catch {
        // Body parsing failed
      }
    }

    // Extract API key from headers if not in params
    const apiKeyFromHeader = req.headers.get("x-api-key");
    const apiKeyToUse = apiKey || apiKeyFromHeader;
    
    // Get tenantId from API key or direct parameter (server-side validation)
    const tenantId = getTenantId(apiKeyToUse || undefined, tenantIdParam || undefined);
    
    if (!tenantId) {
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

    if (!id) {
      return NextResponse.json({ error: "Missing event ID" }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required", message: "User ID is required" },
        { status: 401 }
      );
    }
    
    await deleteEvent(id, tenantId);
    return NextResponse.json({ success: true, message: "Event deleted successfully" });
  } catch (err: any) {
    console.error(err);
    
    // Handle specific errors
    if (err.message?.includes("Unauthorized") || err.message?.includes("Tenant mismatch")) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err.message?.includes("not found")) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    
    return NextResponse.json(
      { error: "Failed to delete event", message: err.message },
      { status: 500 }
    );
  }
}
