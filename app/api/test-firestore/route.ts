import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore";

/**
 * Test endpoint to verify Firestore connection and security rules
 * This helps diagnose Firestore setup issues
 */
export async function GET(req: Request) {
  try {
    if (!db) {
      return NextResponse.json({
        success: false,
        error: "Firestore database not initialized",
        message: "Check Firebase configuration in .env.local",
      }, { status: 500 });
    }

    // Test 1: Try to read from events collection
    try {
      const eventsRef = collection(db, "hangOuts");
      const snapshot = await getDocs(eventsRef);
      
      return NextResponse.json({
        success: true,
        message: "Firestore connection successful",
        tests: {
          databaseInitialized: true,
          canReadCollection: true,
          eventCount: snapshot.docs.length,
          sampleEventIds: snapshot.docs.slice(0, 3).map(doc => doc.id),
        },
        note: "If you see this, Firestore is accessible. Security rules may still block writes.",
      });
    } catch (readError: any) {
      return NextResponse.json({
        success: false,
        error: "Failed to read from Firestore",
        message: readError.message,
        code: readError.code,
        details: "This might indicate security rules are blocking reads, or Firestore is not properly configured.",
      }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: "Test failed",
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    }, { status: 500 });
  }
}

/**
 * Test write to Firestore (requires proper security rules)
 */
export async function POST(req: Request) {
  try {
    if (!db) {
      return NextResponse.json({
        success: false,
        error: "Firestore database not initialized",
      }, { status: 500 });
    }

    const { testData } = await req.json();

    // Try to write a test document
    const eventsRef = collection(db, "hangOuts");
    
    console.log("Attempting to write test document to Firestore...");
    
    const docRef = await addDoc(eventsRef, {
      title: "Test Event",
      description: "This is a test event to verify Firestore security rules",
      tags: ["test"],
      location: { lat: 40.7128, lng: -74.0060 },
      createdBy: "test-user",
      tenantId: "test-tenant",
      createdAt: serverTimestamp(),
      isTest: true,
    });

    console.log("Test document created successfully:", docRef.id);

    return NextResponse.json({
      success: true,
      message: "Test write successful",
      documentId: docRef.id,
      note: "If you see this, Firestore security rules allow writes. The test document was created.",
    });
  } catch (error: any) {
    console.error("Test write error:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    console.error("Error name:", error.name);
    
    return NextResponse.json({
      success: false,
      error: "Test write failed",
      message: error.message,
      code: error.code,
      name: error.name,
      details: {
        permissionDenied: error.code === "permission-denied" || error.code === "permission_denied",
        message: (error.code === "permission-denied" || error.code === "permission_denied")
          ? "Security rules are blocking writes. Please update Firestore rules in Firebase Console to: rules_version = '2'; service cloud.firestore { match /databases/{database}/documents { match /{document=**} { allow read, write: if true; } } }"
          : error.message,
        fullError: process.env.NODE_ENV === "development" ? {
          code: error.code,
          message: error.message,
          name: error.name,
          stack: error.stack,
        } : undefined,
      },
    }, { status: 500 });
  }
}

