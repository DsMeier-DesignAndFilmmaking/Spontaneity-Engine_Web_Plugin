export type Spontaneity = "low" | "medium" | "high";

export type LocationSharing = "off" | "nearby" | "live";

export interface TimeWindow {
  from?: string; // ISO time or 'now'
  to?: string;
}

export interface UserPreferences {
  userId: string;
  displayName?: string;
  photoUrl?: string;
  interests: string[];
  spontaneity: Spontaneity;
  matchStrictness: "strict" | "flexible";
  autoJoin: boolean;
  locationSharing: LocationSharing;
  radiusKm: number;
  transportPreference: "walking" | "transit" | "rideshare" | "driving" | "bike";
  defaultNavProvider?: string;
  offlineMaps?: boolean;
  whoCanInvite: "anyone" | "contacts" | "followers" | "off";
  profileVisibility: "full" | "anonymous" | "pseudonym";
  safetyMode: "off" | "standard" | "high";
  accessibilityNeeds: string[];
  budget: "free" | "$" | "$$" | "$$$" | { maxCents: number };
  timeAvailability: TimeWindow | "now";
  aiPersona: "conservative" | "friendly" | "adventurous" | "minimal";
  showReasoning: boolean;
  analyticsOptIn: boolean;
  dndSchedule?: Array<{ day: number; from: string; to: string }>;
  updatedAt: string;
}
