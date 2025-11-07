import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { Event } from "@/lib/types";
import { generateAIEvent } from "@/lib/ai-helpers";

export async function GET(req: Request) {
  try {
    // Check if db is initialized
    if (!db) {
      console.error("Firestore database not initialized");
      // Return AI events only if db is not initialized
      const aiEvents: Event[] = [
        {
          id: "ai-1",
          title: "Street Food Market",
          description: "Taste local dishes downtown. Discover authentic flavors from local vendors.",
          tags: ["food", "local", "outdoors"],
          createdAt: new Date(),
          createdBy: "ai",
          location: { lat: 40.7128, lng: -74.0060 },
        },
      ];
      return NextResponse.json(aiEvents);
    }

    const eventsRef = collection(db, "hangOuts");
    let querySnapshot;
    let events: Event[] = [];
    
    try {
      // Try to query with orderBy first
      const q = query(eventsRef, orderBy("createdAt", "desc"), limit(100));
      querySnapshot = await getDocs(q);
    } catch (orderError: any) {
      // If orderBy fails (e.g., missing index), try without orderBy
      console.warn("orderBy query failed, trying without sorting:", orderError?.message);
      console.warn("Error code:", orderError?.code);
      
      try {
        // Try fetching without orderBy
        querySnapshot = await getDocs(query(eventsRef, limit(100)));
      } catch (fetchError: any) {
        // If even basic fetch fails, log but don't throw - return AI events
        console.error("Failed to fetch from Firestore:", fetchError?.message);
        console.error("Error code:", fetchError?.code);
        // Set empty query snapshot to continue with AI events only
        querySnapshot = null;
      }
    }
    
    // Safely iterate through query snapshot
    if (querySnapshot && typeof querySnapshot.forEach === 'function') {
      try {
        querySnapshot.forEach((doc) => {
          try {
            const data = doc.data();
            // Only add events with required fields
            if (data && data.title && data.description && data.location) {
              events.push({
                id: doc.id,
                title: data.title,
                description: data.description,
                tags: data.tags || [],
                createdAt: data.createdAt || new Date(),
                createdBy: data.createdBy || "unknown",
                location: data.location,
              });
            }
          } catch (docError: any) {
            console.warn("Error processing document:", docError?.message);
          }
        });
      } catch (forEachError: any) {
        console.warn("Error iterating query snapshot:", forEachError?.message);
      }
    }

    // Generate AI events dynamically
    const aiEvents: Event[] = [];
    
    try {
      // Generate 1 AI event based on a random location
      const locations = ["New York", "San Francisco", "London", "Tokyo", "Paris", "Barcelona"];
      const randomLocation = locations[Math.floor(Math.random() * locations.length)];
      
      // Generate AI event using helper function
      const aiEvent = await generateAIEvent(randomLocation);
      
      if (aiEvent) {
        // Ensure AI event has an ID
        aiEvents.push({
          ...aiEvent,
          id: aiEvent.id || `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        });
      }
    } catch (aiError: any) {
      console.warn("Error generating AI events:", aiError?.message);
      // Continue without AI events if generation fails
    }

    // Combine real events with AI events and sort by date
    const allEvents = [...events, ...aiEvents].sort((a, b) => {
      let dateA: Date;
      let dateB: Date;
      
      // Handle Firestore Timestamp
      if (a.createdAt instanceof Date) {
        dateA = a.createdAt;
      } else if (a.createdAt && typeof (a.createdAt as any).toDate === 'function') {
        dateA = (a.createdAt as any).toDate();
      } else if (a.createdAt && typeof a.createdAt === 'object' && 'seconds' in a.createdAt) {
        // Handle Firestore Timestamp format
        dateA = new Date((a.createdAt as any).seconds * 1000);
      } else {
        dateA = new Date(a.createdAt || 0); // fallback
      }
      
      if (b.createdAt instanceof Date) {
        dateB = b.createdAt;
      } else if (b.createdAt && typeof (b.createdAt as any).toDate === 'function') {
        dateB = (b.createdAt as any).toDate();
      } else if (b.createdAt && typeof b.createdAt === 'object' && 'seconds' in b.createdAt) {
        // Handle Firestore Timestamp format
        dateB = new Date((b.createdAt as any).seconds * 1000);
      } else {
        dateB = new Date(b.createdAt || 0); // fallback
      }
      
      return dateB.getTime() - dateA.getTime();
    });

    // Always return an array
    return NextResponse.json(Array.isArray(allEvents) ? allEvents : []);
  } catch (error: any) {
    console.error("Error fetching events:", error);
    console.error("Error stack:", error?.stack);
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      name: error?.name,
    });
    
    // If Firestore fails, try to return at least AI events
    let fallbackAiEvents: Event[] = [];
    
    try {
      const aiEvent = await generateAIEvent("New York");
      if (aiEvent) {
        fallbackAiEvents.push({
          ...aiEvent,
          id: aiEvent.id || `ai-fallback-${Date.now()}`,
        });
      } else {
        // Use static fallback if AI generation fails
        fallbackAiEvents = [
          {
            id: "ai-fallback",
            title: "Street Food Market",
            description: "Taste local dishes downtown. Discover authentic flavors from local vendors.",
            tags: ["food", "local", "outdoors"],
            createdAt: new Date(),
            createdBy: "ai",
            location: { lat: 40.7128, lng: -74.0060 },
          },
        ];
      }
    } catch {
      // Use static fallback if AI generation also fails
      fallbackAiEvents = [
        {
          id: "ai-fallback",
          title: "Street Food Market",
          description: "Taste local dishes downtown. Discover authentic flavors from local vendors.",
          tags: ["food", "local", "outdoors"],
          createdAt: new Date(),
          createdBy: "ai",
          location: { lat: 40.7128, lng: -74.0060 },
        },
      ];
    }
    
    // Return AI events instead of error to prevent UI breaking
    return NextResponse.json(fallbackAiEvents);
  }
}
