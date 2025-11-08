import { mockEventbrite, MockEventbriteEvent } from "@/lib/mockData/mockEventbrite";
import { mockFoursquare, MockFoursquareVenue } from "@/lib/mockData/mockFoursquare";
import { mockGooglePlaces, MockGooglePlace } from "@/lib/mockData/mockGooglePlaces";
import { mockOpenWeather, MockOpenWeatherReport } from "@/lib/mockData/mockOpenWeather";

export interface SpontaneousLocation {
  lat: number;
  lng: number;
}

export interface SpontaneousQuery {
  location: SpontaneousLocation;
  mood?: string;
  radius?: number;
  preferences?: string[];
  requestedAt?: string;
}

export type SpontaneousCategory = "event" | "venue" | "place" | "weather";

export interface SpontaneousCard {
  id: string;
  title: string;
  category: SpontaneousCategory;
  description: string;
  location: { lat: number; lng: number; address?: string };
  startTime?: string;
  imageUrl?: string;
  source: string;
}

export const MOCK_SOURCE_LABELS = [
  "MockEventbrite",
  "MockFoursquare",
  "MockGooglePlaces",
  "MockOpenWeather",
] as const;

const EARTH_RADIUS_MILES = 3958.8;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function haversineDistanceMiles(a: SpontaneousLocation, b: SpontaneousLocation): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}

function normalizePreference(value: string) {
  return value.trim().toLowerCase();
}

function matchesMood(candidateMoods: string[] | undefined, targetMood?: string) {
  if (!targetMood) {
    return true;
  }
  if (!candidateMoods || candidateMoods.length === 0) {
    return false;
  }
  const normalizedMood = normalizePreference(targetMood);
  return candidateMoods.some((mood) => normalizePreference(mood) === normalizedMood);
}

function matchesPreferences(candidateTags: string[] | undefined, preferences?: string[]) {
  if (!preferences || preferences.length === 0) {
    return true;
  }
  if (!candidateTags || candidateTags.length === 0) {
    return false;
  }
  const normalizedTags = new Set(candidateTags.map(normalizePreference));
  return preferences.some((preference) => normalizedTags.has(normalizePreference(preference)));
}

function withinRadius(candidateLocation: SpontaneousLocation | undefined, query: SpontaneousQuery) {
  if (!candidateLocation) {
    return false;
  }
  if (!query.radius || query.radius <= 0) {
    return true;
  }
  const distance = haversineDistanceMiles(candidateLocation, query.location);
  return distance <= query.radius;
}

function pickRandomSample<T>(items: T[], min: number, max: number) {
  if (items.length === 0) {
    return [];
  }
  if (items.length <= min) {
    return [...items];
  }
  const target =
    Math.min(max, items.length) === min
      ? min
      : Math.floor(Math.random() * (Math.min(max, items.length) - min + 1)) + min;

  const working = [...items];
  const sample: T[] = [];
  while (working.length > 0 && sample.length < target) {
    const index = Math.floor(Math.random() * working.length);
    sample.push(working.splice(index, 1)[0]);
  }
  return sample;
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeEventbrite(event: MockEventbriteEvent): SpontaneousCard {
  return {
    id: `eventbrite-${event.id}`,
    title: event.title,
    category: event.category,
    description: event.description,
    location: event.location,
    startTime: event.startTime,
    imageUrl: event.imageUrl,
    source: "MockEventbrite",
  };
}

function normalizeFoursquare(venue: MockFoursquareVenue): SpontaneousCard {
  return {
    id: `foursquare-${venue.id}`,
    title: venue.title,
    category: venue.category,
    description: venue.description,
    location: venue.location,
    imageUrl: venue.imageUrl,
    source: "MockFoursquare",
  };
}

function normalizeGooglePlace(place: MockGooglePlace): SpontaneousCard {
  return {
    id: `google-${place.id}`,
    title: place.title,
    category: place.category,
    description: place.description,
    location: place.location,
    imageUrl: place.imageUrl,
    source: "MockGooglePlaces",
  };
}

function normalizeWeather(report: MockOpenWeatherReport): SpontaneousCard {
  return {
    id: `weather-${report.id}`,
    title: report.title,
    category: report.category,
    description: `${report.description} Currently ${report.temperatureC}°C (feels like ${report.feelsLikeC}°C) with ${report.condition}.`,
    location: report.location,
    startTime: report.startTime,
    imageUrl: report.imageUrl,
    source: "MockOpenWeather",
  };
}

async function fetchMockEventbrite(query: SpontaneousQuery) {
  await delay(35);
  const filtered = mockEventbrite.filter(
    (event) =>
      matchesMood(event.moods, query.mood) &&
      matchesPreferences(event.tags, query.preferences) &&
      withinRadius(event.location, query),
  );
  const candidates = filtered.length > 0 ? filtered : mockEventbrite;
  return pickRandomSample(candidates, 3, 5).map(normalizeEventbrite);
}

async function fetchMockFoursquare(query: SpontaneousQuery) {
  await delay(30);
  const filtered = mockFoursquare.filter(
    (venue) =>
      matchesMood(venue.moods, query.mood) &&
      matchesPreferences(venue.tags, query.preferences) &&
      withinRadius(venue.location, query),
  );
  const candidates = filtered.length > 0 ? filtered : mockFoursquare;
  return pickRandomSample(candidates, 3, 5).map(normalizeFoursquare);
}

async function fetchMockGooglePlaces(query: SpontaneousQuery) {
  await delay(40);
  const filtered = mockGooglePlaces.filter(
    (place) =>
      matchesMood(place.moods, query.mood) &&
      matchesPreferences(place.tags, query.preferences) &&
      withinRadius(place.location, query),
  );
  const candidates = filtered.length > 0 ? filtered : mockGooglePlaces;
  return pickRandomSample(candidates, 3, 5).map(normalizeGooglePlace);
}

async function fetchMockOpenWeather(query: SpontaneousQuery) {
  await delay(20);
  const filtered = mockOpenWeather.filter(
    (report) =>
      matchesMood(report.moods, query.mood) &&
      matchesPreferences(report.tags, query.preferences) &&
      withinRadius(report.location, query),
  );
  const candidates = filtered.length > 0 ? filtered : mockOpenWeather;
  return pickRandomSample(candidates, 3, 5).map(normalizeWeather);
}

export async function fetchSpontaneousData(query: SpontaneousQuery): Promise<SpontaneousCard[]> {
  const [eventbrite, foursquare, googlePlaces, weather] = await Promise.all([
    fetchMockEventbrite(query),
    fetchMockFoursquare(query),
    fetchMockGooglePlaces(query),
    fetchMockOpenWeather(query),
  ]);

  const combined = [...eventbrite, ...foursquare, ...googlePlaces, ...weather];

  // Shuffle combined results to mimic varied ordering
  for (let i = combined.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }

  return combined;
}


