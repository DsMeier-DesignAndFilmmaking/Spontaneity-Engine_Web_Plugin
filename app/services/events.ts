import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  where,
  limit as firestoreLimit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { Event, EventCreator } from "@/lib/types";

export interface FetchEventsOptions {
  limit?: number;
  offset?: number; // For pagination
  tags?: string[]; // Filter by tags
  createdBy?: string; // Filter by creator
  tenantId?: string; // Multi-tenant: filter by tenant
}

export interface PaginatedEvents {
  events: Event[];
  total: number;
  hasMore: boolean;
  lastDoc?: QueryDocumentSnapshot<DocumentData>;
}

type FirestoreTimestampLike = {
  toDate?: () => Date;
  seconds?: number;
};

type RawEventCreator = {
  uid?: unknown;
  name?: unknown;
  profileImageUrl?: unknown;
};

type RawEventData = {
  title?: unknown;
  description?: unknown;
  tags?: unknown;
  location?: unknown;
  createdBy?: unknown;
  createdAt?: unknown;
  startTime?: unknown;
  tenantId?: unknown;
  consentGiven?: unknown;
  creator?: RawEventCreator;
  creatorName?: unknown;
  creatorProfileImageUrl?: unknown;
  createdByName?: unknown;
  profileImageUrl?: unknown;
  displayName?: unknown;
  name?: unknown;
};

const sanitizeString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const DEFAULT_AVATAR = "/default-profile.png";

const resolveTimestamp = (value: unknown): Date => {
  if (value instanceof Date) {
    return value;
  }

  if (value && typeof value === "object") {
    const timestampLike = value as FirestoreTimestampLike;
    if (typeof timestampLike.toDate === "function") {
      try {
        const date = timestampLike.toDate();
        if (date instanceof Date && !Number.isNaN(date.getTime())) {
          return date;
        }
      } catch (error) {
        console.warn("Failed to convert Firestore timestamp via toDate:", error);
      }
    }
    if (typeof timestampLike.seconds === "number") {
      return new Date(timestampLike.seconds * 1000);
    }
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date();
};

interface SubmitEventPayload {
  title: string;
  description: string;
  tags: string[];
  location: { lat: number; lng: number };
  createdBy?: string;
  consentGiven?: boolean;
  creator?: EventCreator;
  creatorName?: string;
  creatorProfileImageUrl?: string;
  startTime?: string;
  [key: string]: unknown;
}

/**
 * Anonymize user ID for GDPR compliance when serving external tenants
 * Uses a hash of the user ID to prevent tracking while maintaining uniqueness
 */
function anonymizeUserId(userId: string): string {
  // Simple hash function (in production, use crypto.createHash)
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `anon-${Math.abs(hash).toString(36)}`;
}

/**
 * Normalize event data to consistent API schema with GDPR compliance
 */
function normalizeEvent(docData: RawEventData, docId: string, anonymize: boolean = false): Event {
  const title = sanitizeString(docData.title) || "";
  const description = sanitizeString(docData.description) || "";
  const createdBy = sanitizeString(docData.createdBy) || "unknown";

  const tags = Array.isArray(docData.tags)
    ? (docData.tags as unknown[]).filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
    : [];

  const rawLocation = docData.location as
    | { lat?: unknown; lng?: unknown }
    | undefined;
  const location =
    rawLocation &&
    typeof rawLocation === "object" &&
    typeof rawLocation.lat === "number" &&
    typeof rawLocation.lng === "number"
      ? { lat: rawLocation.lat, lng: rawLocation.lng }
      : { lat: 0, lng: 0 };

  const rawCreator = docData.creator && typeof docData.creator === "object" ? (docData.creator as RawEventCreator) : undefined;
  const creatorUid =
    sanitizeString(rawCreator?.uid) ||
    createdBy;
  const creatorName =
    sanitizeString(rawCreator?.name) ||
    sanitizeString(docData.creatorName) ||
    sanitizeString(docData.createdByName) ||
    sanitizeString(docData.displayName) ||
    sanitizeString(docData.name);
  const creatorProfileImage =
    sanitizeString(rawCreator?.profileImageUrl) ||
    sanitizeString(docData.creatorProfileImageUrl) ||
    sanitizeString(docData.profileImageUrl) ||
    DEFAULT_AVATAR;

  const creator: EventCreator = {
    uid: creatorUid,
    name: creatorName,
    profileImageUrl: creatorProfileImage,
  };

  const normalized: Event = {
    id: docId,
    title,
    description,
    tags,
    location,
    createdBy,
    createdAt: resolveTimestamp(docData.createdAt),
    source: "User",
    tenantId: sanitizeString(docData.tenantId),
    consentGiven: typeof docData.consentGiven === "boolean" ? docData.consentGiven : true,
    creator,
    startTime:
      typeof docData.startTime === "string" && docData.startTime.trim().length > 0
        ? docData.startTime
        : docData.startTime && typeof docData.startTime === "object" && "toDate" in (docData.startTime as { toDate?: () => Date })
        ? (() => {
            try {
              const converted = (docData.startTime as { toDate: () => Date }).toDate();
              return converted instanceof Date && !Number.isNaN(converted.valueOf())
                ? converted.toISOString()
                : undefined;
            } catch (error) {
              console.warn("Failed to convert startTime timestamp:", error);
              return undefined;
            }
          })()
        : undefined,
  };

  if (anonymize && normalized.createdBy && normalized.createdBy !== "ai" && !normalized.createdBy.startsWith("AI-")) {
    normalized.anonymizedUserId = anonymizeUserId(normalized.createdBy);
  }

  return normalized;
}

export async function fetchUserEvents(options: FetchEventsOptions = {}): Promise<Event[]> {
  if (!db) {
    console.error("Firestore database not initialized");
    return [];
  }

  try {
    const { limit = 50, tags, createdBy, tenantId } = options;
    let q = query(collection(db, "hangOuts"));

    // Apply tenant filter first (required for multi-tenant)
    if (tenantId) {
      q = query(q, where("tenantId", "==", tenantId));
    }

    // Apply filters
    if (createdBy) {
      q = query(q, where("createdBy", "==", createdBy));
    }

    if (tags && tags.length > 0) {
      // Firestore 'in' query supports up to 10 values
      const tagFilter = tags.slice(0, 10);
      q = query(q, where("tags", "array-contains-any", tagFilter));
    }

    // Apply ordering and limit
    try {
      q = query(q, orderBy("createdAt", "desc"), firestoreLimit(limit));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.warn("orderBy query failed, trying without sorting", message);
      q = query(q, firestoreLimit(limit));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => normalizeEvent(doc.data() as RawEventData, doc.id));
  } catch (error) {
    console.error("Error fetching events:", error);
    return [];
  }
}

export async function fetchUserEventsPaginated(
  options: FetchEventsOptions = {},
  lastDoc?: QueryDocumentSnapshot<DocumentData>
): Promise<PaginatedEvents> {
  if (!db) {
    console.error("Firestore database not initialized");
    return { events: [], total: 0, hasMore: false };
  }

  try {
    const { limit = 50, tags, createdBy, tenantId } = options;
    let q = query(collection(db, "hangOuts"));

    // Apply tenant filter first (required for multi-tenant)
    if (tenantId) {
      q = query(q, where("tenantId", "==", tenantId));
    }

    // Apply filters
    if (createdBy) {
      q = query(q, where("createdBy", "==", createdBy));
    }

    if (tags && tags.length > 0) {
      const tagFilter = tags.slice(0, 10);
      q = query(q, where("tags", "array-contains-any", tagFilter));
    }

    // Apply ordering and limit
    try {
      q = query(q, orderBy("createdAt", "desc"));
      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }
      q = query(q, firestoreLimit(limit + 1)); // Fetch one extra to check if there's more
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.warn("orderBy query failed, trying without sorting", message);
      q = query(q, firestoreLimit(limit + 1));
    }

    const snapshot = await getDocs(q);
    const docs = snapshot.docs;
    const hasMore = docs.length > limit;
    const events = (hasMore ? docs.slice(0, limit) : docs).map(doc => 
      normalizeEvent(doc.data() as RawEventData, doc.id)
    );

    return {
      events,
      total: events.length, // Note: Firestore doesn't provide total count easily
      hasMore,
      lastDoc: hasMore ? docs[limit - 1] : undefined,
    };
  } catch (error) {
    console.error("Error fetching paginated events:", error);
    return { events: [], total: 0, hasMore: false };
  }
}

export async function submitEvent(event: SubmitEventPayload, tenantId?: string) {
  if (!tenantId) {
    throw new Error("tenantId is required for multi-tenant support");
  }

  const normalizedStartTime = event.startTime
    ? (() => {
        const parsed = new Date(event.startTime as string);
        return Number.isNaN(parsed.valueOf()) ? undefined : parsed.toISOString();
      })()
    : undefined;

  // Validate required fields
  if (!event.title || !event.description || !event.location) {
    throw new Error("Missing required fields: title, description, and location are required");
  }

  // Ensure location is properly formatted
  if (typeof event.location.lat !== "number" || typeof event.location.lng !== "number") {
    throw new Error("Invalid location: lat and lng must be numbers");
  }

  // Ensure tags is an array
  if (!Array.isArray(event.tags)) {
    event.tags = [];
  }

  const normalizeCreatorInfo = (
    rawCreator?: EventCreator | null,
    fallbackCreatedBy?: string,
    fallbackName?: string,
    fallbackProfileImage?: string
  ): EventCreator => {
    if (rawCreator) {
      return {
        uid: sanitizeString(rawCreator.uid) || fallbackCreatedBy || "unknown",
        name: sanitizeString(rawCreator.name) || sanitizeString(fallbackName) || "Anonymous",
        profileImageUrl:
          sanitizeString(rawCreator.profileImageUrl) ||
          sanitizeString(fallbackProfileImage) ||
          DEFAULT_AVATAR,
      };
    }
    return {
      uid: fallbackCreatedBy || "unknown",
      name: sanitizeString(fallbackName) || "Anonymous",
      profileImageUrl: sanitizeString(fallbackProfileImage) || DEFAULT_AVATAR,
    };
  };

  const creatorInfo = normalizeCreatorInfo(
    event.creator as EventCreator | undefined,
    event.createdBy,
    sanitizeString((event as { creatorName?: string }).creatorName),
    sanitizeString((event as { creatorProfileImageUrl?: string }).creatorProfileImageUrl)
  );

  // Try Admin SDK first (bypasses security rules)
  const adminDb = getAdminDb();
  if (adminDb) {
    try {
      console.log("Using Firebase Admin SDK (bypasses security rules)");
      const docRef = await adminDb.collection("hangOuts").add({
        title: event.title.trim(),
        description: event.description.trim(),
        tags: event.tags,
        location: {
          lat: Number(event.location.lat),
          lng: Number(event.location.lng),
        },
        createdBy: event.createdBy || "unknown",
        creator: creatorInfo,
        tenantId,
        consentGiven: event.consentGiven ?? true,
        startTime: normalizedStartTime,
        createdAt: FieldValue.serverTimestamp(),
      });
      return { id: docRef.id, ...event, startTime: normalizedStartTime, tenantId, creator: creatorInfo };
    } catch (error) {
      console.error("Admin SDK error:", error);
      // Fall through to regular SDK
    }
  }

  // Fallback to regular SDK (if Admin not available)
  if (!db) {
    throw new Error("Firestore database not initialized. Please set up Firebase Admin SDK or configure regular Firebase SDK.");
  }

  try {
    console.log("Using regular Firebase SDK (security rules apply)");
    const ref = collection(db, "hangOuts");
    const docRef = await addDoc(ref, {
      title: event.title.trim(),
      description: event.description.trim(),
      tags: event.tags,
      location: {
        lat: Number(event.location.lat),
        lng: Number(event.location.lng),
      },
      createdBy: event.createdBy || "unknown",
      creator: creatorInfo,
      tenantId,
      consentGiven: event.consentGiven ?? true,
      startTime: normalizedStartTime,
      createdAt: serverTimestamp(),
    });
    return { id: docRef.id, ...event, startTime: normalizedStartTime, tenantId, creator: creatorInfo };
  } catch (error) {
    const err = error as { code?: string; message?: string; name?: string };
    console.error("Firestore submit error:", error);
    console.error("Error code:", err?.code);
    console.error("Error message:", err?.message);
    console.error("Error name:", err?.name);
    
    // Provide more specific error messages
    if (err?.code === "permission-denied" || err?.code === "permission_denied") {
      throw new Error(`Permission denied: Firestore security rules are blocking writes. Please either: 1) Update Firestore rules to allow writes (use 'if true' for development), or 2) Set up Firebase Admin SDK with service account credentials.`);
    }
    if (err?.code === "unavailable") {
      throw new Error("Firestore service unavailable: Check your Firebase configuration and network connection.");
    }
    
    throw new Error(`Failed to save event to Firestore: ${err?.message || err?.code || "Unknown error"}. Code: ${err?.code || "N/A"}`);
  }
}

export async function updateEvent(id: string, updates: Partial<Event>, tenantId?: string) {
  if (!db) {
    throw new Error("Firestore database not initialized");
  }

  if (!tenantId) {
    throw new Error("tenantId is required for multi-tenant support");
  }

  const eventRef = doc(db, "hangOuts", id);
  
  // Verify tenant ownership by fetching the document first
  const eventSnap = await getDoc(eventRef);
  
  if (!eventSnap.exists()) {
    throw new Error("Event not found");
  }

  const eventData = eventSnap.data();
  if (eventData.tenantId !== tenantId) {
    throw new Error("Unauthorized: Tenant mismatch");
  }

  await updateDoc(eventRef, updates);
}

export async function deleteEvent(id: string, tenantId?: string) {
  if (!db) {
    throw new Error("Firestore database not initialized");
  }

  if (!tenantId) {
    throw new Error("tenantId is required for multi-tenant support");
  }

  const eventRef = doc(db, "hangOuts", id);
  
  // Verify tenant ownership before deleting
  const eventDoc = await getDoc(eventRef);
  
  if (!eventDoc.exists()) {
    throw new Error("Event not found");
  }

  const eventData = eventDoc.data();
  if (eventData.tenantId !== tenantId) {
    throw new Error("Unauthorized: Tenant mismatch");
  }

  await deleteDoc(eventRef);
}
