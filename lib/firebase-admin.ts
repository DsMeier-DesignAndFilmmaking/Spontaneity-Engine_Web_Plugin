import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

let adminApp: App | null = null;
let adminDb: FirebaseFirestore.Firestore | null = null;

/**
 * Initialize Firebase Admin SDK
 * This bypasses Firestore security rules (good for server-side operations)
 */
export function initializeAdmin() {
  if (adminApp) {
    return { app: adminApp, db: adminDb! };
  }

  try {
    // Check if already initialized
    const existingApps = getApps();
    if (existingApps.length > 0) {
      adminApp = existingApps[0];
      adminDb = getFirestore(adminApp);
      return { app: adminApp, db: adminDb };
    }

    // Initialize with project config
    // For production, use service account key file or environment variables
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    
    if (!projectId) {
      console.warn("Firebase Admin: No project ID found. Using default initialization.");
    }

    // Option 1: Use service account key from environment variable (recommended for production)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        adminApp = initializeApp({
          credential: cert(serviceAccount),
          projectId: projectId || serviceAccount.project_id,
        });
      } catch (parseError) {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", parseError);
      }
    }

    // Option 2: Use Application Default Credentials (if running on Google Cloud)
    // This will work automatically if you're deployed on Google Cloud
    if (!adminApp) {
      try {
        // For local development, try to initialize with just project ID
        // This will work if GOOGLE_APPLICATION_CREDENTIALS is set, or if running on GCP
        adminApp = initializeApp({
          projectId: projectId || "spontaneous-travel-app",
        }, "firebase-admin-app");
        console.log("Firebase Admin initialized with project ID:", projectId || "spontaneous-travel-app");
      } catch (initError: any) {
        console.warn("Firebase Admin initialization failed:", initError.message);
        console.warn("Firebase Admin: This is expected if service account credentials are not set up.");
        console.warn("Falling back to regular Firebase SDK. Note: Security rules will apply.");
        return { app: null, db: null };
      }
    }

    adminDb = getFirestore(adminApp);
    return { app: adminApp, db: adminDb };
  } catch (error: any) {
    console.error("Firebase Admin initialization error:", error);
    return { app: null, db: null };
  }
}

/**
 * Get Firestore Admin instance (bypasses security rules)
 */
export function getAdminDb() {
  if (!adminDb) {
    const { db } = initializeAdmin();
    return db;
  }
  return adminDb;
}

/**
 * Check if Admin SDK is available
 */
export function isAdminAvailable(): boolean {
  return adminDb !== null;
}

