import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_KEY || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error("OpenAI API key not configured");
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });
    const { location } = await req.json();
    
    const prompt = `
      Generate one spontaneous local travel event near ${location || "a major city"}.
      Output JSON with keys: title (string), description (string), tags (array of strings), location {lat, lng}.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const content = completion.choices[0]?.message?.content;
    
    if (!content) {
      console.error("No content received from OpenAI");
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    let event;
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanedContent = content.trim();
      cleanedContent = cleanedContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
      cleanedContent = cleanedContent.trim();
      
      event = JSON.parse(cleanedContent);
      
      // Validate required fields
      if (!event.title || !event.description || !event.location) {
        console.error("Invalid event structure:", event);
        return NextResponse.json(
          { error: "Invalid event structure from AI" },
          { status: 500 }
        );
      }
      
      // Assign a temporary unique ID for AI events
      event.id = "AI-" + Date.now();
      
      // Ensure tags is an array
      if (!Array.isArray(event.tags)) {
        event.tags = [];
      }
      
      // Validate location coordinates
      if (
        typeof event.location.lat !== "number" ||
        typeof event.location.lng !== "number"
      ) {
        console.error("Invalid location coordinates:", event.location);
        return NextResponse.json(
          { error: "Invalid location coordinates from AI" },
          { status: 500 }
        );
      }
    } catch (parseError: any) {
      console.error("JSON parse error:", parseError);
      console.error("AI response content:", content);
      return NextResponse.json(
        { error: "Failed to parse AI output", details: parseError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(event);
  } catch (err: any) {
    console.error("AI generation error:", err);
    return NextResponse.json(
      { error: "AI generation failed", message: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}
