import { test } from "node:test";
import assert from "node:assert/strict";
import { mapHangoutDocument } from "../hangouts";

test("mapHangoutDocument maps Firestore data with timestamp correctly", () => {
  const createdAt = new Date("2024-01-01T12:00:00Z");
  const docData = {
    title: "Board Games Night",
    description: "Join us for strategy games and snacks.",
    tags: ["games", "social"],
    createdBy: "user-123",
    location: { lat: 40.7128, lng: -74.006 },
    createdAt: {
      toDate: () => createdAt,
    },
    tenantId: "tenant-42",
  };

  const result = mapHangoutDocument(docData, "hangout-1");

  assert.equal(result.id, "hangout-1");
  assert.equal(result.title, docData.title);
  assert.equal(result.description, docData.description);
  assert.deepEqual(result.tags, docData.tags);
  assert.deepEqual(result.location, docData.location);
  assert.equal(result.createdBy, docData.createdBy);
  assert.equal(result.tenantId, docData.tenantId);
  assert.equal(result.source, "User");
  assert.ok(result.createdAt instanceof Date);
  assert.equal((result.createdAt as Date).toISOString(), createdAt.toISOString());
});

test("mapHangoutDocument falls back to safe defaults", () => {
  const result = mapHangoutDocument({}, "fallback-id");

  assert.equal(result.id, "fallback-id");
  assert.equal(result.title, "");
  assert.equal(result.description, "");
  assert.deepEqual(result.tags, []);
  assert.deepEqual(result.location, { lat: 0, lng: 0 });
  assert.equal(result.createdBy, "unknown");
  assert.equal(result.source, "User");
  assert.ok(result.createdAt instanceof Date);
});

test("mapHangoutDocument handles native Date values", () => {
  const nativeDate = new Date("2024-05-15T09:30:00Z");
  const docData = {
    title: "Morning Run",
    createdAt: nativeDate,
  };

  const result = mapHangoutDocument(docData, "hangout-2");

  assert.equal(result.title, "Morning Run");
  assert.equal((result.createdAt as Date).toISOString(), nativeDate.toISOString());
});

