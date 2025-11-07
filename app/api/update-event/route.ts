import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { validateEventData } from "@/lib/helpers";

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, updates, eventId, title, description, tags, location, startTime, userId } = body;
    
    // Support both formats: { id, updates } and { eventId, title, description, ... }
    const actualEventId = id || eventId;
    const actualUpdates = updates || {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(tags !== undefined && { tags }),
      ...(location !== undefined && { location }),
      ...(startTime !== undefined && { startTime }),
    };
    const actualUserId = userId || body.userId;

    // Validate authentication
    if (!actualUserId) {
      return NextResponse.json(
        { error: "Authentication required", message: "User ID is required" },
        { status: 401 }
      );
    }

    if (!actualEventId) {
      return NextResponse.json(
        { error: "Missing event ID" },
        { status: 400 }
      );
    }

    // Get the event to check ownership
    const eventRef = doc(db, "hangOuts", actualEventId);
    const eventSnap = await getDoc(eventRef);

    if (!eventSnap.exists()) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    const eventData = eventSnap.data();

    // Check ownership
    if (eventData.createdBy !== actualUserId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "You can only update your own events" },
        { status: 403 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    
    // If using the simpler { id, updates } format
    if (updates) {
      Object.assign(updateData, updates);
    } else {
      // If using the detailed format, validate and prepare
      if (title !== undefined || description !== undefined || tags !== undefined || location !== undefined || startTime !== undefined) {
        const fullData = {
          title: title ?? eventData.title,
          description: description ?? eventData.description,
          tags: tags ?? eventData.tags,
          location: location ?? eventData.location,
          startTime: startTime ?? eventData.startTime,
        };

        const validation = validateEventData(fullData);
        if (!validation.valid) {
          return NextResponse.json(
            { error: "Validation failed", errors: validation.errors },
            { status: 400 }
          );
        }

        if (title !== undefined) updateData.title = title.trim();
        if (description !== undefined) updateData.description = description.trim();
        if (tags !== undefined) {
          updateData.tags = Array.isArray(tags) ? tags.filter((tag: string) => tag.trim().length > 0) : [];
        }
        if (location !== undefined) {
          updateData.location = {
            lat: Number(location.lat),
            lng: Number(location.lng),
          };
        }
        if (startTime !== undefined) {
          updateData.startTime = new Date(startTime).toISOString();
        }
      }
    }

    if (actualUpdates?.startTime !== undefined && updateData.startTime === undefined) {
      const parsed = new Date(actualUpdates.startTime as string);
      updateData.startTime = Number.isNaN(parsed.valueOf()) ? new Date().toISOString() : parsed.toISOString();
    }

    // Update the event
    await updateDoc(eventRef, updateData);

    return NextResponse.json({
      success: true,
      message: "Event updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating event:", error);
    return NextResponse.json(
      { error: "Failed to update event", message: error.message },
      { status: 500 }
    );
  }
}

