import test from "node:test";
import assert from "node:assert/strict";

import { mergeWithFallbackCards, OPENAI_SOURCE_LABEL } from "@/app/api/spontaneous/fetch/openai";
import type { SpontaneousCard } from "@/lib/fetchSpontaneousData";

function makeCard(id: string, title: string, source = OPENAI_SOURCE_LABEL): SpontaneousCard {
  return {
    id,
    title,
    category: "event",
    description: `Description for ${title}`,
    location: { lat: 0, lng: 0 },
    source,
  };
}

test("mergeWithFallbackCards dedupes by title and caps length", () => {
  const primary = [
    makeCard("a1", "Sunset Rooftop Jam"),
    makeCard("a2", "Hidden Jazz Cafe"),
    makeCard("a3", "Sunset Rooftop Jam"),
  ];
  const fallback = [
    makeCard("b1", "Sunset Rooftop Jam", "MockEventbrite"),
    makeCard("b2", "Canal Night Market", "MockFoursquare"),
    makeCard("b3", "Late Night Gallery Hop", "MockGooglePlaces"),
  ];

  const merged = mergeWithFallbackCards(primary, fallback, 3);

  assert.equal(merged.length, 3);
  assert.deepEqual(
    merged.map((card) => card.title),
    ["Sunset Rooftop Jam", "Hidden Jazz Cafe", "Canal Night Market"],
  );
});

test("mergeWithFallbackCards returns fallback when primary empty", () => {
  const fallback = [
    makeCard("c1", "Hidden Loft Listening Party", "MockEventbrite"),
    makeCard("c2", "Riverside Picnic Pop-up", "MockFoursquare"),
  ];

  const merged = mergeWithFallbackCards([], fallback, 4);

  assert.equal(merged.length, 2);
  assert.deepEqual(merged, fallback);
});
