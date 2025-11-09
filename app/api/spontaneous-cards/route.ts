import { NextRequest, NextResponse } from "next/server";

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const MEETUP_ACCESS_TOKEN = process.env.MEETUP_ACCESS_TOKEN;
const EVENTBRITE_TOKEN = process.env.EVENTBRITE_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;

interface OsmElement {
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

type ModelSource = "openai" | "gemini";
type AiSource = ModelSource | "fallback";

interface CombinedDatum {
  id: string;
  name: string;
  type: string;
  description?: string;
  lat?: number;
  lon?: number;
  url?: string | null;
  tags?: string[];
  source: string;
}

interface NormalizedAiCard {
  title: string;
  description: string;
  vibeTags: string[];
  navigationLink: string | null;
  source: AiSource;
}

interface WeatherSnapshot {
  temp?: number;
  description?: string;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const RATE_LIMIT_COOLDOWN_MS = 10 * 60 * 1000;
const FALLBACK_CARD_COUNT = 5;

const cache = new Map<string, { timestamp: number; payload: unknown }>();
const rateLimitRegistry: Partial<Record<ModelSource, number>> = {};

function buildCacheKey(lat: number, lon: number, mood: string | null | undefined) {
  return `${lat.toFixed(3)}:${lon.toFixed(3)}:${mood ?? "default"}`;
}

function isModelRateLimited(model: ModelSource): boolean {
  const until = rateLimitRegistry[model];
  return typeof until === "number" && Date.now() < until;
}

function setModelRateLimited(model: ModelSource) {
  rateLimitRegistry[model] = Date.now() + RATE_LIMIT_COOLDOWN_MS;
}

function sanitizeString(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "";
}

function normalizeVibeTags(value: unknown, fallbackTags: string[]): string[] {
  const tags = new Set<string>();

  if (Array.isArray(value)) {
    for (const entry of value) {
      const tag = sanitizeString(entry).slice(0, 32);
      if (tag) tags.add(tag);
    }
  } else if (typeof value === "string" && value.trim().length > 0) {
    value
      .split(/[,/]|\s+-\s+/)
      .map((token) => token.trim())
      .filter(Boolean)
      .forEach((token) => tags.add(token.slice(0, 32)));
  }

  if (tags.size === 0) {
    fallbackTags
      .map((tag) => sanitizeString(tag).slice(0, 32))
      .filter(Boolean)
      .forEach((tag) => tags.add(tag));
  }

  if (tags.size === 0) {
    tags.add("spontaneous");
  }

  return Array.from(tags).slice(0, 4);
}

function normalizeNavigationLink(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

function normalizeCard(raw: unknown, source: AiSource, fallbackTags: string[]): NormalizedAiCard | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const candidate = raw as Partial<NormalizedAiCard> & {
    title?: unknown;
    description?: unknown;
    vibeTags?: unknown;
    navigationLink?: unknown;
  };

  const title = sanitizeString(candidate.title);
  const description = sanitizeString(candidate.description);
  if (!title || !description) {
    return null;
  }

  const vibeTags = normalizeVibeTags(candidate.vibeTags, fallbackTags);
  const navigationLink = normalizeNavigationLink(candidate.navigationLink);

  return {
    title,
    description,
    vibeTags,
    navigationLink,
    source,
  };
}

function normalizeCollection(raw: unknown, source: AiSource, fallbackTags: string[]): NormalizedAiCard[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((entry) => normalizeCard(entry, source, fallbackTags))
    .filter((card): card is NormalizedAiCard => Boolean(card));
}

function dedupeCards(cards: NormalizedAiCard[]): NormalizedAiCard[] {
  const seen = new Set<string>();
  const deduped: NormalizedAiCard[] = [];

  for (const card of cards) {
    const key = card.title.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(card);
  }

  return deduped;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) {
      console.warn(`[spontaneous-cards] Request failed`, { url, status: res.status, statusText: res.statusText });
      return null;
    }
    return (await res.json()) as T;
  } catch (error) {
    console.warn(`[spontaneous-cards] Request error`, { url, error });
    return null;
  }
}

async function fetchOSMData(lat: number, lon: number): Promise<CombinedDatum[]> {
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="cafe"](around:1200, ${lat}, ${lon});
      node["amenity"="restaurant"](around:1200, ${lat}, ${lon});
      node["amenity"="bar"](around:1200, ${lat}, ${lon});
      node["amenity"="pub"](around:1200, ${lat}, ${lon});
      node["leisure"="park"](around:1200, ${lat}, ${lon});
      node["leisure"="garden"](around:1200, ${lat}, ${lon});
      node["tourism"="museum"](around:1200, ${lat}, ${lon});
      node["tourism"="viewpoint"](around:1200, ${lat}, ${lon});
      node["tourism"="artwork"](around:1200, ${lat}, ${lon});
      node["tourism"="gallery"](around:1200, ${lat}, ${lon});
      node["amenity"="cinema"](around:1200, ${lat}, ${lon});
    );
    out center;
  `;

  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
  const data = await fetchJson<{ elements?: OsmElement[] }>(url);
  const elements = data?.elements ?? [];

  return elements.map((element) => {
    const name = sanitizeString(element.tags?.name) || "Local Gem";
    const type = sanitizeString(
      element.tags?.amenity || element.tags?.leisure || element.tags?.tourism || "experience",
    );
    const website = sanitizeString(element.tags?.website) || sanitizeString(element.tags?.url);

    return {
      id: `osm-${element.id}`,
      name,
      type,
      lat: element.lat,
      lon: element.lon,
      description: sanitizeString(element.tags?.description),
      url: website || `https://www.openstreetmap.org/node/${element.id}`,
      tags: [type, sanitizeString(element.tags?.cuisine)].filter(Boolean),
      source: "osm",
    } satisfies CombinedDatum;
  });
}

interface MeetupEventApi {
  id: string;
  name: string;
  description?: string;
  time?: number;
  link?: string;
  group?: { name?: string };
  venue?: { lat?: number; lon?: number; address_1?: string };
}

interface MeetupApiResponse {
  events?: MeetupEventApi[];
}

async function fetchMeetupEvents(lat: number, lon: number): Promise<CombinedDatum[]> {
  if (!MEETUP_ACCESS_TOKEN) return [];
  const url = `https://api.meetup.com/find/upcoming_events?lat=${lat}&lon=${lon}&radius=10`;
  const data = await fetchJson<MeetupApiResponse>(url, {
    headers: { Authorization: `Bearer ${MEETUP_ACCESS_TOKEN}` },
  });

  return (data?.events ?? []).map((event) => {
    const title = sanitizeString(event.name) || "Meetup Hangout";
    const vibeTags = ["meetup", sanitizeString(event.group?.name)];

    return {
      id: `meetup-${event.id}`,
      name: title,
      type: "meetup",
      description: sanitizeString(event.description),
      lat: typeof event.venue?.lat === "number" ? event.venue.lat : undefined,
      lon: typeof event.venue?.lon === "number" ? event.venue.lon : undefined,
      url: sanitizeString(event.link) || null,
      tags: vibeTags.filter(Boolean),
      source: "meetup",
    } satisfies CombinedDatum;
  });
}

interface EventbriteEventApi {
  id: string;
  name?: { text?: string };
  description?: { text?: string };
  url?: string;
  start?: { local?: string };
  venue?: { latitude?: string; longitude?: string };
}

interface EventbriteApiResponse {
  events?: EventbriteEventApi[];
}

async function fetchEventbriteEvents(lat: number, lon: number): Promise<CombinedDatum[]> {
  if (!EVENTBRITE_TOKEN) return [];
  const url = `https://www.eventbriteapi.com/v3/events/search/?location.latitude=${lat}&location.longitude=${lon}&location.within=10km`;
  const data = await fetchJson<EventbriteApiResponse>(url, {
    headers: { Authorization: `Bearer ${EVENTBRITE_TOKEN}` },
  });

  return (data?.events ?? []).map((event) => {
    const title = sanitizeString(event.name?.text) || "Eventbrite Pick";
    const description = sanitizeString(event.description?.text);
    const latitude = event.venue?.latitude ? parseFloat(event.venue.latitude) : undefined;
    const longitude = event.venue?.longitude ? parseFloat(event.venue.longitude) : undefined;

    return {
      id: `eventbrite-${event.id}`,
      name: title,
      type: "event",
      description,
      lat: typeof latitude === "number" && Number.isFinite(latitude) ? latitude : undefined,
      lon: typeof longitude === "number" && Number.isFinite(longitude) ? longitude : undefined,
      url: sanitizeString(event.url) || null,
      tags: ["eventbrite", sanitizeString(event.start?.local)],
      source: "eventbrite",
    } satisfies CombinedDatum;
  });
}

async function fetchWeather(lat: number, lon: number): Promise<WeatherSnapshot | null> {
  if (!OPENWEATHER_API_KEY) return null;
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`;
  const data = await fetchJson<{
    main?: { temp?: number };
    weather?: Array<{ description?: string }>;
  }>(url);

  if (!data) return null;
  return {
    temp: data.main?.temp,
    description: data.weather?.[0]?.description,
  };
}

interface UserContext {
  lat: number;
  lon: number;
  mood: string;
  weather: WeatherSnapshot | null;
}

function buildOpenAiPrompt(context: UserContext, combinedData: CombinedDatum[]) {
  return `You are a hyper-local travel concierge.
Traveler coordinates: ${context.lat.toFixed(4)}, ${context.lon.toFixed(4)}
Traveler mood: ${context.mood}
Weather: ${JSON.stringify(context.weather ?? {})}
Nearby context: ${JSON.stringify(combinedData.slice(0, 12))}

Create 4 upbeat suggestion cards as JSON.
Each card MUST be an object with ONLY these keys:
  "title" - short headline (string)
  "description" - 1-2 sentence summary rooted in nearby context (string)
  "vibeTags" - array of 2-4 short mood descriptors (array of strings)
  "navigationLink" - https URL for more info or empty string if unavailable (string)

Return a valid JSON array. No markdown. No additional commentary.`;
}

async function generateOpenAiCards(context: UserContext, combinedData: CombinedDatum[]): Promise<NormalizedAiCard[]> {
  if (!OPENAI_API_KEY) return [];
  if (isModelRateLimited("openai")) {
    console.warn("[spontaneous-cards] Skipping OpenAI call due to recent rate limit.");
    return [];
  }

  const prompt = buildOpenAiPrompt(context, combinedData);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        max_tokens: 700,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      console.warn("[spontaneous-cards] OpenAI request failed", { status: response.status, detail: text });
      if (response.status === 429) {
        setModelRateLimited("openai");
      }
      return [];
    }

    const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const payload = json?.choices?.[0]?.message?.content ?? "[]";

    let parsed: unknown;
    try {
      parsed = JSON.parse(payload);
    } catch (error) {
      console.error("[spontaneous-cards] Failed to parse OpenAI payload", { error, payload });
      return [];
    }

    const fallbackTags = [context.mood, "openai"];
    return normalizeCollection(parsed, "openai", fallbackTags);
  } catch (error) {
    console.error("[spontaneous-cards] OpenAI fetch error", error);
    return [];
  }
}

function buildGeminiPrompt(context: UserContext, combinedData: CombinedDatum[]) {
  return `You are a spontaneous travel planner.
Traveler coordinates: ${context.lat.toFixed(4)}, ${context.lon.toFixed(4)}
Traveler mood: ${context.mood}
Weather snapshot: ${JSON.stringify(context.weather ?? {})}
Nearby findings: ${JSON.stringify(combinedData.slice(0, 12))}

Generate 4 unique hangout cards as a JSON array. Each item must contain exactly:
  "title": string,
  "description": string (1-2 sentences, grounded in local insight),
  "vibeTags": array of up to 4 short descriptors,
  "navigationLink": string (https URL or empty string if unknown).

Respond with valid JSON only.`;
}

async function generateGeminiCards(context: UserContext, combinedData: CombinedDatum[]): Promise<NormalizedAiCard[]> {
  if (!GEMINI_API_KEY) return [];
  if (isModelRateLimited("gemini")) {
    console.warn("[spontaneous-cards] Skipping Gemini call due to recent rate limit.");
    return [];
  }

  const prompt = buildGeminiPrompt(context, combinedData);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          maxOutputTokens: 700,
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      console.warn("[spontaneous-cards] Gemini request failed", { status: response.status, detail: text });
      if (response.status === 429) {
        setModelRateLimited("gemini");
      }
      return [];
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const textPayload =
      data?.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("")?.trim() ?? "[]";

    let parsed: unknown;
    try {
      parsed = JSON.parse(textPayload);
    } catch (error) {
      console.error("[spontaneous-cards] Failed to parse Gemini payload", { error, textPayload });
      return [];
    }

    const fallbackTags = [context.mood, "gemini"];
    return normalizeCollection(parsed, "gemini", fallbackTags);
  } catch (error) {
    console.error("[spontaneous-cards] Gemini fetch error", error);
    return [];
  }
}

const STATIC_FALLBACKS: NormalizedAiCard[] = [
  {
    title: "Hidden Rooftop Vinyl Session",
    description: "Sip a crafted mocktail while a local DJ spins rare grooves overlooking the skyline.",
    vibeTags: ["chill", "nightlife", "local"],
    navigationLink: null,
    source: "fallback",
  },
  {
    title: "Neighborhood Street Food Crawl",
    description: "Follow a curated path of family-run stalls serving late-night bites just off the main drag.",
    vibeTags: ["foodie", "social", "spontaneous"],
    navigationLink: null,
    source: "fallback",
  },
  {
    title: "Lantern-Lit Urban Garden Stroll",
    description: "Wind through a pocket park strung with lights and meet volunteers tending the community beds.",
    vibeTags: ["calm", "outdoors", "local"],
    navigationLink: null,
    source: "fallback",
  },
];

function generateFallbackCards(combinedData: CombinedDatum[], context: UserContext): NormalizedAiCard[] {
  if (combinedData.length === 0) {
    return STATIC_FALLBACKS;
  }

  const fallbackTags = [context.mood, "local"];

  return combinedData.slice(0, FALLBACK_CARD_COUNT).map((item, index) => {
    const title = item.name || `Local Discovery ${index + 1}`;
    const baseDescription =
      item.description && item.description.length > 12
        ? item.description
        : `Check out this ${item.type || "hangout"} that locals love around here.`;
    const navigationLink = normalizeNavigationLink(item.url);

    return {
      title,
      description: navigationLink ? `${baseDescription} Learn more: ${navigationLink}` : baseDescription,
      vibeTags: normalizeVibeTags(item.tags ?? [item.type], fallbackTags),
      navigationLink,
      source: "fallback" as const,
    };
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  const mood = sanitizeString(searchParams.get("mood")) || "adventurous";

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "Missing lat/lon" }, { status: 400 });
  }

  const cacheKey = buildCacheKey(lat, lon, mood);
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.payload);
  }

  try {
    const [osmData, meetupData, eventbriteData, weather] = await Promise.all([
      fetchOSMData(lat, lon),
      fetchMeetupEvents(lat, lon),
      fetchEventbriteEvents(lat, lon),
      fetchWeather(lat, lon),
    ]);

    const combinedData = [...osmData, ...meetupData, ...eventbriteData];
    const userContext: UserContext = { lat, lon, mood, weather };

    const errorLog: string[] = [];

    const [openAiCards, geminiCards] = await Promise.all([
      generateOpenAiCards(userContext, combinedData).catch((error) => {
        errorLog.push(`openai:${error instanceof Error ? error.message : String(error)}`);
        console.warn("[spontaneous-cards] OpenAI generator threw", error);
        return [] as NormalizedAiCard[];
      }),
      generateGeminiCards(userContext, combinedData).catch((error) => {
        errorLog.push(`gemini:${error instanceof Error ? error.message : String(error)}`);
        console.warn("[spontaneous-cards] Gemini generator threw", error);
        return [] as NormalizedAiCard[];
      }),
    ]);

    let aiCards = dedupeCards([...openAiCards, ...geminiCards]).slice(0, FALLBACK_CARD_COUNT);

    if (aiCards.length === 0) {
      console.warn("[spontaneous-cards] Both AI providers returned no cards. Falling back to deterministic cards.");
      aiCards = dedupeCards(generateFallbackCards(combinedData, userContext));
    }

    const breakdown = aiCards.reduce(
      (acc, card) => {
        acc[card.source] = (acc[card.source] ?? 0) + 1;
        return acc;
      },
      { openai: 0, gemini: 0, fallback: 0 } as Record<AiSource, number>,
    );

    const responsePayload = {
      aiCards: aiCards.map((card) => ({
        title: card.title,
        description: card.description,
        vibeTags: card.vibeTags,
        navigationLink: card.navigationLink,
      })),
      sources: breakdown,
      weather,
      combinedDataCount: combinedData.length,
      diagnostics: {
        openaiRateLimited: isModelRateLimited("openai"),
        geminiRateLimited: isModelRateLimited("gemini"),
        errors: errorLog,
      },
    };

    cache.set(cacheKey, { timestamp: Date.now(), payload: responsePayload });
    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error("[spontaneous-cards] Unexpected error", error);
    return NextResponse.json({ error: "Failed to generate spontaneous cards" }, { status: 500 });
  }
}
