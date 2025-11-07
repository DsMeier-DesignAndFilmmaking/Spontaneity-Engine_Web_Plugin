import { Timestamp } from "firebase/firestore";

export const formatDate = (ts: number | Timestamp | Date) => {
  let date: Date;
  if (ts instanceof Timestamp) {
    date = ts.toDate();
  } else if (ts instanceof Date) {
    date = ts;
  } else {
    date = new Date(ts);
  }
  return date.toLocaleDateString();
};

export const formatDateTime = (ts: number | Timestamp | Date) => {
  let date: Date;
  if (ts instanceof Timestamp) {
    date = ts.toDate();
  } else if (ts instanceof Date) {
    date = ts;
  } else {
    date = new Date(ts);
  }
  return date.toLocaleString();
};

// Validation helpers
export const validateEventData = (data: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data.title || typeof data.title !== "string" || data.title.trim().length === 0) {
    errors.push("Title is required");
  } else if (data.title.length > 100) {
    errors.push("Title must be less than 100 characters");
  }

  if (!data.description || typeof data.description !== "string" || data.description.trim().length === 0) {
    errors.push("Description is required");
  } else if (data.description.length > 1000) {
    errors.push("Description must be less than 1000 characters");
  }

  // Tags are optional, but if provided must be valid
  if (data.tags !== undefined) {
    if (!Array.isArray(data.tags)) {
      errors.push("Tags must be an array");
    } else if (data.tags.length > 10) {
      errors.push("Maximum 10 tags allowed");
    }
  }

  if (!data.location || typeof data.location !== "object") {
    errors.push("Location is required");
  } else {
    if (typeof data.location.lat !== "number" || typeof data.location.lng !== "number") {
      errors.push("Location must have valid lat and lng numbers");
    } else if (data.location.lat < -90 || data.location.lat > 90) {
      errors.push("Latitude must be between -90 and 90");
    } else if (data.location.lng < -180 || data.location.lng > 180) {
      errors.push("Longitude must be between -180 and 180");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};


