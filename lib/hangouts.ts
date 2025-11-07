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
  return {
    id: docId,
    title: typeof docData.title === "string" ? docData.title : "",
    description: typeof docData.description === "string" ? docData.description : "",
    tags: Array.isArray(docData.tags) ? (docData.tags as string[]) : [],
    location: normalizeLocation(docData.location),
    createdBy: typeof docData.createdBy === "string" ? docData.createdBy : "unknown",
    createdAt: resolveCreatedAt(docData.createdAt),
    source: docData.source === "AI" ? "AI" : "User",
    tenantId: typeof docData.tenantId === "string" ? docData.tenantId : undefined,
    consentGiven: typeof docData.consentGiven === "boolean" ? docData.consentGiven : true,
    anonymizedUserId: typeof docData.anonymizedUserId === "string" ? docData.anonymizedUserId : undefined,
  };
}

