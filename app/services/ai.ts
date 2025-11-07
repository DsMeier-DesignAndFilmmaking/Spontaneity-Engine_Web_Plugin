import OpenAI from "openai";
import { getTenantPromptTemplate } from "./tenant";
import type { Event } from "@/lib/types";

const FALLBACK_COORDS = { lat: 40.7128, lng: -74.0060 }; // NYC

interface AISuggestion {
  name?: string;
  type?: string;
  description?: string;
  distance?: string;
  tip?: string;
}

export interface GenerateAISuggestionsOptions {
  location: string;
  tenantId?: string | null;
  coordinates?: { lat: number; lng: number } | null;
  city?: string | null;
  region?: string | null;
  travelerType?: string | null;
  mood?: string | null;
  weather?: string | null;
  timezone?: string | null;
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

  const prompt = `
You are a travel assistant AI specialized in spontaneous local experiences.

User Info:
Location: ${coordinateLabel} (${locationLabel})
Current time: ${localTime}
Traveler type: ${travelerType}
${mood ? `Mood / preference: ${mood}` : ""}
${weather ? `Current weather: ${weather}` : ""}

Task:
Generate 3 unique, specific, and engaging local events or hangouts for the user RIGHT NOW.
Avoid generic suggestions like "visit a park" or "grab coffee".
Each suggestion should include:
- name
- type (Event / Hangout / Pop-up / Local Experience)
- description (1-2 sentences explaining why it's interesting)
- approximate distance or neighborhood
- optional insider tip

Tone: ${tenantTemplate.replace("{location}", locationLabel)}

Output strictly in JSON format with this shape:
[
  {
    "name": "Night Market Stroll",
    "type": "Event",
    "description": "Explore a hidden night market with local food, live music, and artisanal crafts.",
    "distance": "0.5 miles, Downtown",
    "tip": "Best to go between 7-9pm to catch the live music."
  },
  ...
]
Return ONLY the JSON array. No commentary, no markdown.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful travel assistant that only responds with valid JSON arrays.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.9,
      max_tokens: 800,
    });

    const message = completion.choices[0]?.message?.content || "";
    let cleanedContent = message.trim();
    cleanedContent = cleanedContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    const parsed = JSON.parse(cleanedContent);
    if (!Array.isArray(parsed)) {
      throw new Error("AI response was not an array");
    }

    const suggestions = parsed
      .filter((item: AISuggestion) => item && typeof item === "object")
      .slice(0, 3);

    if (!suggestions.length) {
      throw new Error("AI did not return any suggestions");
    }

    return mapSuggestionsToEvents(suggestions, locationCoords || FALLBACK_COORDS, tenantId);
  } catch (error) {
    console.warn("Failed to generate AI suggestions:", error);
    return mapSuggestionsToEvents(FALLBACK_SUGGESTIONS, coordinates || FALLBACK_COORDS, tenantId);
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
