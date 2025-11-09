import OpenAI from "openai";

export const runtime = "edge";

const RATE_LIMIT_COOLDOWN_MS = 10 * 60 * 1000;
const RATE_LIMIT_KEY = "__openaiRateLimitUntil";

function isOpenAiRateLimited(): boolean {
  const until = (globalThis as Record<string, unknown>)[RATE_LIMIT_KEY];
  return typeof until === "number" && Date.now() < until;
}

function setOpenAiRateLimited() {
  (globalThis as Record<string, unknown>)[RATE_LIMIT_KEY] = Date.now() + RATE_LIMIT_COOLDOWN_MS;
}

interface GenerateSpontaneousRequest {
  location?: { lat?: number; lng?: number };
  mood?: string | null;
  preferences?: string[] | null;
  aggregatedCards?:
    | Array<{
        title?: string;
        description?: string;
        category?: string;
        startTime?: string;
        location?: { lat?: number; lng?: number; address?: string };
      }>
    | null;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY,
});

function validateRequest(body: GenerateSpontaneousRequest) {
  const { location, mood, preferences, aggregatedCards } = body ?? {};

  if (!location || typeof location.lat !== "number" || typeof location.lng !== "number") {
    throw new Response(JSON.stringify({ error: "Missing or invalid location coordinates." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  return {
    location: { lat: location.lat, lng: location.lng },
    mood: typeof mood === "string" && mood.trim().length > 0 ? mood.trim() : null,
    preferences: Array.isArray(preferences)
      ? preferences
          .filter((pref): pref is string => typeof pref === "string" && pref.trim().length > 0)
          .map((pref) => pref.trim())
      : [],
    aggregatedCards: Array.isArray(aggregatedCards)
      ? aggregatedCards
          .slice(0, 5)
          .map((card) => ({
            title: card?.title ?? "",
            description: card?.description ?? "",
            category: card?.category ?? "",
            startTime: card?.startTime ?? "",
            location: card?.location ?? {},
          }))
      : [],
  };
}

function buildPrompt({
  location,
  mood,
  preferences,
  aggregatedCards,
}: ReturnType<typeof validateRequest>) {
  const locationLine = `Coordinates: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
  const moodLine = `Mood: ${mood ?? "neutral"}`;
  const preferencesLine =
    preferences.length > 0 ? `Traveler preferences: ${preferences.join(", ")}` : "Traveler preferences: none provided";

  const aggregatedContext =
    aggregatedCards.length > 0
      ? `Existing local context (do not repeat, use for inspiration):
${JSON.stringify(
        aggregatedCards.map((card) => ({
          title: card.title,
          description: card.description,
          category: card.category,
          startTime: card.startTime,
          location: card.location,
        })),
        null,
        2,
      )}`
      : "No prior cards provided.";

  return `
You are an AI travel concierge crafting spontaneous local experiences.

${locationLine}
${moodLine}
${preferencesLine}
${aggregatedContext}

Generate 5 unique, locally grounded travel ideas as a JSON array. Each element MUST be an object with:
- "title": short catchy string
- "description": 1-2 sentence immersive summary rooted in local details
- "category": one of ["event","venue","place","experience","activity"]
- "source": always "OpenAI"
- "location": { "lat": number, "lng": number } (jitter subtly within ~0.01 degrees)
- Optional fields: "startTime", "address"

Rules:
- Return ONLY valid JSON. No prose, no markdown.
- Make each idea distinct, inspired by context but not duplicating it.
- Emphasize serendipity and local flavor.
`;
}

export async function POST(req: Request) {
  let requestData: ReturnType<typeof validateRequest>;

  try {
    const body = (await req.json()) as GenerateSpontaneousRequest;
    requestData = validateRequest(body);
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error("[Spontaneous Generate] Failed to parse request body:", error);
    return new Response(JSON.stringify({ error: "Invalid request payload." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!openai.apiKey) {
    console.error("[Spontaneous Generate] Missing OpenAI API key.");
    return new Response(JSON.stringify({ error: "OpenAI configuration missing." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (isOpenAiRateLimited()) {
    console.warn("[Spontaneous Generate] OpenAI rate limit previously reached – skipping call.");
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
    });
  }

  const userPrompt = buildPrompt(requestData);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.75,
      top_p: 0.9,
      stream: true,
      max_tokens: 900,
      messages: [
        {
          role: "system",
          content:
            "You are an helpful travel planner that ONLY responds with strict JSON arrays per user instructions. Never include commentary.",
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
        } catch (error) {
          console.error("[Spontaneous Generate] Streaming error:", error);
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    const status =
      typeof (error as { status?: number }).status === "number"
        ? (error as { status?: number }).status
        : typeof (error as { code?: number }).code === "number"
        ? (error as { code?: number }).code
        : 500;

    if (status === 429) {
      setOpenAiRateLimited();
      console.warn("[Spontaneous Generate] OpenAI rate limit reached.", error);
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
      });
    }

    console.error("[Spontaneous Generate] OpenAI request failed:", error);
    return new Response(JSON.stringify({ error: "Failed to generate spontaneous suggestions." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
