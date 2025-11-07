import { test } from "node:test";
import assert from "node:assert/strict";
import { ZodError } from "zod";
import { validateUserPreferences } from "../validation/settings-schema";
import type { UserPreferences } from "@/types/settings";

const basePayload: UserPreferences = {
  userId: "user-123",
  displayName: "Jamie",
  photoUrl: "https://example.com/avatar.png",
  interests: ["coffee", "live music"],
  spontaneity: "medium",
  matchStrictness: "flexible",
  autoJoin: false,
  locationSharing: "nearby",
  radiusKm: 5,
  transportPreference: "walking",
  defaultNavProvider: "mapbox",
  offlineMaps: true,
  whoCanInvite: "contacts",
  profileVisibility: "pseudonym",
  safetyMode: "standard",
  accessibilityNeeds: ["wheelchair"],
  budget: "$$",
  timeAvailability: { from: "09:00", to: "18:00" },
  aiPersona: "friendly",
  showReasoning: true,
  analyticsOptIn: false,
  dndSchedule: [{ day: 0, from: "22:00", to: "07:00" }],
  updatedAt: new Date().toISOString(),
};

test("validateUserPreferences rejects radius outside bounds", () => {
  const invalid = { ...basePayload, radiusKm: 100 };

  assert.throws(
    () => validateUserPreferences(invalid),
    (error: unknown) => error instanceof ZodError && error.errors.some((issue) => issue.message.includes("radiusKm"))
  );
});

test("validateUserPreferences rejects unknown AI persona", () => {
  const invalid = { ...basePayload, aiPersona: "chaotic" as never };

  assert.throws(
    () => validateUserPreferences(invalid),
    (error: unknown) => error instanceof ZodError && error.errors.some((issue) => issue.message.includes("Invalid enum value"))
  );
});
