import { NextResponse } from "next/server";
import { fetchSpontaneousData, MOCK_SOURCE_LABELS, SpontaneousQuery } from "@/lib/fetchSpontaneousData";
import { storeSpontaneousCards } from "@/lib/storeToFirebase";

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

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SpontaneousRequestBody;
    const query = validateRequestBody(body);

    const cards = await fetchSpontaneousData(query);

    try {
      await storeSpontaneousCards(cards, query);
    } catch (storeError) {
      console.warn("Failed to persist spontaneous cards:", storeError);
    }

    return NextResponse.json({
      cards,
      generatedAt: new Date().toISOString(),
      source: [...MOCK_SOURCE_LABELS],
    });
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


