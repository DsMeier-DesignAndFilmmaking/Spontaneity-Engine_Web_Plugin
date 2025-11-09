import { NextResponse } from "next/server";
import {
  extractTenantIdFromRequest,
  type TenantExtractionResult,
} from "@/app/services/tenant";

export type TenantTraceSources = TenantExtractionResult & {
  apiKey?: string | null;
};

export async function extractTenantId(req: Request, context: string): Promise<{
  tenantId?: string;
  sources: TenantTraceSources;
}> {
  const extraction = await extractTenantIdFromRequest(req);

  if (!extraction.tenantId) {
    console.warn(`[tenantId missing] ${context}`, extraction);
  }

  return {
    tenantId: extraction.tenantId,
    sources: extraction,
  };
}

export function respondMissingTenantId(context: string, sources: TenantTraceSources) {
  console.warn(`[tenantId guard] Missing tenantId in ${context}`, sources);
  return NextResponse.json(
    {
      error: "Missing tenantId",
      context,
      sources,
    },
    { status: 400 },
  );
}
