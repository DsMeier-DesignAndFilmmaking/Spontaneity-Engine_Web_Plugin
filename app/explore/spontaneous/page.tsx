import { Suspense } from "react";
import SpontaneousExperiencePageContent from "./SpontaneousExperiencePageContent";

export default function SpontaneousExperiencePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
          Loading spontaneous explorer…
        </div>
      }
    >
      <SpontaneousExperiencePageContent />
    </Suspense>
  );
}

