import { NextResponse } from "next/server";
import { updateEvent } from "@/app/services/events";
import { getTenantId } from "@/app/services/tenant";
import { checkRateLimit } from "@/app/services/rate-limit";
import { extractTenantId, respondMissingTenantId } from "@/app/api/_utils/tenant";

export async function PATCH(req: Request) {
  try {
    const { tenantId: extractedTenantId, sources } = await extractTenantId(
      req,
      "/app/api/plugin/update-event",
    );

    let payload: any;
    if (sources.parsedBody && typeof sources.parsedBody === "object") {
      payload = sources.parsedBody;
    } else {
      try {
        payload = await req.json();
      } catch (parseError) {
        console.error("Failed to parse request body:", parseError);
        return NextResponse.json(
          { error: "Invalid JSON in request body", message: "Request body must be valid JSON" },
          { status: 400 },
        );
      }
    }

    const { eventId, updates, userId, apiKey, tenantId: tenantIdParam } = payload ?? {};

    if (!eventId || typeof eventId !== "string") {
      return NextResponse.json(
        { error: "Invalid eventId", message: "eventId must be provided" },
        { status: 400 },
      );
    }

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "Authentication required", message: "User ID is required" },
        { status: 401 },
      );
    }

    if (!updates || typeof updates !== "object") {
      return NextResponse.json(
        { error: "Invalid updates", message: "Updates must be an object" },
        { status: 400 },
      );
    }

    const apiKeyFromHeader = req.headers.get("x-api-key");
    const apiKeyToUse = apiKey || apiKeyFromHeader;

    const tenantId = getTenantId(apiKeyToUse || undefined, extractedTenantId || tenantIdParam || undefined);

    if (!tenantId) {
      const traceSources = { ...sources, apiKey: apiKeyToUse ?? null };
      return respondMissingTenantId("/app/api/plugin/update-event", traceSources);
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

    await updateEvent(eventId, updates, tenantId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("=== UPDATE EVENT ERROR ===", err);
    const message = err instanceof Error ? err.message : "Failed to update event";
    const status = message.toLowerCase().includes("permission") ? 403 : 500;
    return NextResponse.json({ error: "Failed to update event", message }, { status });
  }
}



