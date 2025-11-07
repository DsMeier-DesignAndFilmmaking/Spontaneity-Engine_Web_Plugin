import { z } from "zod";
import type { UserPreferences } from "@/types/settings";

const isoTimeRegex = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?(\.\d+)?(Z|[+-][01]\d:[0-5]\d)?$/;

const timeString = z.string().regex(isoTimeRegex, {
  message: "Time values must be ISO-8601 compliant",
});

export const timeWindowSchema = z
  .object({
    from: timeString.optional(),
    to: timeString.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.from === undefined && value.to === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one of 'from' or 'to' must be provided",
        path: ["from"],
      });
    }
  });

export const userPreferencesSchema = z
  .object({
    userId: z.string().min(1, "userId is required"),
    displayName: z.string().min(1).optional(),
    photoUrl: z.string().url().optional(),
    interests: z.array(z.string().min(1)).default([]),
    spontaneity: z.enum(["low", "medium", "high"]),
    matchStrictness: z.enum(["strict", "flexible"]),
    autoJoin: z.boolean(),
    locationSharing: z.enum(["off", "nearby", "live"]),
    radiusKm: z
      .number({ invalid_type_error: "radiusKm must be a number" })
      .min(1, "radiusKm must be at least 1")
      .max(50, "radiusKm must be at most 50"),
    transportPreference: z.enum(["walking", "transit", "rideshare", "driving", "bike"]),
    defaultNavProvider: z.string().min(1).optional(),
    offlineMaps: z.boolean().optional(),
    whoCanInvite: z.enum(["anyone", "contacts", "followers", "off"]),
    profileVisibility: z.enum(["full", "anonymous", "pseudonym"]),
    safetyMode: z.enum(["off", "standard", "high"]),
    accessibilityNeeds: z.array(z.string().min(1)).default([]),
    budget: z.union([
      z.enum(["free", "$", "$$", "$$$"] as const),
      z
        .object({
          maxCents: z
            .number({ invalid_type_error: "maxCents must be a number" })
            .int("maxCents must be an integer")
            .min(0, "maxCents must be positive"),
        })
        .strict(),
    ]),
    timeAvailability: z.union([timeWindowSchema, z.literal("now")]),
    aiPersona: z.enum(["conservative", "friendly", "adventurous", "minimal"]),
    showReasoning: z.boolean(),
    analyticsOptIn: z.boolean(),
    dndSchedule: z
      .array(
        z
          .object({
            day: z
              .number({ invalid_type_error: "day must be a number" })
              .int("day must be an integer")
              .min(0, "day must be between 0 and 6")
              .max(6, "day must be between 0 and 6"),
            from: timeString,
            to: timeString,
          })
          .strict()
      )
      .optional(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export type UserPreferencesInput = z.infer<typeof userPreferencesSchema>;

export function validateUserPreferences(payload: unknown): UserPreferences {
  return userPreferencesSchema.parse(payload) as UserPreferences;
}

export function validatePartialPreferences(
  partial: Partial<UserPreferences>
): Partial<UserPreferences> {
  const partialSchema = userPreferencesSchema.partial();
  return partialSchema.parse(partial);
}
