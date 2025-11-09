import { NextResponse } from "next/server";
import { deleteEvent } from "@/app/services/events";
import { getTenantId } from "@/app/services/tenant";
import { checkRateLimit } from "@/app/services/rate-limit";
import { extractTenantId, respondMissingTenantId } from "@/app/api/_utils/tenant";

export async function DELETE(req: Request) {
  try {
    const { tenantId: extractedTenantId, sources, parsedBody } = await extractTenantId(
      req,
      "/app/api/plugin/delete-event",
    );

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");
    const userId = searchParams.get("userId");
    const tenantIdQuery = searchParams.get("tenantId");
    const apiKeyQuery = searchParams.get("apiKey");

    let bodyTenantId: string | null = null;
    let bodyApiKey: string | null = null;
    if (parsedBody && typeof parsedBody === "object") {
      const bodyRecord = parsedBody as Record<string, unknown>;
      if (typeof bodyRecord.tenantId === "string" && bodyRecord.tenantId.trim().length > 0) {
        bodyTenantId = bodyRecord.tenantId.trim();
      }
      if (typeof bodyRecord.apiKey === "string" && bodyRecord.apiKey.trim().length > 0) {
        bodyApiKey = bodyRecord.apiKey.trim();
      }
    }

    const apiKeyCandidate =
      apiKeyQuery ??
      bodyApiKey ??
      sources.bodyApiKey ??
      sources.queryApiKey ??
      sources.headerApiKey ??
      null;

    const tenantIdCandidate =
      extractedTenantId ??
      tenantIdQuery ??
      bodyTenantId ??
      sources.bodyTenantId ??
      sources.queryTenantId ??
      sources.headerTenantId ??
      undefined;

    const tenantId = getTenantId(apiKeyCandidate || undefined, tenantIdCandidate || undefined) ?? undefined;

    if (!eventId || !userId) {
      return NextResponse.json(
        { error: "Invalid request", message: "eventId and userId are required" },
        { status: 400 },
      );
    }

    if (!tenantId) {
      const traceSources = { ...sources, apiKey: apiKeyCandidate, tenantIdCandidate: tenantIdCandidate ?? null };
      return respondMissingTenantId("/app/api/plugin/delete-event", traceSources);
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
    return NextResponse.json({ success: true, tenantId });
  } catch (err) {
    console.error("=== DELETE EVENT ERROR ===", err);
    const message = err instanceof Error ? err.message : "Failed to delete event";
    return NextResponse.json({ error: "Failed to delete event", message }, { status: 500 });
  }
}
