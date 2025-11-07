import type { UserPreferences } from "@/types/settings";

interface DefaultPreferenceOptions {
  displayName?: string;
  photoUrl?: string;
}

export function createDefaultPreferences(
  userId: string,
  options: DefaultPreferenceOptions = {}
): UserPreferences {
  const now = new Date().toISOString();
  return {
    userId,
    displayName: options.displayName,
    photoUrl: options.photoUrl,
    interests: [],
    spontaneity: "medium",
    matchStrictness: "flexible",
    autoJoin: false,
    locationSharing: "off",
    radiusKm: 5,
    transportPreference: "walking",
    defaultNavProvider: "mapbox",
    offlineMaps: false,
    whoCanInvite: "contacts",
    profileVisibility: "pseudonym",
    safetyMode: "standard",
    accessibilityNeeds: [],
    budget: "$",
    timeAvailability: "now",
    aiPersona: "friendly",
    showReasoning: false,
    analyticsOptIn: false,
    dndSchedule: [],
    updatedAt: now,
  };
}
