export interface FirestoreTimestampLike {
  toDate?: () => Date;
  seconds?: number;
}

export interface FirestoreEventRecord {
  id: string;
  title?: string;
  description?: string;
  date?: string;
  location?: unknown;
  createdBy?: string;
  createdAt?: Date | string | FirestoreTimestampLike;
  profileImageUrl?: string;
  tags?: string[];
  tenantId?: string;
  [key: string]: unknown;
}

