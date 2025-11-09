import { NextResponse } from "next/server";
import { updateEvent } from "@/app/services/events";
import { getTenantId } from "@/app/services/tenant";
import { checkRateLimit } from "@/app/services/rate-limit";
import { extractTenantId, respondMissingTenantId } from "@/app/api/_utils/tenant";

export async function PATCH(req: Request) {
  try {
    const { tenantId: extractedTenantId, sources, parsedBody } = await extractTenantId(
      req,
      "/app/api/plugin/update-event",
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

    const body = data as Record<string, unknown> & {
      eventId?: string;
      updates?: Record<string, unknown>;
      userId?: string;
      apiKey?: string;
      tenantId?: string;
    };

    const eventId = typeof body.eventId === "string" ? body.eventId : undefined;
    const updates = (body.updates && typeof body.updates === "object" ? body.updates : undefined) as
      | Record<string, unknown>
      | undefined;
    const userId = typeof body.userId === "string" ? body.userId : undefined;
    const apiKey = typeof body.apiKey === "string" ? body.apiKey : undefined;
    const tenantIdParam = typeof body.tenantId === "string" ? body.tenantId : undefined;

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
      return respondMissingTenantId("/app/api/plugin/update-event", traceSources);
    }

    if (!eventId) {
      return NextResponse.json(
        { error: "Invalid request", message: "eventId is required" },
        { status: 400 },
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required", message: "userId is required" },
        { status: 401 },
      );
    }

    if (!updates || typeof updates !== "object") {
      return NextResponse.json(
        { error: "Invalid updates", message: "updates payload is required" },
        { status: 400 },
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

    await updateEvent(eventId, updates, tenantId);

    return NextResponse.json({ success: true, tenantId });
  } catch (err) {
    console.error("=== UPDATE EVENT ERROR ===", err);
    const message = err instanceof Error ? err.message : "Failed to update event";
    return NextResponse.json({ error: "Failed to update event", message }, { status: 500 });
  }
}



