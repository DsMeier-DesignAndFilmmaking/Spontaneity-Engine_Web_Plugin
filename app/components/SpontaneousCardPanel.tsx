"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { SpontaneousCard } from "@/lib/fetchSpontaneousData";
import { fetchSpontaneousSuggestions } from "@/lib/api/spontaneousClient";

const MINIMUM_SUGGESTIONS = 3;
const DISPLAY_LIMIT = 3;
const FALLBACK_LOCATION = { lat: 40.7128, lng: -74.006 };

function dedupeByTitle(cards: SpontaneousCard[]): SpontaneousCard[] {
  const seen = new Set<string>();
  const result: SpontaneousCard[] = [];

  cards.forEach((card) => {
    const key = card.title.trim().toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(card);
    }
  });

  return result;
}

interface SpontaneousCardPanelProps {
  className?: string;
  mood?: string;
  radius?: number;
  preferences?: string[];
  initialLocation?: { lat: number; lng: number };
}

export default function SpontaneousCardPanel({
  className = "",
  mood,
  radius,
  preferences,
  initialLocation,
}: SpontaneousCardPanelProps) {
  const [cards, setCards] = useState<SpontaneousCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState(initialLocation ?? FALLBACK_LOCATION);
  const [locationResolved, setLocationResolved] = useState(Boolean(initialLocation));

  const requestIdRef = useRef(0);

  useEffect(() => {
    if (initialLocation) {
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationResolved(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationResolved(true);
      },
      (geoError) => {
        console.warn("Geolocation unavailable for spontaneous suggestions:", geoError);
        setLocationResolved(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 7000,
        maximumAge: 300000,
      },
    );
  }, [initialLocation]);

  const loadSuggestions = useCallback(
    async (coords: { lat: number; lng: number }) => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);

      try {
        const nextCards = await fetchSpontaneousSuggestions({
          location: coords,
          mood,
          radius,
          preferences,
        });

        if (requestId !== requestIdRef.current) {
          return;
        }

        const deduped = dedupeByTitle(nextCards);
        setCards(deduped);
      } catch (err) {
        if (requestId !== requestIdRef.current) {
          return;
        }
        const message = err instanceof Error ? err.message : "Unable to load AI suggestions.";
        setError(message);
        setCards([]);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [mood, preferences, radius],
  );

  useEffect(() => {
    if (!locationResolved) {
      return;
    }

    void loadSuggestions(location);
  }, [locationResolved, location, loadSuggestions]);

  const displayCards = useMemo(() => {
    const trimmed = dedupeByTitle(cards);
    if (trimmed.length >= DISPLAY_LIMIT) {
      return trimmed.slice(0, DISPLAY_LIMIT);
    }
    return trimmed;
  }, [cards]);

  const handleRefresh = () => {
    void loadSuggestions(location);
  };

  return (
    <section className={`border-b border-gray-200 bg-white/95 px-5 py-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            AI Suggestions
          </p>
          <h3 className="text-lg font-semibold text-gray-900">
            Spontaneous Ideas Near You
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Regenerate anytime for fresh inspiration powered by OpenAI.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full border border-blue-600 bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 shadow-sm transition hover:bg-blue-600 hover:text-white disabled:cursor-not-allowed disabled:border-blue-200 disabled:text-blue-300"
          aria-label="Refresh AI suggestions"
        >
          <span className="text-base leading-none">⟳</span>
          Refresh
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {loading && (
          <div className="space-y-3">
            {[0, 1, 2].map((index) => (
              <div
                key={`skeleton-${index}`}
                className="animate-pulse rounded-xl border border-gray-200 bg-white/70 p-3 shadow-sm"
              >
                <div className="h-4 w-3/4 rounded bg-gray-200" />
                <div className="mt-2 h-3 w-full rounded bg-gray-200" />
                <div className="mt-2 h-3 w-2/3 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        )}

        {!loading && displayCards.length === 0 && !error && (
          <p className="text-sm text-gray-600">
            No AI suggestions ready just yet. Try refreshing in a moment.
          </p>
        )}

        {!loading && displayCards.length > 0 && (
          <div className="space-y-3">
            {displayCards.map((card) => (
              <article
                key={card.id}
                className="rounded-xl border border-gray-200 bg-white/95 p-3 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-base font-semibold text-gray-900">
                    {card.title}
                  </h4>
                  <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold capitalize text-blue-700">
                    {card.category}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-600">{card.description}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <span>{card.source ?? "AI Concierge"}</span>
                  {card.startTime && <span>{card.startTime}</span>}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {displayCards.length < MINIMUM_SUGGESTIONS && !loading && (
        <p className="mt-3 text-xs text-gray-500">
          Want different vibes? Tap refresh for another set of ideas.
        </p>
      )}
    </section>
  );
}
