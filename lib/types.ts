import { Timestamp } from "firebase/firestore";

export interface EventCreator {
  uid: string;
  name?: string;
  profileImageUrl?: string;
}

export interface Event {
  id?: string;
  title: string;
  description: string;
  tags: string[];
  createdAt: Timestamp | Date;
  createdBy: string;
  location: {
    lat: number;
    lng: number;
  };
  creator?: EventCreator;
  source?: "AI" | "User"; // For API consistency
  tenantId?: string; // Multi-tenant support
  // GDPR/Privacy compliance fields
  consentGiven?: boolean; // User consent for data processing
  anonymizedUserId?: string; // Anonymized user ID for external tenants
}

export interface EventFormData {
  title: string;
  description: string;
  tags: string[];
  location: {
    lat: number;
    lng: number;
  };
}

export interface ApiError {
  error: string;
  message?: string;
}

