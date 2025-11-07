import { NextResponse } from "next/server";
import { updateEvent } from "@/app/services/events";
import { getTenantId } from "@/app/services/tenant";
import { checkRateLimit } from "@/app/services/rate-limit";

export async function PATCH(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const body = await req.json();
    
    const { id, eventId, updates, userId, apiKey, tenantId: tenantIdParam } = body;
    const actualId = id || eventId;
    
    // Extract API key from query params or headers
    const apiKeyFromQuery = searchParams.get("apiKey");
    const apiKeyFromHeader = req.headers.get("x-api-key");
    const apiKeyToUse = apiKey || apiKeyFromQuery || apiKeyFromHeader;
    
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
    
    if (!actualId) {
      return NextResponse.json({ error: "Missing event ID" }, { status: 400 });
    }
    
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required", message: "User ID is required" },
        { status: 401 }
      );
    }
    
    await updateEvent(actualId, updates, tenantId);
    return NextResponse.json({ success: true, message: "Event updated successfully" });
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
      { error: "Failed to update event", message: err.message },
      { status: 500 }
    );
  }
}
