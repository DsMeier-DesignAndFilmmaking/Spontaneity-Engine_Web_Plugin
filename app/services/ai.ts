import OpenAI from "openai";
import { getTenantPromptTemplate } from "./tenant";
import type { Event } from "@/lib/types";
import { getAdminDb } from "@/lib/firebase-admin";
import type { SpontaneousCard } from "@/lib/fetchSpontaneousData";

const FALLBACK_COORDS = { lat: 40.7128, lng: -74.0060 }; // NYC
const MAX_HISTORY_ENTRIES = 15;

interface AISuggestion {
  name?: string;
  type?: string;
  description?: string;
  distance?: string;
  tip?: string;
}

export interface WeatherContext {
  summary?: string | null;
  temperatureC?: number | null;
  feelsLikeC?: number | null;
  condition?: string | null;
  windSpeedMph?: number | null;
  precipitationChance?: number | null; // 0-1 or 0-100 supported
  humidity?: number | null;
  advisory?: string | null;
}

export interface GenerateAISuggestionsOptions {
  location: string;
  tenantId?: string | null;
  coordinates?: { lat: number; lng: number } | null;
  city?: string | null;
  region?: string | null;
  travelerType?: string | null;
  mood?: string | null;
  weather?: string | WeatherContext | null;
  timezone?: string | null;
  aggregatedCards?: SpontaneousCard[];
  preferences?: string[];
  historyKey?: string | null;
  recentOverride?: string[];
}

const sanitizeText = (value?: string | null): string | undefined => {
  if (!value || typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const jitterCoordinate = (base: number, range = 0.01) => clamp(base + (Math.random() - 0.5) * range, -89.9999, 89.9999);
const jitterLongitude = (base: number, range = 0.01) => clamp(base + (Math.random() - 0.5) * range, -179.9999, 179.9999);

const toSlug = (value: string, fallback: string, maxLength = 32): string => {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
  const safeSlug = slug || fallback;
  return safeSlug.slice(0, maxLength);
};

const FALLBACK_SUGGESTIONS: AISuggestion[] = [
  {
    name: "Lantern Lit Alleyway Bites",
    type: "Pop-up",
    description: "Tuck into a hidden laneway street food crawl hosted by local chefs rotating through neon-lit stalls.",
    distance: "0.6 miles, Night Market District",
    tip: "Arrive hungry by 7:30 pm to beat the queue for the first tasting flight.",
  },
  {
    name: "Rooftop Vinyl Listening Lounge",
    type: "Local Experience",
    description: "Swap stories with neighborhood creatives while a DJ spins rare funk pressings above the skyline.",
    distance: "1.3 miles, Arts Quarter",
    tip: "Bring your own record for a chance to add it to the midnight spin.",
  },
  {
    name: "Secret Speakeasy Story Hour",
    type: "Hangout",
    description: "Slip behind an unmarked door for candlelit cocktails and short tales from resident storytellers.",
    distance: "0.9 miles, Historic Warehouse Row",
    tip: "Password at the door changes hourly—ask the florist next door for the current clue.",
  },
];

const DESCRIPTION_VARIATIONS = [
  "Perfect for an unexpected adventure.",
  "A hidden gem worth checking out.",
  "Locals rave about this pick.",
  "Ideal for shaking up your routine.",
  "Great for sharing with new friends.",
];

const FEW_SHOT_EXAMPLES: ReadonlyArray<{ title: string; description: string; category: string }> = [
  {
    title: "Sunset Rooftop Mixer",
    description: "Enjoy cocktails and live music with locals while the skyline glows at dusk.",
    category: "event",
  },
  {
    title: "Hidden Jazz Café",
    description: "Slip into a candlelit speakeasy for intimate improvisation sets and artisan cocktails.",
    category: "venue",
  },
  {
    title: "Potomac Night Paddle",
    description: "Glide along the waterfront under lanterns with a local guide narrating hidden history.",
    category: "place",
  },
];

function addVariation(text: string): string {
  if (!text) return DESCRIPTION_VARIATIONS[0];
  const suffix = DESCRIPTION_VARIATIONS[Math.floor(Math.random() * DESCRIPTION_VARIATIONS.length)];
  return text.endsWith(".") ? `${text} ${suffix}` : `${text}. ${suffix}`;
}

function buildWeatherContext(weatherInput: string | WeatherContext | null | undefined) {
  if (!weatherInput) {
    return { snapshot: "", advisory: "" };
  }

  if (typeof weatherInput === "string") {
    const trimmed = weatherInput.trim();
    if (!trimmed) return { snapshot: "", advisory: "" };
    return {
      snapshot: `Weather snapshot: ${trimmed}`,
      advisory: "",
    };
  }

  const {
    summary,
    temperatureC,
    feelsLikeC,
    condition,
    windSpeedMph,
    precipitationChance,
    humidity,
    advisory,
  } = weatherInput;

  const sections: string[] = [];

  if (summary && summary.trim().length > 0) {
    sections.push(summary.trim());
  } else {
    const parts: string[] = [];
    if (typeof temperatureC === "number" && Number.isFinite(temperatureC)) {
      parts.push(`${Math.round(temperatureC)}°C`);
    }
    if (typeof feelsLikeC === "number" && Number.isFinite(feelsLikeC)) {
      parts.push(`feels like ${Math.round(feelsLikeC)}°C`);
    }
    if (condition && condition.trim().length > 0) {
      parts.push(condition.trim());
    }
    if (typeof windSpeedMph === "number" && Number.isFinite(windSpeedMph)) {
      parts.push(`winds ${Math.round(windSpeedMph)} mph`);
    }
    if (typeof humidity === "number" && Number.isFinite(humidity)) {
      parts.push(`humidity ${Math.round(humidity)}%`);
    }
    if (typeof precipitationChance === "number" && Number.isFinite(precipitationChance)) {
      const precipPercent = precipitationChance > 1 ? precipitationChance : precipitationChance * 100;
      parts.push(`precipitation ${Math.round(precipPercent)}%`);
    }
    if (parts.length > 0) {
      sections.push(`Weather snapshot: ${parts.join(", ")}`);
    }
  }

  let advisoryLine = "";
  if (advisory && advisory.trim().length > 0) {
    advisoryLine = advisory.trim();
  } else if (typeof precipitationChance === "number" && Number.isFinite(precipitationChance)) {
    const precipPercent = precipitationChance > 1 ? precipitationChance : precipitationChance * 100;
    if (precipPercent >= 50) {
      advisoryLine = "Weather advisory: Favor indoor or covered experiences when precipitation is above 50%.";
    }
  }

  return {
    snapshot: sections.join(" "),
    advisory: advisoryLine,
  };
}

function normalizeCardsForPrompt(cards: SpontaneousCard[]): Array<Partial<SpontaneousCard>> {
  return cards.slice(0, 8).map((card) => ({
    title: card.title,
    category: card.category,
    description:
      card.description.length > 220 ? `${card.description.slice(0, 217).trimEnd()}...` : card.description,
    startTime: card.startTime,
    location: {
      lat: card.location.lat,
      lng: card.location.lng,
      ...(card.location.address ? { address: card.location.address } : {}),
    },
    source: card.source,
  }));
}

function fewShotBlock() {
  return FEW_SHOT_EXAMPLES.map(
    (example, idx) =>
      `Example ${idx + 1}:\nTitle: ${example.title}\nCategory: ${example.category}\nDescription: ${example.description}`,
  ).join("\n\n");
}

function extractJsonArray(content: string): unknown {
  const start = content.indexOf("[");
  const end = content.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON array found in AI response");
  }

  const slice = content.slice(start, end + 1);
  return JSON.parse(slice);
}

async function readRecentTitles(historyKey: string | null, limit = 10): Promise<string[]> {
  if (!historyKey) return [];
  const db = getAdminDb();
  if (!db) return [];

  try {
    const doc = await db.collection("ai_history").doc(historyKey).get();
    if (!doc.exists) return [];
    const entries = (doc.data()?.entries ?? []) as Array<{ title?: string }>;
    return entries
      .map((entry) => sanitizeText(entry?.title))
      .filter((title): title is string => Boolean(title))
      .slice(-limit);
  } catch (error) {
    console.warn("Failed to read AI history:", error);
    return [];
  }
}

async function appendHistory(historyKey: string | null, cards: Event[]): Promise<void> {
  if (!historyKey || cards.length === 0) return;
  const db = getAdminDb();
  if (!db) return;

  const docRef = db.collection("ai_history").doc(historyKey);

  try {
    await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(docRef);
      const existing = snapshot.exists ? (snapshot.data()?.entries ?? []) : [];
      const newEntries = cards.map((card) => ({
        title: card.title,
        generatedAt: new Date().toISOString(),
      }));
      const merged = [...existing, ...newEntries];
      const trimmed = merged.slice(-MAX_HISTORY_ENTRIES);
      tx.set(docRef, { entries: trimmed }, { merge: true });
    });
  } catch (error) {
    console.warn("Failed to append AI history:", error);
  }
}

export async function generateLocalAISuggestions({
  location,
  tenantId = null,
  coordinates = null,
  city = null,
  region = null,
  travelerType = "spontaneous explorer",
  mood = null,
  weather = null,
  timezone = null,
  aggregatedCards = [],
  preferences = [],
  historyKey = null,
  recentOverride,
}: GenerateAISuggestionsOptions): Promise<Event[]> {
  const apiKey = process.env.OPENAI_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.warn("OpenAI API key not configured. Falling back to static AI suggestions.");
    return mapSuggestionsToEvents(FALLBACK_SUGGESTIONS, coordinates || FALLBACK_COORDS, tenantId);
  }

  const openai = new OpenAI({ apiKey });

  const trimmedLocation = sanitizeText(location) || "New York";

  let locationCoords: { lat: number; lng: number } | null = coordinates;
  const coordMatch = trimmedLocation.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
  if (!locationCoords && coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[2]);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      locationCoords = { lat, lng };
    }
  }

  const locationLabel = sanitizeText(city) || sanitizeText(region) || (locationCoords ? "nearby" : trimmedLocation);
  const coordinateLabel = locationCoords
    ? `${locationCoords.lat.toFixed(4)}, ${locationCoords.lng.toFixed(4)}`
    : "unknown coordinates";

  let localTime = new Date().toISOString();
  if (timezone) {
    try {
      localTime = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(new Date());
    } catch (err) {
      console.warn("Failed to format local time with provided timezone:", err);
    }
  }

  const tenantTemplate = getTenantPromptTemplate(tenantId);

  const { snapshot: weatherSnapshot, advisory: weatherAdvisory } = buildWeatherContext(weather);

  const dayOfWeek = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date());
  const promptCards = normalizeCardsForPrompt(aggregatedCards);
  const promptPayload = {
    options: promptCards,
    weather: weatherSnapshot || undefined,
    advisory: weatherAdvisory || undefined,
    preferences,
    mood,
    timeOfDay: localTime,
    dayOfWeek,
  };

  const historyDocKey = historyKey ?? tenantId ?? "default";
  const recentTitles = recentOverride ?? (await readRecentTitles(historyDocKey));

  const avoidedTitlesText =
    recentTitles.length > 0
      ? `Avoid repeating these exact titles: ${recentTitles.map((title) => `"${title}"`).join(", ")}`
      : "Avoid repeating previously suggested activities.";

  const systemPrompt = `
You are an AI travel concierge creating spontaneous local experiences.
Always respond with a valid JSON array of cards. Match the tone of the examples.
  `.trim();

  const userPrompt = `
${fewShotBlock()}

${avoidedTitlesText}

Traveler context:
- Location: ${coordinateLabel} (${locationLabel})
- Time: ${localTime} on ${dayOfWeek}
- Traveler type: ${travelerType}
- Mood: ${mood ?? "neutral"}
- Preferences: ${preferences.length ? preferences.join(", ") : "none provided"}
${weatherSnapshot ? `- ${weatherSnapshot}` : ""}
${weatherAdvisory ? `- ${weatherAdvisory}` : ""}

Using the context JSON below, create 5 unique activity cards. Each card must include:
- title
- 1-2 sentence description grounded in local details
- category (event | venue | place | weather)
- optional startTime if relevant
- optional address or neighborhood detail

JSON context (do not echo this verbatim—transform it into fresh experiences):
${JSON.stringify(promptPayload, null, 2)}
  `.trim();

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 800,
    });

    const message = completion.choices[0]?.message?.content || "";
    const cleanedPayload = extractJsonArray(message.trim());

    if (!Array.isArray(cleanedPayload)) {
      throw new Error("AI response was not an array");
    }

    const suggestions = (cleanedPayload as AISuggestion[])
      .filter((item) => item && typeof item === "object")
      .slice(0, 5)
      .map((suggestion) => ({
        ...suggestion,
        description: addVariation(sanitizeText(suggestion.description) || ""),
      }));

    if (!suggestions.length) {
      throw new Error("AI did not return any suggestions");
    }

    const mapped = mapSuggestionsToEvents(suggestions, locationCoords || FALLBACK_COORDS, tenantId);
    await appendHistory(historyDocKey, mapped);
    return mapped;
  } catch (error) {
    console.warn("Failed to generate AI suggestions:", error);
    return mapSuggestionsToEvents(
      FALLBACK_SUGGESTIONS.map((suggestion) => ({
        ...suggestion,
        description: addVariation(sanitizeText(suggestion.description) || ""),
      })),
      coordinates || FALLBACK_COORDS,
      tenantId,
    );
  }
}

function mapSuggestionsToEvents(
  suggestions: AISuggestion[],
  baseCoords: { lat: number; lng: number },
  tenantId: string | null
): Event[] {
  return suggestions.map((suggestion, index) => {
    const title = sanitizeText(suggestion.name) || `AI Suggestion ${index + 1}`;
    const typeTag = sanitizeText(suggestion.type);
    const distanceTag = sanitizeText(suggestion.distance);
    const tip = sanitizeText(suggestion.tip);
    const description = sanitizeText(suggestion.description) || "A spontaneous local experience worth checking out.";

    const detailSegments = [description];
    if (distanceTag) detailSegments.push(`Distance: ${distanceTag}`);
    if (tip) detailSegments.push(`Tip: ${tip}`);

    const tags = [typeTag, distanceTag, tip ? "Insider tip" : null]
      .filter((value): value is string => Boolean(value))
      .map((value) => value.substring(0, 40));

    const lat = jitterCoordinate(baseCoords.lat);
    const lng = jitterLongitude(baseCoords.lng);

    const slug = toSlug(title, `ai-${index}`);
    const tenantSegment = tenantId ? toSlug(tenantId, "tenant") : "default";

    return {
      id: `AI-${tenantSegment}-${slug}-${Date.now()}-${index}`,
      title,
      description: detailSegments.join(" • "),
      tags,
      location: { lat, lng },
      createdBy: "ai",
      createdAt: new Date(),
      source: "AI" as const,
      tenantId: tenantId ?? undefined,
      creator: {
        uid: "ai",
        name: "AI Concierge",
        profileImageUrl: "/default-profile.png",
      },
    };
  });
}

/**
 * @deprecated Use generateLocalAISuggestions for richer results.
 */
export async function generateAIEvent(
  location: string = "New York",
  tenantId: string | null = null
): Promise<Event | null> {
  const [firstSuggestion] = await generateLocalAISuggestions({
    location,
    tenantId,
  });
  return firstSuggestion ?? null;
}
