import { test } from "node:test";
import assert from "node:assert/strict";
import { ZodError } from "zod";

import {
  userPreferencesSchema,
  validateUserPreferences,
  validatePartialPreferences,
} from "../validation/settings-schema";
import type { UserPreferences } from "@/types/settings";

const basePreferences: UserPreferences = {
  userId: "validation-user",
  displayName: "Sky",
  photoUrl: "https://example.com/avatar.png",
  interests: ["coffee", "sunsets"],
  spontaneity: "medium",
  matchStrictness: "flexible",
  autoJoin: false,
  locationSharing: "nearby",
  radiusKm: 8,
  transportPreference: "walking",
  defaultNavProvider: "mapbox",
  offlineMaps: false,
  whoCanInvite: "contacts",
  profileVisibility: "pseudonym",
  safetyMode: "standard",
  accessibilityNeeds: [],
  budget: "$",
  timeAvailability: { from: "08:00", to: "21:00" },
  aiPersona: "friendly",
  showReasoning: false,
  analyticsOptIn: true,
  dndSchedule: [{ day: 0, from: "22:00", to: "07:00" }],
  updatedAt: new Date().toISOString(),
};

test("userPreferencesSchema accepts valid payload", () => {
  const parsed = userPreferencesSchema.parse(basePreferences);
  assert.equal(parsed.userId, basePreferences.userId);
  assert.equal(parsed.radiusKm, basePreferences.radiusKm);
});

test("validateUserPreferences rejects radius outside bounds", () => {
  assert.throws(
    () => validateUserPreferences({ ...basePreferences, radiusKm: 99 }),
    (error: unknown) => error instanceof ZodError && error.errors.some((issue) => issue.path.includes("radiusKm"))
  );
});

test("timeAvailability requires ISO time strings", () => {
  assert.throws(
    () =>
      validateUserPreferences({
        ...basePreferences,
        timeAvailability: { from: "morning", to: "night" },
      }),
    (error: unknown) => error instanceof ZodError && error.errors.some((issue) => issue.path.includes("from"))
  );
});

test("validatePartialPreferences rejects unknown properties", () => {
  assert.throws(() => validatePartialPreferences({ radiusKm: 10, unexpected: true } as any), ZodError);
});

test("validatePartialPreferences accepts time window updates", () => {
  const partial = validatePartialPreferences({ timeAvailability: { from: "09:00", to: "18:00" } });
  assert.equal(partial.timeAvailability?.from, "09:00");
});
