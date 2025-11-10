import type { Event } from "@/lib/types";

export type AdventureCardOrigin = "ai" | "user";

export interface AdventureCard extends Event {
  origin: AdventureCardOrigin;
}

const normalizeString = (value: unknown): string =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const buildCardKey = (card: Event): string => {
  const id = normalizeString(card.id);
  if (id) {
    return id;
  }

  const title = normalizeString(card.title);
  const createdAt =
    card.createdAt instanceof Date
      ? card.createdAt.toISOString()
      : normalizeString(
          typeof card.createdAt === "object" && card.createdAt !== null && "toDate" in card.createdAt
            ? (card.createdAt as { toDate: () => Date }).toDate().toISOString()
            : String(card.createdAt ?? ""),
        );

  const startTime = normalizeString(card.startTime);

  return `${title}-${createdAt}-${startTime}`;
};

export function combineAdventureCards(aiCards: Event[], userCards: Event[]): AdventureCard[] {
  const combined: AdventureCard[] = [];
  const seenKeys = new Set<string>();

  const pushCard = (card: Event, origin: AdventureCardOrigin) => {
    const key = buildCardKey(card);
    if (key && seenKeys.has(key)) {
      return;
    }
    if (key) {
      seenKeys.add(key);
    }
    combined.push({ ...card, origin });
  };

  aiCards.forEach((card) => pushCard(card, "ai"));
  userCards.forEach((card) => pushCard(card, "user"));

  return combined;
}

export function normalizeAdventureIndex(desiredIndex: number, totalCards: number): number {
  if (totalCards <= 0 || Number.isNaN(desiredIndex)) {
    return 0;
  }

  const modulo = desiredIndex % totalCards;
  return modulo >= 0 ? modulo : modulo + totalCards;
}

export function getNextAdventureIndex(currentIndex: number, totalCards: number): number {
  if (totalCards <= 0) {
    return 0;
  }

  const normalizedCurrent = normalizeAdventureIndex(currentIndex, totalCards);
  return normalizeAdventureIndex(normalizedCurrent + 1, totalCards);
}

