import type { Timestamp } from "firebase/firestore";
import type { Event } from "./types";

type SupportedTimestamp = Timestamp | Date | string | null | undefined | {
  toDate: () => Date;
};

interface HangoutDocData {
  title?: unknown;
  description?: unknown;
  tags?: unknown;
  location?: unknown;
  createdBy?: unknown;
  createdAt?: SupportedTimestamp;
  source?: unknown;
  tenantId?: unknown;
  consentGiven?: unknown;
  anonymizedUserId?: unknown;
  creator?: {
    uid?: unknown;
    name?: unknown;
    profileImageUrl?: unknown;
  } | null;
  creatorName?: unknown;
  creatorProfileImageUrl?: unknown;
  createdByName?: unknown;
  profileImageUrl?: unknown;
  displayName?: unknown;
  name?: unknown;
}

const DEFAULT_LOCATION = { lat: 0, lng: 0 };

function resolveCreatedAt(createdAt: SupportedTimestamp): Date {
  if (!createdAt) {
    return new Date();
  }

  if (typeof createdAt === "string") {
    const parsed = new Date(createdAt);
    if (!Number.isNaN(parsed.valueOf())) {
      return parsed;
    }
  }

  if (createdAt instanceof Date) {
    return createdAt;
  }

  if (typeof createdAt === "object" && "toDate" in createdAt && typeof createdAt.toDate === "function") {
    try {
      const date = createdAt.toDate();
      if (date instanceof Date && !Number.isNaN(date.valueOf())) {
        return date;
      }
    } catch (error) {
      console.warn("Failed to convert Firestore timestamp via toDate:", error);
    }
  }

  return new Date();
}

function normalizeLocation(location: unknown) {
  if (!location || typeof location !== "object") {
    return DEFAULT_LOCATION;
  }

  const maybeLocation = location as { lat?: unknown; lng?: unknown };
  const { lat, lng } = maybeLocation;
  if (typeof lat === "number" && typeof lng === "number") {
    return { lat, lng };
  }

  return DEFAULT_LOCATION;
}

export function mapHangoutDocument(docData: HangoutDocData = {}, docId: string): Event {
  const sanitizeString = (value: unknown): string | undefined => {
    if (typeof value !== "string") {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  };

  const DEFAULT_AVATAR = "/default-profile.png";
  const creatorUid =
    sanitizeString(docData.creator?.uid) ||
    sanitizeString(docData.createdBy) ||
    "unknown";
  const creatorName =
    sanitizeString(docData.creator?.name) ||
    sanitizeString(docData.creatorName) ||
    sanitizeString(docData.createdByName) ||
    sanitizeString(docData.displayName) ||
    sanitizeString(docData.name) ||
    (creatorUid !== "unknown" && !creatorUid.startsWith("AI-") ? creatorUid : undefined) ||
    "Anonymous";
  const creatorProfileImageUrl =
    sanitizeString(docData.creator?.profileImageUrl) ||
    sanitizeString(docData.creatorProfileImageUrl) ||
    sanitizeString(docData.profileImageUrl) ||
    DEFAULT_AVATAR;

  return {
    id: docId,
    title: typeof docData.title === "string" ? docData.title : "",
    description: typeof docData.description === "string" ? docData.description : "",
    tags: Array.isArray(docData.tags) ? (docData.tags as string[]) : [],
    location: normalizeLocation(docData.location),
    createdBy: typeof docData.createdBy === "string" ? docData.createdBy : creatorUid,
    createdAt: resolveCreatedAt(docData.createdAt),
    source: docData.source === "AI" ? "AI" : "User",
    tenantId: typeof docData.tenantId === "string" ? docData.tenantId : undefined,
    consentGiven: typeof docData.consentGiven === "boolean" ? docData.consentGiven : true,
    anonymizedUserId: typeof docData.anonymizedUserId === "string" ? docData.anonymizedUserId : undefined,
    creator: {
      uid: creatorUid,
      name: creatorName,
      profileImageUrl: creatorProfileImageUrl,
    },
  };
}

