import SettingsForm from "@/components/SettingsForm";
import {
  ensureDefaultFlags,
  getFeatureFlagSnapshot,
  isFeatureEnabled,
} from "@/lib/feature-flags";

export const metadata = {
  title: "Settings | TravelAI",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  try {
    await ensureDefaultFlags();
    const enabled = await isFeatureEnabled("settings_ui_enabled", true);

    if (!enabled) {
      return (
        <main className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Settings temporarily unavailable</h1>
          <p className="mt-3 text-sm text-gray-600">
            We&rsquo;re rolling out the settings experience gradually. Please check back soon.
          </p>
        </main>
      );
    }

    const featureFlags = await getFeatureFlagSnapshot();

    return (
      <main className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <SettingsForm featureFlags={featureFlags} />
      </main>
    );
  } catch (error) {
    console.error("Settings page load error", error);
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">We can’t load settings right now</h1>
        <p className="mt-3 text-sm text-gray-600">
          Please refresh in a moment. If the issue persists, check database connectivity and feature flag configuration.
        </p>
      </main>
    );
  }
}
