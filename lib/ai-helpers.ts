import { Event } from "./types";
import OpenAI from "openai";

/**
 * Generate an AI event using OpenAI directly (for server-side use)
 */
export async function generateAIEvent(
  location?: string,
  context?: string
): Promise<Event | null> {
  try {
    if (!process.env.OPENAI_KEY) {
      console.error("OpenAI API key not configured");
      return null;
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });
    const locationContext = location || "a major city";
    const contextInfo = context ? ` Context: ${context}.` : "";
    
    const prompt = `You are a travel event discovery assistant. Generate one spontaneous, authentic local travel event or experience near ${locationContext}.${contextInfo}

The event should be:
- Unique and interesting (not generic tourist attractions)
- Something a local or spontaneous traveler might discover
- Reasonable to do in a single day or evening
- Have a specific location (not just a city name)

Output ONLY valid JSON with this exact structure (no markdown, no code blocks):
{
  "title": "Event title (max 80 characters)",
  "description": "Detailed description of the event (2-3 sentences, max 300 characters)",
  "tags": ["tag1", "tag2", "tag3"],
  "location": {
    "lat": 40.7128,
    "lng": -74.0060
  }
}

Requirements:
- title: string, engaging and specific
- description: string, compelling and informative
- tags: array of 3-5 relevant strings (e.g., "food", "local", "outdoors", "cultural", "nightlife")
- location: object with lat (number between -90 and 90) and lng (number between -180 and 180)

Return ONLY the JSON object, nothing else.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that generates travel events. Always respond with valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 500,
    });

    const aiResponse = completion.choices[0].message.content || "";
    
    // Clean the response - remove markdown code blocks if present
    let cleanedResponse = aiResponse.trim();
    cleanedResponse = cleanedResponse.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    cleanedResponse = cleanedResponse.trim();
    
    // Parse JSON
    let parsedEvent: any;
    try {
      parsedEvent = JSON.parse(cleanedResponse);
    } catch (parseError: any) {
      console.error("JSON parse error:", parseError);
      console.error("AI response:", aiResponse);
      return null;
    }

    // Validate and map to Event type
    if (!parsedEvent.title || !parsedEvent.description || !parsedEvent.location) {
      console.error("Invalid event structure from AI");
      return null;
    }

    // Ensure tags is an array
    if (!Array.isArray(parsedEvent.tags)) {
      parsedEvent.tags = [];
    }

    // Validate location coordinates
    if (
      typeof parsedEvent.location.lat !== "number" ||
      typeof parsedEvent.location.lng !== "number" ||
      parsedEvent.location.lat < -90 ||
      parsedEvent.location.lat > 90 ||
      parsedEvent.location.lng < -180 ||
      parsedEvent.location.lng > 180
    ) {
      // Use default coordinates if invalid
      parsedEvent.location = { lat: 40.7128, lng: -74.0060 };
    }

    // Map to Event type
    return {
      title: parsedEvent.title.trim(),
      description: parsedEvent.description.trim(),
      tags: parsedEvent.tags.filter((tag: any) => typeof tag === "string" && tag.trim().length > 0),
      location: {
        lat: Number(parsedEvent.location.lat),
        lng: Number(parsedEvent.location.lng),
      },
      createdAt: new Date(),
      createdBy: "ai",
    };
  } catch (error: any) {
    console.error("Error generating AI event:", error);
    return null;
  }
}

/**
 * Generate multiple AI events for different locations
 */
export async function generateMultipleAIEvents(
  locations: string[],
  count: number = 1
): Promise<Event[]> {
  const events: Event[] = [];
  const locationsToUse = locations.slice(0, count);

  for (const location of locationsToUse) {
    const event = await generateAIEvent(location);
    if (event) {
      events.push(event);
    }
    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return events;
}

