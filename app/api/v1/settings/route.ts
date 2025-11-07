import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getUserFromReq, UnauthorizedError } from "@/lib/server-auth";
import {
  getSettings,
  saveSettings,
} from "@/lib/settings-store";
import { validateUserPreferences, validatePartialPreferences } from "@/lib/validation/settings-schema";
import { createDefaultPreferences } from "@/lib/default-preferences";
import {
  ensureDefaultFlags,
  enforcePreferenceFlags,
  getFeatureFlagSnapshot,
  isFeatureEnabled,
} from "@/lib/feature-flags";

function handleError(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Invalid settings payload",
        details: error.errors,
      },
      { status: 400 }
    );
  }

  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  console.error("Settings route error", error);
  return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getUserFromReq(req);
    await ensureDefaultFlags();
    const flags = await getFeatureFlagSnapshot();
    if (!(await isFeatureEnabled("settings_ui_enabled"))) {
      return NextResponse.json({ error: "Settings unavailable" }, { status: 404 });
    }
    const existing = await getSettings(user.id);

    if (!existing) {
      const defaults = createDefaultPreferences(user.id, {
        displayName: user.name,
      });
      const sanitized = enforcePreferenceFlags(defaults, flags);
      return NextResponse.json({ data: sanitized }, { status: 200 });
    }
    const sanitizedExisting = enforcePreferenceFlags(existing, flags);
    return NextResponse.json({ data: sanitizedExisting }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getUserFromReq(req);
    await ensureDefaultFlags();
    if (!(await isFeatureEnabled("settings_ui_enabled"))) {
      return NextResponse.json({ error: "Settings unavailable" }, { status: 404 });
    }
    const flags = await getFeatureFlagSnapshot();
    const previous = await getSettings(user.id);
    const body = await req.json();

    const payload = {
      ...body,
      userId: user.id,
      displayName: body?.displayName ?? user.name,
      updatedAt: new Date().toISOString(),
    };

    const validated = enforcePreferenceFlags(validateUserPreferences(payload), flags);
    const saved = await saveSettings(user.id, validated, { previous });
    return NextResponse.json({ data: saved }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getUserFromReq(req);
    await ensureDefaultFlags();
    if (!(await isFeatureEnabled("settings_ui_enabled"))) {
      return NextResponse.json({ error: "Settings unavailable" }, { status: 404 });
    }
    const flags = await getFeatureFlagSnapshot();
    const updates = await req.json();
    const sanitized = validatePartialPreferences(updates);

    const current = (await getSettings(user.id)) ?? createDefaultPreferences(user.id, {
      displayName: user.name,
    });

    const merged = {
      ...current,
      ...sanitized,
      userId: user.id,
      updatedAt: new Date().toISOString(),
    };

    const validated = enforcePreferenceFlags(validateUserPreferences(merged), flags);
    const saved = await saveSettings(user.id, validated, { previous: current });
    return NextResponse.json({ data: saved }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
