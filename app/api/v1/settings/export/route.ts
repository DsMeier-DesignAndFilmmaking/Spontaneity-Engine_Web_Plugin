import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { ZodError } from "zod";
import { getUserFromReq, UnauthorizedError } from "@/lib/server-auth";
import {
  createSettingsExport,
  getSettings,
  saveSettings,
} from "@/lib/settings-store";
import { createDefaultPreferences } from "@/lib/default-preferences";
import {
  ensureDefaultFlags,
  getFeatureFlagSnapshot,
  isFeatureEnabled,
  enforcePreferenceFlags,
} from "@/lib/feature-flags";

function handleError(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Invalid payload", details: error.errors }, { status: 400 });
  }

  console.error("Settings export error", error);
  return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getUserFromReq(req);
    await ensureDefaultFlags();
    if (!(await isFeatureEnabled("settings_ui_enabled"))) {
      return NextResponse.json({ error: "Settings unavailable" }, { status: 404 });
    }
    const flags = await getFeatureFlagSnapshot();

    const prefs = enforcePreferenceFlags(
      (await getSettings(user.id)) ??
        createDefaultPreferences(user.id, {
          displayName: user.name,
        }),
      flags
    );

    const archive = {
      userId: user.id,
      exportedAt: new Date().toISOString(),
      preferences: prefs,
    } as const;

    const record = await createSettingsExport(user.id, archive as unknown as Record<string, unknown>);

    console.info(
      `Export ready for ${user.id}. Email link: /api/v1/settings/export/${record.downloadToken}`
    );

    return NextResponse.json(
      {
        jobId: record.id,
        downloadUrl: `/api/v1/settings/export/${record.downloadToken}`,
        status: "completed",
        message: "Export ready. We have emailed you a download link.",
      },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
}
