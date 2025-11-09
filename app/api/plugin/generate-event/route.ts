import { NextResponse } from "next/server";
import { generateLocalAISuggestions } from "@/app/services/ai";
import { getTenantId } from "@/app/services/tenant";
import { extractTenantId, respondMissingTenantId } from "@/app/api/_utils/tenant";

export async function POST(req: Request) {
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

    if (!tenantId) {
      const traceSources = { ...sources, apiKey: apiKeyCandidate };
      return respondMissingTenantId("/app/api/plugin/generate-event", traceSources);
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
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(err);
    return NextResponse.json({ error: "Failed to generate AI event", message }, { status: 500 });
  }
}
