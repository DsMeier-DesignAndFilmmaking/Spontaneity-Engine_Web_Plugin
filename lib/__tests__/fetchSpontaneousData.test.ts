import test from "node:test";
import assert from "node:assert/strict";

import { fetchSpontaneousData, MOCK_SOURCE_LABELS, SpontaneousCard } from "@/lib/fetchSpontaneousData";

const BASE_LOCATION = { lat: 38.9072, lng: -77.0369 };

function uniqueCategories(cards: SpontaneousCard[]) {
  return Array.from(new Set(cards.map((card) => card.category))).sort();
}

function uniqueSources(cards: SpontaneousCard[]) {
  return Array.from(new Set(cards.map((card) => card.source))).sort();
}

test("fetchSpontaneousData returns normalized cards from all mock sources", async () => {
  const cards = await fetchSpontaneousData({
    location: BASE_LOCATION,
    radius: 5,
    mood: "social",
    preferences: ["food", "live music"],
  });

  assert.ok(cards.length >= 6, "expected aggregated cards from multiple sources");

  const categories = uniqueCategories(cards);
  assert.deepEqual(categories, ["event", "place", "venue", "weather"]);

  const sources = uniqueSources(cards);
  assert.deepEqual(sources, [...MOCK_SOURCE_LABELS].sort());

  cards.forEach((card) => {
    assert.match(card.id, /^[a-z-]+-/);
    assert.ok(card.title.length > 0);
    assert.equal(typeof card.location.lat, "number");
    assert.equal(typeof card.location.lng, "number");
  });
});

test("fetchSpontaneousData falls back to mock data when filters are overly strict", async () => {
  const cards = await fetchSpontaneousData({
    location: BASE_LOCATION,
    radius: 1,
    mood: "mythical-mood",
    preferences: ["intergalactic"],
  });

  assert.ok(cards.length >= 12, "expected fallback to return at least 12 cards");
  const sources = uniqueSources(cards);
  assert.deepEqual(sources, [...MOCK_SOURCE_LABELS].sort());
});



