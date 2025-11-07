export interface FirestoreTimestampLike {
  toDate?: () => Date;
  seconds?: number;
}

export interface FirestoreEventRecord {
  id: string;
  title: string;
  description?: string;
  date?: string;
  location?: unknown;
  createdBy?: string;
  profileImageUrl?: string;
  tenantId?: string;
  createdAt?: Date | string | FirestoreTimestampLike;
  tags?: string[];
  [key: string]: any;
}

