import { NextRequest, NextResponse } from "next/server";

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const MEETUP_ACCESS_TOKEN = process.env.MEETUP_ACCESS_TOKEN;
const EVENTBRITE_TOKEN = process.env.EVENTBRITE_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;

interface OsmElement {
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

interface AiCard {
  title: string;
  description: string;
  tags?: string[];
  navigationUrl?: string;
  vibe?: string;
}

interface MeetupEventApi {
  id: string;
  name: string;
  description?: string;
  time?: number;
  link?: string;
  group?: {
    name?: string;
  };
}

interface MeetupApiResponse {
  events?: MeetupEventApi[];
}

interface EventbriteEventApi {
  id: string;
  name?: {
    text?: string;
  };
  description?: {
    text?: string;
  };
  url?: string;
  start?: {
    local?: string;
  };
}

interface EventbriteApiResponse {
  events?: EventbriteEventApi[];
}

interface OpenWeatherResponse {
  main?: {
    temp?: number;
  };
  weather?: Array<{
    description?: string;
  }>;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { timestamp: number; payload: unknown }>();

const RATE_LIMIT_COOLDOWN_MS = 10 * 60 * 1000; // 5 minutes, but cooldown longer to be safe
const RATE_LIMIT_KEY = "__openaiRateLimitUntil";

function isOpenAiRateLimited(): boolean {
  const until = (globalThis as Record<string, unknown>)[RATE_LIMIT_KEY];
  return typeof until === "number" && Date.now() < until;
}

function setOpenAiRateLimited() {
  (globalThis as Record<string, unknown>)[RATE_LIMIT_KEY] = Date.now() + RATE_LIMIT_COOLDOWN_MS;
}

function buildCacheKey(lat: number, lon: number, mood: string | null | undefined) {
  const normalizedLat = lat.toFixed(3);
  const normalizedLon = lon.toFixed(3);
  return `${normalizedLat}:${normalizedLon}:${mood ?? "default"}`;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) {
      console.warn(`[spontaneous-cards] Request failed ${url}`, res.status, res.statusText);
      return null;
    }
    return (await res.json()) as T;
  } catch (error) {
    console.warn(`[spontaneous-cards] Request error ${url}`, error);
    return null;
  }
}

// --- 1. Fetch OpenStreetMap POIs via Overpass ---
async function fetchOSMData(lat: number, lon: number) {
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

  return elements.map((el) => ({
    id: el.id,
    name: el.tags?.name ?? "Unnamed",
    type: el.tags?.amenity ?? el.tags?.leisure ?? el.tags?.tourism ?? "unknown",
    lat: el.lat,
    lon: el.lon,
  }));
}

// --- 2. Fetch Meetup events ---
async function fetchMeetupEvents(lat: number, lon: number) {
  if (!MEETUP_ACCESS_TOKEN) return [];
  const url = `https://api.meetup.com/find/upcoming_events?lat=${lat}&lon=${lon}&radius=10`;
  const data = await fetchJson<MeetupApiResponse>(url, {
    headers: {
      Authorization: `Bearer ${MEETUP_ACCESS_TOKEN}`,
    },
  });

  return (data?.events ?? []).map((event) => ({
    id: event.id,
    name: event.name,
    description: event.description,
    time: event.time,
    link: event.link,
    group: event.group?.name,
    type: "meetup",
  }));
}

// --- 3. Fetch Eventbrite events ---
async function fetchEventbriteEvents(lat: number, lon: number) {
  if (!EVENTBRITE_TOKEN) return [];
  const url = `https://www.eventbriteapi.com/v3/events/search/?location.latitude=${lat}&location.longitude=${lon}&location.within=10km`;
  const data = await fetchJson<EventbriteApiResponse>(url, {
    headers: {
      Authorization: `Bearer ${EVENTBRITE_TOKEN}`,
    },
  });

  return (data?.events ?? []).map((event) => ({
    id: event.id,
    name: event.name?.text,
    description: event.description?.text,
    url: event.url,
    start: event.start?.local,
    type: "eventbrite",
  }));
}

// --- 4. Fetch current weather (optional AI context) ---
async function fetchWeather(lat: number, lon: number) {
  if (!OPENWEATHER_API_KEY) return null;
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`;
  const data = await fetchJson<OpenWeatherResponse>(url);
  if (!data?.main || !Array.isArray(data.weather)) {
    return null;
  }
  return {
    temp: data.main.temp,
    description: data.weather[0]?.description,
  };
}

// --- 5. Call GPT to generate AI cards ---
async function generateAICards(userContext: Record<string, unknown>, combinedData: unknown[]) {
  if (!OPENAI_API_KEY) return [];
  if (isOpenAiRateLimited()) {
    console.warn("[spontaneous-cards] OpenAI rate limit previously reached – skipping call.");
    return [];
  }

  const prompt = `
  You are a travel concierge.
  User location: ${userContext.lat}, ${userContext.lon}
  Mood: ${userContext.mood || "adventurous"}
  Current weather: ${JSON.stringify(userContext.weather || {})}
  Nearby data: ${JSON.stringify(combinedData)}
  Generate 5 spontaneous, friendly travel cards with:
    - title
    - description
    - vibe tags (fun, chill, social, cultural)
    - navigation link if available
  Return as a JSON array.
  `;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 600,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    console.warn("[spontaneous-cards] OpenAI request failed", response.status, text);
    if (response.status === 429) {
      setOpenAiRateLimited();
    }
    return [];
  }

  const json = await response.json();
  const text = json?.choices?.[0]?.message?.content ?? "[]";
  try {
    const parsed = JSON.parse(text) as AiCard[];
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (error) {
    console.error("Failed to parse GPT response:", error, text);
    return [];
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  const mood = searchParams.get("mood") || "adventurous";

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
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
    const userContext = { lat, lon, mood, weather };

    let aiCards: AiCard[] = [];
    try {
      aiCards = await generateAICards(userContext, combinedData);
    } catch (error) {
      console.warn("[spontaneous-cards] AI generation failed", error);
      aiCards = [];
    }

    const payload = { aiCards, combinedData, weather };
    cache.set(cacheKey, { timestamp: Date.now(), payload });
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[spontaneous-cards] Unexpected error", error);
    return NextResponse.json(
      { error: "Failed to generate spontaneous cards" },
      { status: 500 },
    );
  }
}
