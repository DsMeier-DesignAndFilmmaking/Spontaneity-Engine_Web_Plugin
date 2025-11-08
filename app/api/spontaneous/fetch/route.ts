import { NextResponse } from "next/server";

import {
  fetchSpontaneousData,
  type SpontaneousCard,
  type SpontaneousQuery,
} from "@/lib/fetchSpontaneousData";
import { storeSpontaneousCards } from "@/lib/storeToFirebase";

import {
  fetchOpenAISpontaneousCards,
  mergeWithFallbackCards,
  OPENAI_SOURCE_LABEL,
} from "./openai";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

interface SpontaneousRequestBody {
  location?: { lat?: number; lng?: number };
  mood?: string;
  radius?: number;
  preferences?: string[];
}

function validateRequestBody(body: SpontaneousRequestBody): SpontaneousQuery {
  const location = body.location;
  if (!location || typeof location.lat !== "number" || typeof location.lng !== "number") {
    throw new Error("Invalid or missing location. Expected { lat: number, lng: number }.");
  }

  const preferences = Array.isArray(body.preferences)
    ? body.preferences.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

  const radius = typeof body.radius === "number" && body.radius > 0 ? body.radius : undefined;
  const mood = typeof body.mood === "string" && body.mood.trim().length ? body.mood.trim() : undefined;

  return {
    location: { lat: location.lat, lng: location.lng },
    radius,
    mood,
    preferences,
    requestedAt: new Date().toISOString(),
  };
}

async function resolveSuggestions(query: SpontaneousQuery): Promise<SpontaneousCard[]> {
  let aiCards: SpontaneousCard[] = [];

  try {
    aiCards = await fetchOpenAISpontaneousCards(query);
  } catch (error) {
    console.warn("Failed to fetch OpenAI spontaneous suggestions. Falling back to mock data.", error);
  }

  if (aiCards.length >= 3) {
    return aiCards;
  }

  const fallbackCards = await fetchSpontaneousData(query);
  if (aiCards.length === 0) {
    return fallbackCards;
  }

  return mergeWithFallbackCards(aiCards, fallbackCards);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SpontaneousRequestBody;
    const query = validateRequestBody(body);

    const cards = await resolveSuggestions(query);

    if (cards.length === 0) {
      throw new Error("No spontaneous suggestions could be generated.");
    }

    try {
      await storeSpontaneousCards(cards, query);
    } catch (storeError) {
      console.warn("Failed to persist spontaneous cards:", storeError);
    }

    const sources = Array.from(
      new Set(cards.map((card) => card.source ?? OPENAI_SOURCE_LABEL)),
    ).sort();

    return NextResponse.json(
      {
        cards,
        generatedAt: new Date().toISOString(),
        source: sources,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to fetch spontaneous experiences",
        message,
      },
      { status: 400 },
    );
  }
}
