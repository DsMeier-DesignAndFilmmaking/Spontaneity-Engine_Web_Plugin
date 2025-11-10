import { test } from "node:test";
import assert from "node:assert/strict";

import type { Event } from "@/lib/types";
import {
  combineAdventureCards,
  getNextAdventureIndex,
  normalizeAdventureIndex,
  type AdventureCard,
} from "../adventureCards";

const buildEvent = (overrides: Partial<Event> = {}): Event => ({
  id: overrides.id,
  title: overrides.title ?? "Sample Adventure",
  description: overrides.description ?? "Description",
  tags: overrides.tags ?? [],
  createdAt: overrides.createdAt ?? new Date(),
  createdBy: overrides.createdBy ?? "user-1",
  location: overrides.location ?? { lat: 0, lng: 0 },
  source: overrides.source,
  tenantId: overrides.tenantId,
  consentGiven: overrides.consentGiven,
  anonymizedUserId: overrides.anonymizedUserId,
  startTime: overrides.startTime,
  creator: overrides.creator,
});

test("combineAdventureCards maintains AI cards first while removing duplicates", () => {
  const aiCard = buildEvent({ id: "ai-1", source: "AI" });
  const duplicateUserCard = buildEvent({ id: "ai-1", createdBy: "user-2", source: "User" });
  const uniqueUserCard = buildEvent({ id: "user-1", source: "User" });

  const combined = combineAdventureCards([aiCard], [duplicateUserCard, uniqueUserCard]);

  assert.equal(combined.length, 2);
  assert.equal(combined[0].id, "ai-1");
  assert.equal(combined[0].origin, "ai");
  assert.equal(combined[1].id, "user-1");
  assert.equal(combined[1].origin, "user");
});

test("normalizeAdventureIndex clamps indices within bounds", () => {
  assert.equal(normalizeAdventureIndex(5, 4), 1);
  assert.equal(normalizeAdventureIndex(-1, 4), 3);
  assert.equal(normalizeAdventureIndex(0, 0), 0);
});

test("getNextAdventureIndex wraps around card collection", () => {
  assert.equal(getNextAdventureIndex(0, 3), 1);
  assert.equal(getNextAdventureIndex(2, 3), 0);
  assert.equal(getNextAdventureIndex(-1, 3), 0);
});

test("combineAdventureCards returns stable references for downstream rendering", () => {
  const aiCards: Event[] = [
    buildEvent({ id: "ai-1", title: "AI Adventure 1" }),
    buildEvent({ id: "ai-2", title: "AI Adventure 2" }),
  ];
  const userCards: Event[] = [
    buildEvent({ id: "user-1", title: "User Event 1" }),
    buildEvent({ id: "user-2", title: "User Event 2" }),
  ];

  const firstPass = combineAdventureCards(aiCards, userCards);
  const secondPass = combineAdventureCards(aiCards, userCards);

  const serialize = (cards: AdventureCard[]) => cards.map((card) => ({ id: card.id, origin: card.origin }));

  assert.deepEqual(serialize(firstPass), serialize(secondPass));
});

