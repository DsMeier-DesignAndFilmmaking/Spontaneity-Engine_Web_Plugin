import { generateLocalAISuggestions } from "@/app/services/ai";
import type { Event } from "@/lib/types";
import type { SpontaneousCard, SpontaneousCategory, SpontaneousQuery } from "@/lib/fetchSpontaneousData";

const OPENAI_SOURCE_LABEL = "OpenAI";
const DEFAULT_RESULT_COUNT = 5;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function jitterCoordinate(value: number, range = 0.01) {
  return clamp(value + (Math.random() - 0.5) * range, -89.9999, 89.9999);
}

function jitterLongitude(value: number, range = 0.01) {
  return clamp(value + (Math.random() - 0.5) * range, -179.9999, 179.9999);
}

const CATEGORY_KEYWORDS: Record<SpontaneousCategory, string[]> = {
  event: ["event", "festival", "concert", "class", "tour", "meetup", "gathering", "party"],
  venue: ["venue", "bar", "club", "cafe", "restaurant", "lounge", "gallery", "studio"],
  place: ["park", "trail", "place", "market", "neighborhood", "district", "spot", "walk"],
  weather: ["weather", "forecast", "rain", "sunset", "sunrise", "temperature", "climate"],
};

function inferCategory(event: Event): SpontaneousCategory {
  const haystack = [
    event.title,
    event.description,
    ...(Array.isArray(event.tags) ? event.tags : []),
  ]
    .join(" ")
    .toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as Array<
    [SpontaneousCategory, string[]]
  >) {
    if (keywords.some((keyword) => haystack.includes(keyword))) {
      return category;
    }
  }

  return "event";
}

function toCard(event: Event, fallback: SpontaneousQuery["location"], index: number): SpontaneousCard {
  const location = event.location ?? fallback;
  const lat = typeof location.lat === "number" ? location.lat : fallback.lat;
  const lng = typeof location.lng === "number" ? location.lng : fallback.lng;

  return {
    id: event.id ?? `openai-${Date.now()}-${index}`,
    title: event.title,
    category: inferCategory(event),
    description: event.description,
    location: {
      lat: jitterCoordinate(lat),
      lng: jitterLongitude(lng),
    },
    startTime: event.startTime,
    source: OPENAI_SOURCE_LABEL,
  };
}

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

export async function fetchOpenAISpontaneousCards(query: SpontaneousQuery): Promise<SpontaneousCard[]> {
  const locationString = `${query.location.lat.toFixed(4)}, ${query.location.lng.toFixed(4)}`;
  const historyKey = `spontaneous-${Math.round(query.location.lat * 1000)}-${Math.round(
    query.location.lng * 1000,
  )}`;

  const events = await generateLocalAISuggestions({
    location: locationString,
    coordinates: query.location,
    mood: query.mood ?? null,
    preferences: query.preferences ?? [],
    historyKey,
    allowStaticFallback: false,
  });

  const mapped = events.map((event, index) => toCard(event, query.location, index));

  return dedupeByTitle(mapped).slice(0, DEFAULT_RESULT_COUNT);
}

export function mergeWithFallbackCards(
  primary: SpontaneousCard[],
  fallback: SpontaneousCard[],
  targetCount: number = DEFAULT_RESULT_COUNT,
): SpontaneousCard[] {
  const combined = dedupeByTitle([...primary, ...fallback]);
  return combined.slice(0, targetCount);
}

export { OPENAI_SOURCE_LABEL };
