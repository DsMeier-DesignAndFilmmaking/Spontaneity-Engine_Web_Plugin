import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { validateEventData } from "@/lib/helpers";
import { EventFormData } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, description, tags, location, userId, startTime } = body;

    // Validate authentication
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required", message: "User ID is required" },
        { status: 401 }
      );
    }

    // Validate event data
    const validation = validateEventData({ title, description, tags, location, startTime });
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Validation failed", errors: validation.errors },
        { status: 400 }
      );
    }

    // Prepare event data
    const eventData: EventFormData = {
      title: title.trim(),
      description: description.trim(),
      tags: Array.isArray(tags) ? tags.filter((tag: string) => tag.trim().length > 0) : [],
      location: {
        lat: Number(location.lat),
        lng: Number(location.lng),
      },
      startTime: new Date(startTime ?? Date.now()).toISOString(),
    };

    // Save to Firestore
    const eventsRef = collection(db, "hangOuts");
    const docRef = await addDoc(eventsRef, {
      ...eventData,
      createdAt: serverTimestamp(),
      createdBy: userId,
    });

    return NextResponse.json({
      success: true,
      message: "Event submitted successfully",
      id: docRef.id,
    });
  } catch (error: any) {
    console.error("Error submitting event:", error);
    return NextResponse.json(
      { error: "Failed to submit event", message: error.message },
      { status: 500 }
    );
  }
}
