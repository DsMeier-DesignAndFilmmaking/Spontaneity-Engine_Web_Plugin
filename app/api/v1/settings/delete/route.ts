import { NextRequest, NextResponse } from "next/server";
import { addDays } from "date-fns";
import { randomUUID } from "crypto";
import { getUserFromReq, UnauthorizedError } from "@/lib/server-auth";
import {
  scheduleSettingsDeletion,
  getSettings,
  saveSettings,
} from "@/lib/settings-store";
import { createDefaultPreferences } from "@/lib/default-preferences";
import {
  ensureDefaultFlags,
  getFeatureFlagSnapshot,
  enforcePreferenceFlags,
  isFeatureEnabled,
} from "@/lib/feature-flags";
import type { UserPreferences } from "@/types/settings";

function handleError(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("Settings deletion error", error);
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

    const scheduledFor = addDays(new Date(), 7);
    const job = await scheduleSettingsDeletion(user.id, scheduledFor);

    const currentPrefs = enforcePreferenceFlags(
      (await getSettings(user.id)) ??
        createDefaultPreferences(user.id, {
          displayName: user.name,
        }),
      flags
    );

    const sanitized = {
      ...currentPrefs,
      locationSharing: "off" as const,
      updatedAt: new Date().toISOString(),
    } as UserPreferences;

    await saveSettings(user.id, sanitized, { previous: currentPrefs });

    console.info(
      `Deletion scheduled for ${user.id} on ${scheduledFor.toISOString()}`
    );

    return NextResponse.json(
      {
        jobId: job.id,
        status: "scheduled",
        scheduledFor: scheduledFor.toISOString(),
        message: "Account deletion scheduled. Location data will be purged once the window lapses.",
      },
      { status: 202 }
    );
  } catch (error) {
    return handleError(error);
  }
}
