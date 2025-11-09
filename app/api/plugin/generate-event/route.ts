import { NextResponse } from "next/server";
import { generateLocalAISuggestions } from "@/app/services/ai";
import { getTenantId } from "@/app/services/tenant";
import { extractTenantId, respondMissingTenantId } from "@/app/api/_utils/tenant";

const RATE_LIMIT_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_KEY = "__openaiRateLimitUntil";

function isOpenAiRateLimited(): boolean {
  const until = (globalThis as Record<string, unknown>)[RATE_LIMIT_KEY];
  return typeof until === "number" && Date.now() < until;
}

function setOpenAiRateLimited() {
  (globalThis as Record<string, unknown>)[RATE_LIMIT_KEY] = Date.now() + RATE_LIMIT_COOLDOWN_MS;
}

export async function POST(req: Request) {
  let tenantIdForResponse: string | undefined;

  try {
    const { tenantId: extractedTenantId, sources, parsedBody } = await extractTenantId(
      req,
      "/app/api/plugin/generate-event",
    );

    let payload: Record<string, unknown>;
    if (parsedBody && typeof parsedBody === "object") {
      payload = parsedBody as Record<string, unknown>;
    } else {
      const body = await req.json().catch(() => ({}));
      payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    }

    const rawLocation = payload.location;
    let locationString: string | null = null;
    let coordinates: { lat: number; lng: number } | null = null;

    if (typeof rawLocation === "string") {
      const trimmed = rawLocation.trim();
      if (trimmed.length > 0) {
        locationString = trimmed;
      }
    } else if (
      rawLocation &&
      typeof rawLocation === "object" &&
      typeof (rawLocation as { lat?: unknown }).lat === "number" &&
      typeof (rawLocation as { lng?: unknown }).lng === "number"
    ) {
      const lat = (rawLocation as { lat: number }).lat;
      const lng = (rawLocation as { lng: number }).lng;
      coordinates = { lat, lng };
      locationString = `${lat}, ${lng}`;
    }

    const tenantIdParam =
      typeof payload.tenantId === "string" && payload.tenantId.trim().length > 0 ? payload.tenantId.trim() : undefined;
    const apiKeyParam =
      typeof payload.apiKey === "string" && payload.apiKey.trim().length > 0 ? payload.apiKey.trim() : undefined;

    const apiKeyCandidate =
      (typeof apiKeyParam === "string" && apiKeyParam.trim().length > 0 ? apiKeyParam.trim() : null) ??
      sources.bodyApiKey ??
      sources.queryApiKey ??
      sources.headerApiKey ??
      null;

    const tenantId =
      extractedTenantId ??
      getTenantId(apiKeyCandidate || undefined, tenantIdParam ?? undefined) ??
      undefined;

    tenantIdForResponse = tenantId;

    if (!tenantId) {
      const traceSources = { ...sources, apiKey: apiKeyCandidate };
      return respondMissingTenantId("/app/api/plugin/generate-event", traceSources);
    }

    if (isOpenAiRateLimited()) {
      console.warn("[Spontaneous Generate] OpenAI rate limit previously reached – skipping call.");
      return NextResponse.json({ suggestion: null, tenantId, rateLimited: true }, { status: 200 });
    }

    const suggestions = await generateLocalAISuggestions({
      location: locationString ?? "New York",
      tenantId,
      coordinates: coordinates ?? undefined,
      allowStaticFallback: false,
    });
    if (!suggestions.length) {
      throw new Error("No AI suggestions generated");
    }
    return NextResponse.json({ suggestion: suggestions[0], tenantId });
  } catch (error) {
    const status =
      typeof (error as { status?: number }).status === "number"
        ? (error as { status?: number }).status
        : typeof (error as { code?: number }).code === "number"
        ? (error as { code?: number }).code
        : 500;

    const message =
      (error as { error?: { message?: string } })?.error?.message ??
      (error as { message?: string })?.message ??
      "Failed to generate AI event";

    if (status === 429) {
      setOpenAiRateLimited();
      console.warn("[Spontaneous Generate] OpenAI rate limit reached.", message);
      return NextResponse.json(
        { suggestion: null, tenantId: tenantIdForResponse ?? null, rateLimited: true, message },
        { status: 200 },
      );
    }

    console.error("[Spontaneous Generate] OpenAI request failed:", { status, error });

    return new Response(
      JSON.stringify({ error: "Failed to generate AI event", message }),
      {
        status: status === 0 ? 500 : status,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
