import { NextResponse } from "next/server";
import { deleteEvent } from "@/app/services/events";
import { getTenantId } from "@/app/services/tenant";
import { checkRateLimit } from "@/app/services/rate-limit";
import { extractTenantId, respondMissingTenantId } from "@/app/api/_utils/tenant";

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const eventId = url.searchParams.get("eventId");
    const userId = url.searchParams.get("userId");
    const apiKeyFromQuery = url.searchParams.get("apiKey");
    const apiKeyFromHeader = req.headers.get("x-api-key");

    const { tenantId: extractedTenantId, sources } = await extractTenantId(
      req,
      "/app/api/plugin/delete-event",
    );

    const tenantId = getTenantId(apiKeyFromQuery || apiKeyFromHeader || undefined, extractedTenantId || undefined);

    if (!tenantId) {
      const traceSources = { ...sources, apiKey: apiKeyFromQuery ?? apiKeyFromHeader ?? null };
      return respondMissingTenantId("/app/api/plugin/delete-event", traceSources);
    }

    if (!eventId) {
      return NextResponse.json(
        { error: "Invalid eventId", message: "eventId query parameter is required" },
        { status: 400 },
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required", message: "userId query parameter is required" },
        { status: 401 },
      );
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

    await deleteEvent(eventId, tenantId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("=== DELETE EVENT ERROR ===", err);
    const message = err instanceof Error ? err.message : "Failed to delete event";
    const status = message.toLowerCase().includes("permission") ? 403 : 500;
    return NextResponse.json({ error: "Failed to delete event", message }, { status });
  }
}
