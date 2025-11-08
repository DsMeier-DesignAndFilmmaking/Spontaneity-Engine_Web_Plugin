'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UserPreferences, Spontaneity, LocationSharing } from "@/types/settings";
import type { FeatureFlagSnapshot } from "@/lib/feature-flag-types";
import { enforcePreferenceFlags } from "@/lib/feature-flag-types";
import { useAuth } from "@/app/components/AuthContext";
import fetchWithAuth, { FetchWithAuthError } from "@/lib/fetchWithAuth";

const SPONTANEITY_SCALE: Spontaneity[] = ["low", "medium", "high"];
const RADIUS_PRESETS = [3, 5, 10];
const DEBOUNCE_MS = 300;

interface ToastState {
  message: string;
  tone: "success" | "error";
}

interface SectionProps {
  id: string;
  title: string;
  description?: string;
  defaultCollapsed?: boolean;
  children: React.ReactNode;
}

function Section({ id, title, description, defaultCollapsed = false, children }: SectionProps) {
  const [open, setOpen] = useState(!defaultCollapsed);
  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  return (
    <section
      aria-labelledby={`${id}-heading`}
      className="rounded-2xl border border-gray-200 bg-white/95 shadow-sm transition focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-200"
    >
      <header className="flex items-start justify-between gap-4 px-4 py-3 md:px-6 md:py-4">
        <div>
          <h2 id={`${id}-heading`} className="text-base font-semibold text-gray-900 md:text-lg">
            {title}
          </h2>
          {description ? (
            <p id={`${id}-desc`} className="mt-1 text-sm text-gray-600">
              {description}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={toggle}
          className="inline-flex items-center rounded-full border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 transition hover:border-gray-400 hover:text-gray-900 md:hidden"
          aria-expanded={open}
          aria-controls={`${id}-content`}
        >
          {open ? "Hide" : "Show"}
        </button>
      </header>
      <div
        id={`${id}-content`}
        className={`px-4 pb-4 md:px-6 md:pb-6 ${open ? "block" : "hidden md:block"}`}
        aria-describedby={description ? `${id}-desc` : undefined}
      >
        <div className="space-y-4 md:space-y-6">{children}</div>
      </div>
    </section>
  );
}

function Spinner() {
  return (
    <span className="inline-flex h-4 w-4 animate-spin items-center justify-center rounded-full border-2 border-blue-500 border-t-transparent" />
  );
}

function Toggle({
  label,
  helperId,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  helperId?: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        if (!disabled) {
          onChange();
        }
      }}
      disabled={disabled}
      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${
        disabled
          ? "border-gray-200 bg-gray-100 text-gray-400"
          : checked
          ? "border-blue-500 bg-blue-50"
          : "border-gray-200"
      }`}
      role="switch"
      aria-checked={checked}
      aria-describedby={helperId}
      aria-disabled={disabled}
    >
      <span className={`text-sm font-medium ${disabled ? "text-gray-400" : "text-gray-900"}`}>{label}</span>
      <span
        className={`inline-flex h-6 w-11 items-center rounded-full p-1 transition ${
          disabled ? "bg-gray-300" : checked ? "bg-blue-600" : "bg-gray-300"
        }`}
        aria-hidden="true"
      >
        <span
          className={`h-4 w-4 rounded-full bg-white shadow transition ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

interface DataPrivacyModalProps {
  open: boolean;
  onClose: () => void;
}

function DataPrivacyModal({ open, onClose }: DataPrivacyModalProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="data-privacy-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="data-privacy-title" className="text-lg font-semibold text-gray-900">
              Data & Privacy
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              How we handle your real-time location and personalization data.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:text-gray-900"
          >
            Close
          </button>
        </header>
        <div className="space-y-3 text-sm leading-relaxed text-gray-700">
          <p>
            We only request precise location when navigation is active. Nearby mode retains coarse coordinates for 30 minutes
            to surface spontaneous hang outs. Live mode stores detailed breadcrumbs for up to 4 hours, then redacts exact
            coordinates.
          </p>
          <p>
            You can revoke sharing at any time. We log consent changes and notify linked devices immediately. Export your
            settings data for a transparent audit trail or schedule automatic deletion from the Settings screen.
          </p>
          <p>
            Additional safeguards: multi-region encryption, limited analyst access, and contextual prompts when sharing data
            with travel companions.
          </p>
        </div>
      </div>
    </div>
  );
}

function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((state: ToastState) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast(state);
    timeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const Toast = useMemo(() => {
    if (!toast) return null;
    return (
      <div
        role="status"
        className={`pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-sm shadow-lg backdrop-blur ${
          toast.tone === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
        }`}
      >
        {toast.message}
      </div>
    );
  }, [toast]);

  return { toastNode: Toast, showToast } as const;
}

const DEFAULT_PREFERENCES = () => ({
  interests: [],
  spontaneity: "medium" as Spontaneity,
  matchStrictness: "flexible" as const,
  autoJoin: false,
  locationSharing: "off" as LocationSharing,
  radiusKm: 5,
  transportPreference: "walking" as const,
  defaultNavProvider: "mapbox",
  offlineMaps: false,
  whoCanInvite: "contacts" as const,
  profileVisibility: "pseudonym" as const,
  safetyMode: "standard" as const,
  accessibilityNeeds: [] as string[],
  budget: "$" as UserPreferences["budget"],
  timeAvailability: "now" as UserPreferences["timeAvailability"],
  aiPersona: "friendly" as const,
  showReasoning: false,
  analyticsOptIn: false,
  dndSchedule: [] as UserPreferences["dndSchedule"],
});

interface SettingsFormProps {
  featureFlags: FeatureFlagSnapshot;
}

export default function SettingsForm({ featureFlags }: SettingsFormProps) {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prefsRef = useRef<UserPreferences | null>(null);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const { toastNode, showToast } = useToast();
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const autoJoinEnabled = featureFlags.auto_join_v1?.enabled ?? false;
  const liveLocationEnabled = featureFlags.live_location?.enabled ?? false;

  useEffect(() => {
    prefsRef.current = preferences;
  }, [preferences]);

  useEffect(() => {
    let active = true;

    const loadPrefs = async () => {
      if (authLoading) {
        return;
      }

      if (!user) {
        if (active) {
          setPreferences(null);
          setLoading(false);
          setError("Please sign in to manage your settings.");
        }
        return;
      }

      try {
        setError(null);
        const json = await fetchWithAuth<{ data: UserPreferences }>("/api/v1/settings");
        if (active) {
          const sanitized = enforcePreferenceFlags(json.data, featureFlags);
          if (!autoJoinEnabled && sanitized.autoJoin) {
            sanitized.autoJoin = false;
          }
          if (!liveLocationEnabled && sanitized.locationSharing !== "off") {
            sanitized.locationSharing = "off";
          }
          setPreferences(sanitized);
        }
      } catch (err) {
        console.error(err);
        if (active) {
          if (err instanceof FetchWithAuthError && err.status === 401) {
            setError("Please sign in to manage your settings.");
          } else {
            const message = err instanceof FetchWithAuthError && err.payload && typeof err.payload === "object"
              ? (err.payload as { error?: string }).error
              : null;
            setError(message || "Failed to load settings. Please try again.");
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadPrefs();
    return () => {
      active = false;
      Object.values(debounceTimers.current).forEach((timer) => clearTimeout(timer));
    };
  }, [featureFlags, autoJoinEnabled, liveLocationEnabled, authLoading, user]);

  const sendPatch = useCallback(
    async (partial: Partial<UserPreferences>, rollbackSnapshot: UserPreferences) => {
      try {
        setSaving(true);
        setError(null);
        const json = await fetchWithAuth<{ data: UserPreferences }>("/api/v1/settings", {
          method: "PATCH",
          body: JSON.stringify(partial),
        });
        setPreferences(enforcePreferenceFlags(json.data, featureFlags));
        showToast({ message: "Settings saved", tone: "success" });
      } catch (err) {
        console.error(err);
        setPreferences(rollbackSnapshot);
        if (err instanceof FetchWithAuthError && err.status === 401) {
          setError("Please sign in to update your settings.");
        } else {
          setError(err instanceof Error ? err.message : "Unable to save changes");
        }
        showToast({ message: "Could not save", tone: "error" });
      } finally {
        setSaving(false);
      }
    },
    [featureFlags, showToast]
  );

  const applyChange = useCallback(
    (key: keyof UserPreferences, value: UserPreferences[typeof key], options?: { debounce?: boolean }) => {
      if (key === "autoJoin" && !autoJoinEnabled) return;
      if (key === "locationSharing" && !liveLocationEnabled && value !== "off") {
        value = "off" as UserPreferences["locationSharing"];
      }
      setPreferences((prev) => {
        if (!prev) return prev;
        const next = { ...prev, [key]: value, updatedAt: new Date().toISOString() } as UserPreferences;
        const snapshot = prefsRef.current ?? prev;

        if (options?.debounce) {
          if (debounceTimers.current[key as string]) {
            clearTimeout(debounceTimers.current[key as string]);
          }
          debounceTimers.current[key as string] = setTimeout(() => {
            sendPatch({ [key]: value }, snapshot);
          }, DEBOUNCE_MS);
        } else {
          void sendPatch({ [key]: value }, snapshot);
        }

        return next;
      });
    },
    [sendPatch, autoJoinEnabled, liveLocationEnabled]
  );

  const handleMultipleChanges = useCallback(
    (partial: Partial<UserPreferences>) => {
      const adjusted: Partial<UserPreferences> = { ...partial };
      if (!autoJoinEnabled && Object.prototype.hasOwnProperty.call(adjusted, "autoJoin")) {
        adjusted.autoJoin = false;
      }
      if (
        !liveLocationEnabled &&
        Object.prototype.hasOwnProperty.call(adjusted, "locationSharing") &&
        adjusted.locationSharing !== "off"
      ) {
        adjusted.locationSharing = "off";
      }
      setPreferences((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...adjusted, updatedAt: new Date().toISOString() } as UserPreferences;
        const snapshot = prefsRef.current ?? prev;
        void sendPatch(adjusted, snapshot);
        return next;
      });
    },
    [autoJoinEnabled, liveLocationEnabled, sendPatch]
  );

  const handleReset = useCallback(async () => {
    if (!preferences) return;
    const defaults = enforcePreferenceFlags({
      ...DEFAULT_PREFERENCES(),
      userId: preferences.userId,
      displayName: preferences.displayName,
      photoUrl: preferences.photoUrl,
      updatedAt: new Date().toISOString(),
    } as UserPreferences, featureFlags);

    const rollback = prefsRef.current ?? preferences;
    setPreferences(defaults);
    try {
      setSaving(true);
      const json = await fetchWithAuth<{ data: UserPreferences }>("/api/v1/settings", {
        method: "PUT",
        body: JSON.stringify(defaults),
      });
      setPreferences(enforcePreferenceFlags(json.data, featureFlags));
      showToast({ message: "Defaults restored", tone: "success" });
    } catch (err) {
      console.error(err);
      if (err instanceof FetchWithAuthError && err.status === 401) {
        setError("Please sign in to reset your settings.");
      }
      showToast({ message: "Could not reset", tone: "error" });
    } finally {
      setSaving(false);
    }
  }, [featureFlags, preferences, showToast]);

  const helpers = useMemo(
    () => ({
      spontaneity: "Controls how assertively we propose last-minute hang outs.",
      locationSharing:
        "Live sharing grants turn-by-turn navigation and trusted check-ins. We'll only hold precise coordinates for a few hours and you can revoke anytime.",
      radius: "We'll prioritize hang outs within this walking radius.",
      autoJoin:
        "When enabled, invitations from trusted circles may RSVP automatically. You'll get an immediate notification and can opt out with a single tap.",
      analytics: "Help improve TravelAI by sharing anonymized usage metrics.",
    }),
    []
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-full bg-white/80 px-5 py-3 text-sm font-medium text-gray-700 shadow">
          <Spinner /> Loading settings...
        </div>
      </div>
    );
  }

  if (error && !preferences) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!preferences) return null;

  const timeWindow = typeof preferences.timeAvailability === "string" ? null : preferences.timeAvailability;
  const budgetCustom = typeof preferences.budget !== "string" ? preferences.budget : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Settings & Preferences</h1>
          <p className="mt-1 text-sm text-gray-600">
            Tune spontaneity, sharing, and AI controls. Updates save automatically.
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:border-gray-400 hover:text-gray-900"
        >
          ↺ Reset to defaults
        </button>
      </div>

      {saving ? (
        <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-blue-600">
          <Spinner /> Saving
        </div>
      ) : null}

      <div className="space-y-6 md:space-y-8">
        <Section id="account" title="Account & Personalization" description="Who you are and how TravelAI greets you.">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-900">Display name</span>
              <input
                type="text"
                value={preferences.displayName ?? ""}
                onChange={(event) =>
                  setPreferences((prev) =>
                    prev ? ({ ...prev, displayName: event.target.value } as UserPreferences) : prev
                  )
                }
                onBlur={(event) => handleMultipleChanges({ displayName: event.target.value })}
                className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <span className="text-xs text-gray-500">Visible to travel companions when you share plans.</span>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-900">AI persona</span>
              <select
                value={preferences.aiPersona}
                onChange={(event) => handleMultipleChanges({ aiPersona: event.target.value as UserPreferences["aiPersona"] })}
                className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="conservative">Conservative</option>
                <option value="friendly">Friendly</option>
                <option value="adventurous">Adventurous</option>
                <option value="minimal">Minimal</option>
              </select>
              <span className="text-xs text-gray-500">Guide TravelAI's tone and appetite for experimentation.</span>
            </label>
          </div>
          <div className="space-y-2">
            <Toggle
              label="Auto-join invites from trusted circles"
              helperId="autojoin-helper"
              checked={preferences.autoJoin}
              onChange={() => applyChange("autoJoin", !preferences.autoJoin)}
              disabled={!autoJoinEnabled}
            />
            <p id="autojoin-helper" className="text-xs text-gray-500">
              {autoJoinEnabled
                ? helpers.autoJoin
                : "Auto-join is currently in beta. Once enabled for your account, you can skip confirmations for trusted circles."}
            </p>
          </div>
        </Section>

        <Section
          id="spontaneity"
          title="Spontaneity & Curation"
          description="Control how adventurous recommendations become."
        >
          <div>
            <label className="flex items-center justify-between text-sm font-medium text-gray-900" htmlFor="spontaneity-range">
              Spontaneity level
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-600">
                {preferences.spontaneity}
              </span>
            </label>
            <input
              id="spontaneity-range"
              type="range"
              min={0}
              max={2}
              step={1}
              value={SPONTANEITY_SCALE.indexOf(preferences.spontaneity)}
              onChange={(event) => {
                const level = SPONTANEITY_SCALE[Number(event.target.value)] ?? "medium";
                applyChange("spontaneity", level, { debounce: true });
              }}
              className="mt-3 w-full accent-blue-600"
              aria-describedby="spontaneity-helper"
            />
            <div id="spontaneity-helper" className="mt-2 text-xs text-gray-500">
              {helpers.spontaneity}
            </div>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-900">Match strictness</span>
            <select
              value={preferences.matchStrictness}
              onChange={(event) => handleMultipleChanges({ matchStrictness: event.target.value as UserPreferences["matchStrictness"] })}
              className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="strict">Curate tightly to your saved interests</option>
              <option value="flexible">Blend in situational inspiration</option>
            </select>
          </label>
        </Section>

        <Section
          id="location"
          title="Location & Navigation"
          description="Decide how we use your location to guide you."
        >
          <div className="space-y-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-900">Location sharing</span>
              <div className="flex gap-2">
                <select
                  value={preferences.locationSharing}
                  onChange={(event) => handleMultipleChanges({ locationSharing: event.target.value as LocationSharing })}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  aria-describedby="location-helper"
                >
                  <option value="off">Off</option>
                  <option value="nearby" disabled={!liveLocationEnabled}>
                    Nearby pulse
                  </option>
                  <option value="live" disabled={!liveLocationEnabled}>
                    Live sharing
                  </option>
                </select>
                <button
                  type="button"
                  onClick={() => setPrivacyModalOpen(true)}
                  className="inline-flex items-center rounded-full border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
                  aria-label="Learn how data is retained"
                >
                  ℹ️
                </button>
              </div>
              <span id="location-helper" className="text-xs text-gray-500">
                {liveLocationEnabled
                  ? helpers.locationSharing
                  : "Live location sharing is disabled during rollout. You can still share static locations."}
              </span>
            </label>

            <div className="rounded-xl border border-gray-200 p-4">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-900">Preferred radius</span>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    step={1}
                    value={preferences.radiusKm}
                    onChange={(event) => {
                      const next = Math.min(50, Math.max(1, Number(event.target.value) || 1));
                      applyChange("radiusKm", next, { debounce: true });
                    }}
                    className="w-28 rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    aria-describedby="radius-helper"
                  />
                  <div className="flex flex-wrap gap-2">
                    {RADIUS_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleMultipleChanges({ radiusKm: preset })}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                          preferences.radiusKm === preset ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {preset} km
                      </button>
                    ))}
                  </div>
                </div>
                <span id="radius-helper" className="text-xs text-gray-500">
                  {helpers.radius}
                </span>
              </label>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-900">Transport preference</span>
              <select
                value={preferences.transportPreference}
                onChange={(event) =>
                  handleMultipleChanges({ transportPreference: event.target.value as UserPreferences["transportPreference"] })
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="walking">Walking</option>
                <option value="transit">Transit</option>
                <option value="rideshare">Rideshare</option>
                <option value="driving">Driving</option>
                <option value="bike">Bike</option>
              </select>
            </label>
          </div>
        </Section>

        <Section id="social" title="Social & Visibility" description="Control who can see or invite you.">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-900">Who can invite you</span>
            <select
              value={preferences.whoCanInvite}
              onChange={(event) => handleMultipleChanges({ whoCanInvite: event.target.value as UserPreferences["whoCanInvite"] })}
              className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="anyone">Anyone</option>
              <option value="contacts">Contacts</option>
              <option value="followers">Followers</option>
              <option value="off">No invitations</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-900">Profile visibility</span>
            <select
              value={preferences.profileVisibility}
              onChange={(event) =>
                handleMultipleChanges({ profileVisibility: event.target.value as UserPreferences["profileVisibility"] })
              }
              className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="full">Full profile</option>
              <option value="anonymous">Anonymous</option>
              <option value="pseudonym">Pseudonym</option>
            </select>
          </label>
        </Section>

        <Section
          id="safety"
          title="Safety & Accessibility"
          description="Safeguards and inclusive experiences."
        >
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-900">Safety mode</span>
            <select
              value={preferences.safetyMode}
              onChange={(event) => handleMultipleChanges({ safetyMode: event.target.value as UserPreferences["safetyMode"] })}
              className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="off">Off</option>
              <option value="standard">Standard</option>
              <option value="high">High</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-900">Accessibility needs</span>
            <input
              type="text"
              value={preferences.accessibilityNeeds.join(", ")}
              onChange={(event) =>
                setPreferences((prev) =>
                  prev
                    ? ({
                        ...prev,
                        accessibilityNeeds: event.target.value
                          .split(",")
                          .map((tag) => tag.trim())
                          .filter(Boolean),
                      } as UserPreferences)
                    : prev
                )
              }
              onBlur={(event) =>
                handleMultipleChanges({
                  accessibilityNeeds: event.target.value
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                })
              }
              className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Elevator access, quiet spaces, ..."
            />
            <span className="text-xs text-gray-500">
              List specific needs so TravelAI filters routes and venues accordingly.
            </span>
          </label>
        </Section>

        <Section id="cost" title="Cost & Time" description="Budget boundaries and availability windows.">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-900">Budget preference</span>
            <select
              value={typeof preferences.budget === "string" ? preferences.budget : "custom"}
              onChange={(event) => {
                const value = event.target.value;
                if (value === "custom") {
                  const current = budgetCustom ?? { maxCents: 0 };
                  handleMultipleChanges({ budget: current as UserPreferences["budget"] });
                } else {
                  handleMultipleChanges({ budget: value as UserPreferences["budget"] });
                }
              }}
              className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="free">Free</option>
              <option value="$">$</option>
              <option value="$$">$$</option>
              <option value="$$$">$$$</option>
              <option value="custom">Custom limit</option>
            </select>
          </label>
          {budgetCustom ? (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-900">Max spend (cents)</span>
              <input
                type="number"
                min={0}
                step={100}
                value={budgetCustom.maxCents ?? 0}
                onChange={(event) =>
                  applyChange(
                    "budget",
                    { maxCents: Math.max(0, Number(event.target.value) || 0) },
                    { debounce: true }
                  )
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </label>
          ) : null}

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-900">Time availability</span>
            <select
              value={timeWindow ? "custom" : (preferences.timeAvailability as string)}
              onChange={(event) => {
                const value = event.target.value;
                if (value === "custom") {
                  const defaultWindow = timeWindow ?? { from: "08:00", to: "22:00" };
                  handleMultipleChanges({ timeAvailability: defaultWindow as UserPreferences["timeAvailability"] });
                } else {
                  handleMultipleChanges({ timeAvailability: value as UserPreferences["timeAvailability"] });
                }
              }}
              className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="now">Available now</option>
              <option value="custom">Custom window</option>
            </select>
          </label>
          {timeWindow ? (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-900">From</span>
                <input
                  type="time"
                  value={timeWindow.from ?? ""}
                  onChange={(event) =>
                    handleMultipleChanges({
                      timeAvailability: {
                        ...timeWindow,
                        from: event.target.value,
                      } as UserPreferences["timeAvailability"],
                    })
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-900">To</span>
                <input
                  type="time"
                  value={timeWindow.to ?? ""}
                  onChange={(event) =>
                    handleMultipleChanges({
                      timeAvailability: {
                        ...timeWindow,
                        to: event.target.value,
                      } as UserPreferences["timeAvailability"],
                    })
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </label>
            </div>
          ) : null}
        </Section>

        <Section
          id="notifications"
          title="Notifications & Privacy"
          description="Stay informed while respecting your privacy."
        >
          <Toggle
            label="Show AI reasoning for suggestions"
            checked={preferences.showReasoning}
            onChange={() => applyChange("showReasoning", !preferences.showReasoning)}
          />
          <Toggle
            label="Share anonymized analytics"
            helperId="analytics-helper"
            checked={preferences.analyticsOptIn}
            onChange={() => applyChange("analyticsOptIn", !preferences.analyticsOptIn)}
          />
          <p id="analytics-helper" className="text-xs text-gray-500">
            {helpers.analytics}
          </p>
        </Section>

        <Section id="advanced" title="Advanced settings" defaultCollapsed description="Fine-grained controls for power users.">
          <Toggle
            label="Enable offline maps"
            checked={Boolean(preferences.offlineMaps)}
            onChange={() => applyChange("offlineMaps", !preferences.offlineMaps)}
          />
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-900">Default navigation provider</span>
            <select
              value={preferences.defaultNavProvider ?? "mapbox"}
              onChange={(event) => handleMultipleChanges({ defaultNavProvider: event.target.value })}
              className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="mapbox">Mapbox</option>
              <option value="apple">Apple Maps</option>
              <option value="google">Google Maps</option>
            </select>
          </label>
        </Section>
      </div>

      {toastNode}
      <DataPrivacyModal open={privacyModalOpen} onClose={() => setPrivacyModalOpen(false)} />
      {error && preferences ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}