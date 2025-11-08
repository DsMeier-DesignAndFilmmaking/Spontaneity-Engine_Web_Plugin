"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { SpontaneousCard } from "@/lib/fetchSpontaneousData";

const DISPLAY_LIMIT = 5;
const MINIMUM_SUGGESTIONS = 5;
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
  onSuggestionsChange?: (cards: SpontaneousCard[]) => void;
}

export default function SpontaneousCardPanel({
  className = "",
  mood,
  radius,
  preferences,
  initialLocation,
  onSuggestionsChange,
}: SpontaneousCardPanelProps) {
  const [cards, setCards] = useState<SpontaneousCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState(initialLocation ?? FALLBACK_LOCATION);
  const [locationResolved, setLocationResolved] = useState(Boolean(initialLocation));

  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const preferenceKey = useMemo(() => (preferences ?? []).map((pref) => pref.trim()).filter(Boolean).join("|"), [
    preferences,
  ]);

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
        setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
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

    return () => {
      abortRef.current?.abort();
    };
  }, [initialLocation]);

  const streamSuggestions = useCallback(
    async (coords: { lat: number; lng: number }) => {
      const controller = new AbortController();
      abortRef.current?.abort();
      abortRef.current = controller;

      const requestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);
      setCards([]);
      onSuggestionsChange?.([]);

      const pushCard = (candidate: SpontaneousCard) => {
        const card: SpontaneousCard = {
          id: candidate.id ?? `openai-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          title: candidate.title ?? "AI Suggestion",
          description: candidate.description ?? "A spontaneous local recommendation.",
          category: candidate.category ?? "experience",
          location: {
            lat: candidate.location?.lat ?? coords.lat,
            lng: candidate.location?.lng ?? coords.lng,
            ...(candidate.location?.address ? { address: candidate.location.address } : {}),
          },
          startTime: candidate.startTime,
          source: candidate.source ?? "OpenAI",
        };

        setCards((prev) => dedupeByTitle([...prev, card]).slice(0, DISPLAY_LIMIT));
      };

      const state = {
        started: false,
        buffer: "",
        depth: 0,
        inString: false,
        escape: false,
        objectStart: -1,
      };

      const handleChunk = (chunk: string) => {
        state.buffer += chunk;

        if (!state.started) {
          const idx = state.buffer.indexOf("[");
          if (idx === -1) {
            // Keep buffer small to avoid runaway growth before the array begins.
            state.buffer = state.buffer.slice(-1);
            return;
          }
          state.started = true;
          state.buffer = state.buffer.slice(idx + 1);
        }

        for (let i = 0; i < state.buffer.length; i += 1) {
          const char = state.buffer[i];

          if (state.escape) {
            state.escape = false;
            continue;
          }

          if (char === "\\" && state.inString) {
            state.escape = true;
            continue;
          }

          if (char === '"') {
            state.inString = !state.inString;
            continue;
          }

          if (state.inString) {
            continue;
          }

          if (char === "{") {
            if (state.depth === 0) {
              state.objectStart = i;
            }
            state.depth += 1;
            continue;
          }

          if (char === "}") {
            state.depth -= 1;
            if (state.depth === 0 && state.objectStart !== -1) {
              const objectString = state.buffer.slice(state.objectStart, i + 1);
              try {
                const parsed = JSON.parse(objectString) as SpontaneousCard;
                if (requestId === requestIdRef.current) {
                  pushCard(parsed);
                }
              } catch (parseError) {
                console.warn("Failed to parse streamed suggestion object:", parseError);
              }

              state.buffer = state.buffer.slice(i + 1).replace(/^[\s,]*/, "");
              state.objectStart = -1;
              i = -1;
            }
            continue;
          }

          if (char === "]" && state.depth === 0) {
            state.started = false;
            state.buffer = "";
            state.objectStart = -1;
            state.inString = false;
            state.escape = false;
            break;
          }
        }
      };

      try {
        const trimmedPreferences = preferenceKey
          .split("|")
          .map((value) => value.trim())
          .filter(Boolean);

        const response = await fetch("/api/spontaneous/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: coords,
            mood,
            radius,
            preferences: trimmedPreferences,
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`Generation failed (${response.status})`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }
          if (!value) continue;
          const chunk = decoder.decode(value, { stream: true });
          handleChunk(chunk);
        }
      } catch (err) {
        if (controller.signal.aborted || requestId !== requestIdRef.current) {
          return;
        }
        const message = err instanceof Error ? err.message : "Unable to load AI suggestions.";
        setError(message);
        setCards([]);
        onSuggestionsChange?.([]);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          abortRef.current = null;
        }
      }
    },
    [mood, preferenceKey, radius, onSuggestionsChange],
  );

  useEffect(() => {
    if (!locationResolved) {
      return;
    }

    void streamSuggestions(location);

    return () => {
      abortRef.current?.abort();
    };
  }, [locationResolved, location.lat, location.lng, streamSuggestions]);

  const displayCards = useMemo(() => dedupeByTitle(cards).slice(0, DISPLAY_LIMIT), [cards]);

  const handleRefresh = () => {
    void streamSuggestions(location);
  };

  useEffect(() => {
    onSuggestionsChange?.(displayCards);
  }, [displayCards, onSuggestionsChange]);

  return (
    <section className={`border-b border-gray-200 bg-white/95 px-5 py-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">AI Suggestions</p>
          <h3 className="text-lg font-semibold text-gray-900">Spontaneous Ideas Near You</h3>
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
            {Array.from({ length: DISPLAY_LIMIT }).map((_, index) => (
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
          <p className="text-sm text-gray-600">No AI suggestions ready just yet. Try refreshing in a moment.</p>
        )}

        {!loading && displayCards.length > 0 && (
          <div className="space-y-3">
            {displayCards.map((card) => (
              <article
                key={card.id}
                className="rounded-xl border border-gray-200 bg-white/95 p-3 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-base font-semibold text-gray-900">{card.title}</h4>
                  <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold capitalize text-blue-700">
                    {card.category}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-600">{card.description}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <span>{card.source ?? "OpenAI"}</span>
                  {card.startTime && <span>{card.startTime}</span>}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {displayCards.length < MINIMUM_SUGGESTIONS && !loading && (
        <p className="mt-3 text-xs text-gray-500">Want different vibes? Tap refresh for another set of ideas.</p>
      )}
    </section>
  );
}
