import { NextResponse } from "next/server";
import {
  extractTenantIdFromRequest,
  type TenantExtractionResult,
  type TenantExtractionSources,
} from "@/app/services/tenant";

export async function extractTenantId(
  req: Request,
  context: string,
): Promise<{ tenantId?: string; sources: TenantExtractionSources; parsedBody?: unknown }> {
  const extraction: TenantExtractionResult = await extractTenantIdFromRequest(req);

  console.log("[TRACE tenantId]", context, extraction.sources);

  if (!extraction.tenantId) {
    console.warn(`[tenantId missing] in ${context}`);
  }

  return {
    tenantId: extraction.tenantId,
    sources: extraction.sources,
    parsedBody: extraction.parsedBody,
  };
}

export function respondMissingTenantId(context: string, sources: TenantExtractionSources) {
  console.warn(`[tenantId guard] Rejecting request in ${context}`, sources);
  return NextResponse.json(
    {
      error: "Missing tenantId",
      message: "A valid tenantId (or API key that maps to one) is required for this request.",
      sources,
    },
    { status: 400 },
  );
}
