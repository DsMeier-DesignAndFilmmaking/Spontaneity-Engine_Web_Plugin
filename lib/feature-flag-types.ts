import type { UserPreferences } from "@/types/settings";

export type FeatureFlagKey = "settings_ui_enabled" | "auto_join_v1" | "live_location";

export type FeatureFlagSnapshot = Record<
  FeatureFlagKey,
  { enabled: boolean; payload: Record<string, unknown> | null }
>;

export function enforcePreferenceFlags<T extends UserPreferences>(
  prefs: T,
  snapshot: FeatureFlagSnapshot
): T {
  const clone = { ...prefs } as T;

  if (!snapshot.auto_join_v1?.enabled) {
    clone.autoJoin = false;
  }

  if (!snapshot.live_location?.enabled) {
    clone.locationSharing = "off";
  }

  return clone;
}
