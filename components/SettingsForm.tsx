'use client';

import { useCallback, useEffect, useRef, useState } from "react";
import fetchWithAuth, { FetchWithAuthError } from "@/lib/fetchWithAuth";

type NotificationPrefs = {
  push: boolean;
  email: boolean;
};

interface UserSettings {
  spontaneousMode: boolean;
  preferredRadius: number;
  notifications: NotificationPrefs;
  interests: string[];
  aiPersonalizationLevel: "baseline" | "adaptive" | "experimental";
}

interface SettingsResponse {
  environment: string;
  preferences: UserSettings;
  user: { id: string; name: string };
  message: string;
}

const DEFAULT_SETTINGS: UserSettings = {
  spontaneousMode: true,
  preferredRadius: 5,
  notifications: { push: true, email: false },
  interests: ["food", "music", "outdoors"],
  aiPersonalizationLevel: "adaptive",
};

const INTEREST_OPTIONS = ["food", "music", "outdoors", "art", "wellness", "technology"];

export default function SettingsForm() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [environment, setEnvironment] = useState<string>(process.env.NODE_ENV ?? "development");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Traveler");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const normalizeSettings = useCallback((input: Partial<UserSettings>): UserSettings => {
    return {
      spontaneousMode: input.spontaneousMode ?? DEFAULT_SETTINGS.spontaneousMode,
      preferredRadius: input.preferredRadius ?? DEFAULT_SETTINGS.preferredRadius,
      notifications: {
        push: input.notifications?.push ?? DEFAULT_SETTINGS.notifications.push,
        email: input.notifications?.email ?? DEFAULT_SETTINGS.notifications.email,
      },
      interests: Array.isArray(input.interests) ? input.interests : DEFAULT_SETTINGS.interests,
      aiPersonalizationLevel: input.aiPersonalizationLevel ?? DEFAULT_SETTINGS.aiPersonalizationLevel,
    } satisfies UserSettings;
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetchWithAuth<SettingsResponse>("/api/v1/settings");
        setSettings(normalizeSettings(response.preferences));
        setEnvironment(response.environment);
        setUserName(response.user?.name ?? "Traveler");
        setStatus("idle");
      } catch (err) {
        if (err instanceof FetchWithAuthError && err.status === 401) {
          setError("Please sign in to manage your settings.");
        } else {
          setError("Unable to load settings. Showing defaults.");
        }
        setSettings(DEFAULT_SETTINGS);
        setStatus("error");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [normalizeSettings]);

  const persist = useCallback(
    async (next: UserSettings) => {
      try {
        setStatus("saving");
        await fetchWithAuth<SettingsResponse>("/api/v1/settings", {
          method: "POST",
          body: JSON.stringify(next),
        });
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 800);
      } catch (err) {
        if (err instanceof FetchWithAuthError && err.status === 401) {
          setError("Please sign in to save your settings.");
        } else {
          setError("Unable to save settings. Please try again.");
        }
        setStatus("error");
      }
    },
    []
  );

  const updateSettings = useCallback(
    (patch: Partial<UserSettings>) => {
      setSettings((prev) => {
        const next = normalizeSettings({ ...prev, ...patch });
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          void persist(next);
        }, 400);
        return next;
      });
    },
    [normalizeSettings, persist]
  );

  const toggleInterest = useCallback(
    (interest: string) => {
      updateSettings({
        interests: settings.interests.includes(interest)
          ? settings.interests.filter((item) => item !== interest)
          : [...settings.interests, interest],
      });
    },
    [settings.interests, updateSettings]
  );

  const resetDefaults = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    void persist(DEFAULT_SETTINGS);
  }, [persist]);

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm">
        Loading settings…
      </div>
    );
  }

  return (
    <section className="space-y-6 rounded-2xl border border-gray-200 bg-white/95 p-6 shadow-sm">
      <header className="space-y-2">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-600">Environment: {environment}</p>
          <p className="text-xs text-gray-500">Signed in as {userName}</p>
        </div>
        {status === "saving" && <p className="text-xs text-blue-600">Saving changes…</p>}
        {status === "saved" && <p className="text-xs text-green-600">Settings saved.</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </header>

      <div className="space-y-5">
        <label className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div>
            <span className="text-sm font-medium text-gray-900">Spontaneous Mode</span>
            <p className="text-xs text-gray-500">Let TravelAI propose last-minute ideas tailored to you.</p>
          </div>
          <button
            type="button"
            onClick={() => updateSettings({ spontaneousMode: !settings.spontaneousMode })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
              settings.spontaneousMode ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                settings.spontaneousMode ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </label>

        <div className="space-y-2 rounded-lg border border-gray-200 p-4">
          <label className="flex justify-between text-sm font-medium text-gray-900">
            Preferred Radius
            <span>{settings.preferredRadius} km</span>
          </label>
          <input
            type="range"
            min={1}
            max={20}
            value={settings.preferredRadius}
            onChange={(event) => updateSettings({ preferredRadius: Number(event.target.value) })}
            className="w-full accent-blue-500"
          />
        </div>

        <fieldset className="space-y-2 rounded-lg border border-gray-200 p-4">
          <legend className="text-sm font-semibold text-gray-900">Notifications</legend>
          <label className="flex items-center gap-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={settings.notifications.push}
              onChange={() =>
                updateSettings({
                  notifications: {
                    ...settings.notifications,
                    push: !settings.notifications.push,
                  },
                })
              }
            />
            Push notifications
          </label>
          <label className="flex items-center gap-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={settings.notifications.email}
              onChange={() =>
                updateSettings({
                  notifications: {
                    ...settings.notifications,
                    email: !settings.notifications.email,
                  },
                })
              }
            />
            Email summaries
          </label>
        </fieldset>

        <fieldset className="space-y-3 rounded-lg border border-gray-200 p-4">
          <legend className="text-sm font-semibold text-gray-900">Interests</legend>
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map((interest) => {
              const active = settings.interests.includes(interest);
              return (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleInterest(interest)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    active ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {interest}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="space-y-2 rounded-lg border border-gray-200 p-4">
          <label className="text-sm font-semibold text-gray-900">AI Personalization Level</label>
          <select
            value={settings.aiPersonalizationLevel}
            onChange={(event) =>
              updateSettings({
                aiPersonalizationLevel: event.target.value as UserSettings["aiPersonalizationLevel"],
              })
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-300"
          >
            <option value="baseline">Baseline (safer choices)</option>
            <option value="adaptive">Adaptive</option>
            <option value="experimental">Experimental</option>
          </select>
        </div>
      </div>

      <footer className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={resetDefaults}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
        >
          Reset defaults
        </button>
        <span className="text-xs text-gray-500">Status: {status}</span>
      </footer>
    </section>
  );
}