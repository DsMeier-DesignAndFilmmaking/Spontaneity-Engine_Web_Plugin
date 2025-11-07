import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { getUserFromReq, UnauthorizedError } from "@/lib/server-auth";
import {
  ensureDefaultFlags,
  getFeatureFlagSnapshot,
  setFeatureFlag,
  type FeatureFlagKey,
} from "@/lib/feature-flags";

const updateSchema = z.object({
  key: z.union([
    z.literal("settings_ui_enabled"),
    z.literal("auto_join_v1"),
    z.literal("live_location"),
  ]),
  enabled: z.boolean(),
  payload: z.record(z.any()).nullish(),
});

function handleError(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Invalid request payload", details: error.errors }, { status: 400 });
  }
  console.error("Feature flag API error", error);
  return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await getUserFromReq(req);
    await ensureDefaultFlags();
    const snapshot = await getFeatureFlagSnapshot();
    return NextResponse.json({ data: snapshot }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    await getUserFromReq(req);
    await ensureDefaultFlags();
    const body = await req.json();
    const payload = updateSchema.parse(body);
    await setFeatureFlag(payload.key as FeatureFlagKey, payload.enabled, payload.payload ?? null);
    const snapshot = await getFeatureFlagSnapshot();
    return NextResponse.json({ data: snapshot }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
