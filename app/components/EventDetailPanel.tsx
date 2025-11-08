"use client";

import { formatDateTime } from "@/lib/helpers";
import { Event } from "@/lib/types";
import Link from "next/link";

interface EventDetailPanelProps {
  event: Event;
  onClose: () => void;
}

const formatCoordinate = (value: number) => value.toFixed(5);

const resolveDate = (value: unknown): Date => {
  if (value instanceof Date) {
    return value;
  }
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate?: () => Date }).toDate === "function") {
    try {
      const converted = (value as { toDate: () => Date }).toDate();
      if (converted instanceof Date && !Number.isNaN(converted.valueOf())) {
        return converted;
      }
    } catch (error) {
      console.warn("Failed to convert Firestore timestamp:", error);
    }
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.valueOf())) {
      return parsed;
    }
  }
  return new Date();
};

export default function EventDetailPanel({ event, onClose }: EventDetailPanelProps) {
  const postedAt = resolveDate(event.createdAt);
  const tags = Array.isArray(event.tags) ? event.tags : [];
  const hasLocation = Boolean(event.location && typeof event.location.lat === "number" && typeof event.location.lng === "number");
  const isAI = (event.source ?? "").toLowerCase() === "ai" || (event.createdBy ?? "").toLowerCase() === "ai" || event.id?.startsWith("AI-");
  const normalizedSource = (event.source ?? "").toString().trim();

  const sourceMeta: Record<
    string,
    {
      label: string;
      description: string;
    }
  > = {
    AI: {
      label: "AI Concierge",
      description: "Generated on the fly by our AI concierge using live weather, time, and your saved preferences.",
    },
    MockEventbrite: {
      label: "Eventbrite (mock)",
      description: "Simulated community events from Eventbrite’s live city feed—for testing without API keys.",
    },
    MockFoursquare: {
      label: "Foursquare (mock)",
      description: "Sampled hangout spots sourced from a curated Foursquare mock catalogue.",
    },
    MockGooglePlaces: {
      label: "Google Places (mock)",
      description: "Points of interest modeled after Google Places results around your current radius.",
    },
    MockOpenWeather: {
      label: "OpenWeather (mock)",
      description: "Weather snapshot synthesized from OpenWeather conditions to guide indoor vs outdoor picks.",
    },
    User: {
      label: "Community",
      description: "Created by a TravelAI community member and shared with nearby travelers.",
    },
  };

  const fallbackSource = {
    label: normalizedSource ? normalizedSource : "Unknown source",
    description: normalizedSource
      ? "Data supplied by the spontaneous engine’s mock dataset."
      : "We couldn’t detect the data source for this card.",
  };

  const sourceDetails = sourceMeta[normalizedSource] ?? fallbackSource;

  const mapLink = hasLocation
    ? `https://www.google.com/maps/search/?api=1&query=${event.location!.lat},${event.location!.lng}`
    : undefined;

  return (
    <aside className="flex h-full flex-col bg-white">
      <header className="flex items-start gap-3 border-b border-gray-200 px-5 py-4">
        <button
          type="button"
          onClick={onClose}
          className="mt-1 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-gray-300 hover:text-gray-700 md:hidden"
          aria-label="Close details"
        >
          ×
        </button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Hang Out Details</p>
          <h3 className="text-lg font-semibold text-gray-900">{event.title || "Untitled Hang Out"}</h3>
          <p className="mt-1 text-xs text-gray-500">Posted {formatDateTime(postedAt)}</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <section className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-900">Overview</h4>
          <p className="text-sm text-gray-700 leading-relaxed">
            {event.description?.trim() || "No description provided for this hang out."}
          </p>
          {event.startTime && (
            <p className="text-sm text-gray-600">
              Start time: {formatDateTime(resolveDate(event.startTime))}
            </p>
          )}
        </section>

        {isAI && (
          <section className="mt-6 space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/70 p-4">
            <h4 className="text-sm font-semibold text-indigo-900">Why you&apos;re seeing this</h4>
            <p className="text-sm text-indigo-900/80 leading-relaxed">
              Our concierge looked at live conditions (weather, time of day, trending hang outs) together with your saved preferences to surface this suggestion. Tags highlight the context the model focused on.
            </p>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={`ai-context-${tag}`}
                    className="inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-indigo-700 shadow-sm"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </section>
        )}

        {tags.length > 0 && !isAI && (
          <section className="mt-6 space-y-2">
            <h4 className="text-sm font-semibold text-gray-900">Tags</h4>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </section>
        )}

        <section className="mt-6 space-y-2">
          <h4 className="text-sm font-semibold text-gray-900">Location</h4>
          {hasLocation ? (
            <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
              <p>
                Coordinates: {formatCoordinate(event.location!.lat)}, {formatCoordinate(event.location!.lng)}
              </p>
              {mapLink && (
                <Link
                  href={mapLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition hover:text-blue-700"
                >
                  Open in Maps →
                </Link>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-600">No location data available for this hang out yet.</p>
          )}
        </section>

        <section className="mt-6 space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h4 className="text-sm font-semibold text-gray-900">Data Source</h4>
          <p className="text-sm font-semibold text-gray-800">{sourceDetails.label}</p>
          <p className="text-sm text-gray-600 leading-relaxed">{sourceDetails.description}</p>
        </section>
      </div>
    </aside>
  );
}
