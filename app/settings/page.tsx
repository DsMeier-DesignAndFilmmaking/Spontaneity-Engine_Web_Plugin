import SettingsForm from "@/components/SettingsForm";

export const metadata = {
  title: "Settings | TravelAI",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <SettingsForm />
    </main>
  );
}
