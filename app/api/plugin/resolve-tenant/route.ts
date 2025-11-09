import { NextResponse } from "next/server";
import { getTenantId } from "@/app/services/tenant";
import { extractTenantId, respondMissingTenantId } from "@/app/api/_utils/tenant";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { tenantId: extractedTenantId, sources } = await extractTenantId(
    req,
    "/app/api/plugin/resolve-tenant",
  );

  const url = new URL(req.url);
  const apiKeyQuery = url.searchParams.get("apiKey");

  const finalTenantId =
    extractedTenantId ??
    getTenantId(
      sources.bodyApiKey ?? sources.queryApiKey ?? sources.headerApiKey ?? apiKeyQuery ?? undefined,
      sources.bodyTenantId ?? sources.queryTenantId ?? sources.headerTenantId ?? sources.cookieTenantId ?? undefined,
    ) ??
    undefined;

  if (!finalTenantId) {
    return respondMissingTenantId("/app/api/plugin/resolve-tenant", {
      ...sources,
      queryApiKey: apiKeyQuery ?? sources.queryApiKey ?? null,
    });
  }

  return NextResponse.json(
    {
      tenantId: finalTenantId,
      sources,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function POST(req: Request) {
  return GET(req);
}

