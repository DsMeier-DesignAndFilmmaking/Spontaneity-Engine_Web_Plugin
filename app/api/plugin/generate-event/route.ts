import { NextResponse } from "next/server";
import { generateLocalAISuggestions } from "@/app/services/ai";
import { extractTenantId, respondMissingTenantId } from "@/app/api/_utils/tenant";

export async function POST(req: Request) {
  try {
    const { tenantId, sources } = await extractTenantId(req, "/app/api/plugin/generate-event");

    if (!tenantId) {
      return respondMissingTenantId("/app/api/plugin/generate-event", sources);
    }

    const body = sources.parsedBody && typeof sources.parsedBody === "object" ? sources.parsedBody : await req.json();
    const { location } = body ?? {};
    const suggestions = await generateLocalAISuggestions({
      location: location || "New York",
      tenantId,
      allowStaticFallback: false,
    });
    if (!suggestions.length) {
      throw new Error("No AI suggestions generated");
    }
    return NextResponse.json(suggestions[0]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(err);
    return NextResponse.json({ error: "Failed to generate AI event", message }, { status: 500 });
  }
}
