"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  limit as firestoreLimit,
  onSnapshot,
  orderBy,
  query,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Event } from "@/lib/types";
import { mapHangoutDocument } from "@/lib/hangouts";

export interface HangoutFeedFilters {
  tenantId?: string;
  tags?: string[];
  limit?: number;
}

export interface UseHangoutsFeedResult {
  hangouts: Event[];
  loading: boolean;
  error: Error | null;
}

const FIRESTORE_INIT_ERROR_MESSAGE =
  "Firestore is not initialized. Verify firebase.ts exports a configured db instance.";

export function useHangoutsFeed(filters: HangoutFeedFilters = {}): UseHangoutsFeedResult {
  const { tenantId, tags, limit } = filters;
  const [hangouts, setHangouts] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(() => Boolean(db));
  const [error, setError] = useState<Error | null>(() => (db ? null : new Error(FIRESTORE_INIT_ERROR_MESSAGE)));
  const lastEmittedPayloadRef = useRef<string>("");

  const queryConstraints = useMemo(() => {
    const constraints: QueryConstraint[] = [];

    if (tenantId) {
      constraints.push(where("tenantId", "==", tenantId));
    }

    if (tags && tags.length > 0) {
      constraints.push(where("tags", "array-contains-any", tags.slice(0, 10)));
    }

    constraints.push(orderBy("createdAt", "desc"));

    if (limit) {
      constraints.push(firestoreLimit(limit));
    }

    return constraints;
  }, [tenantId, tags, limit]);

  useEffect(() => {
    if (!db) {
      console.error("❌ Firestore error:", new Error(FIRESTORE_INIT_ERROR_MESSAGE));
      return;
    }

    console.log("📡 Subscribing to hangOuts...", {
      tenantId,
      tags,
      limit,
    });

    startTransition(() => setLoading(true));

    let hangoutsQuery;
    try {
      hangoutsQuery = query(collection(db, "hangOuts"), ...queryConstraints);
    } catch (queryError) {
      console.warn("⚠️ Failed to create ordered hangOuts query. Falling back to unordered collection.", queryError);
      hangoutsQuery = collection(db, "hangOuts");
    }

    const unsubscribe = onSnapshot(
      hangoutsQuery,
      (snapshot) => {
        const mapped = snapshot.docs.map((doc) => mapHangoutDocument(doc.data(), doc.id));

        if (mapped.length === 0) {
          console.log("⚠️ No hangOuts found for current filters.");
        } else {
          console.log("✅ hangOuts fetched:", mapped);
        }

        const payloadSignature = JSON.stringify(mapped);
        if (payloadSignature !== lastEmittedPayloadRef.current) {
          lastEmittedPayloadRef.current = payloadSignature;
          setHangouts(mapped);
        }

        setError(null);
        setLoading(false);
      },
      (snapshotError) => {
        console.error("❌ Firestore error:", snapshotError);
        setError(snapshotError);
        setHangouts([]);
        setLoading(false);
      },
    );

    return () => {
      console.log("🔌 Unsubscribing from hangOuts feed listener");
      unsubscribe();
    };
  }, [tenantId, tags, limit, queryConstraints]);

  return { hangouts, loading, error };
}

