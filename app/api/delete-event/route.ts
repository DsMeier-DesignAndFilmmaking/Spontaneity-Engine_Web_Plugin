import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, deleteDoc } from "firebase/firestore";

export async function DELETE(req: Request) {
  try {
    // Support both query params and JSON body
    const { searchParams } = new URL(req.url);
    let eventId = searchParams.get("eventId");
    let userId = searchParams.get("userId");
    
    // If not in query params, try JSON body
    if (!eventId) {
      try {
        const body = await req.json();
        eventId = body.id || body.eventId;
        userId = userId || body.userId;
      } catch {
        // Body parsing failed, continue with query params
      }
    }

    // Validate authentication
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required", message: "User ID is required" },
        { status: 401 }
      );
    }

    if (!eventId) {
      return NextResponse.json(
        { error: "Missing event ID" },
        { status: 400 }
      );
    }

    // Get the event to check ownership
    const eventRef = doc(db, "hangOuts", eventId);
    const eventSnap = await getDoc(eventRef);

    if (!eventSnap.exists()) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    const eventData = eventSnap.data();

    // Check ownership
    if (eventData.createdBy !== userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "You can only delete your own events" },
        { status: 403 }
      );
    }

    // Delete the event
    await deleteDoc(eventRef);

    return NextResponse.json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting event:", error);
    return NextResponse.json(
      { error: "Failed to delete event", message: error.message },
      { status: 500 }
    );
  }
}

