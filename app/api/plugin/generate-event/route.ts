import { NextResponse } from "next/server";
import { generateLocalAISuggestions } from "@/app/services/ai";

export async function POST(req: Request) {
  try {
    const { location } = await req.json();
    const suggestions = await generateLocalAISuggestions({
      location: location || "New York",
    });
    if (!suggestions.length) {
      throw new Error("No AI suggestions generated");
    }
    return NextResponse.json(suggestions[0]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(err);
    return NextResponse.json({ error: "Failed to generate AI event", message }, { status: 500 });
  }
}
