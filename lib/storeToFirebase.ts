import { getAdminDb, initializeAdmin } from "@/lib/firebase-admin";
import type { SpontaneousCard, SpontaneousQuery } from "@/lib/fetchSpontaneousData";

export interface StoreSpontaneousResult {
  documentIds: string[];
  failures: Array<{ cardId: string; reason: string }>;
}

function sanitizeQuery(query: SpontaneousQuery) {
  return {
    ...query,
    requestedAt: query.requestedAt ?? new Date().toISOString(),
  };
}

export async function storeSpontaneousCards(
  cards: SpontaneousCard[],
  query: SpontaneousQuery,
): Promise<StoreSpontaneousResult> {
  if (!cards.length) {
    return { documentIds: [], failures: [] };
  }

  initializeAdmin();
  const db = getAdminDb();

  if (!db) {
    console.warn("Firebase Admin SDK is not available; skipping storage of spontaneous cards.");
    return {
      documentIds: [],
      failures: cards.map((card) => ({
        cardId: card.id,
        reason: "Firebase Admin SDK unavailable",
      })),
    };
  }

  const collectionRef = db.collection("spontaneous_cards");
  const metadata = sanitizeQuery(query);
  const storedIds: string[] = [];
  const failures: Array<{ cardId: string; reason: string }> = [];

  const operations = cards.map(async (card) => {
    try {
      const doc = await collectionRef.add({
        ...card,
        storedAt: new Date().toISOString(),
        query: metadata,
      });
      storedIds.push(doc.id);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown Firestore error";
      failures.push({ cardId: card.id, reason });
    }
  });

  await Promise.all(operations);

  return {
    documentIds: storedIds,
    failures,
  };
}


