import type { Feature, LineString } from "geojson";
import mapboxgl from "mapbox-gl";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_KEY || "";

export default mapboxgl;

export interface DirectionsStep {
  distance: number;
  duration: number;
  name?: string;
  instruction: string;
}

export interface NavigationRoutePayload {
  feature: Feature<LineString>;
  steps: DirectionsStep[];
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number; name?: string };
  title?: string;
}

interface MapboxDirectionsResponse {
  routes?: Array<{
    geometry?: { coordinates: [number, number][]; type: string };
    legs?: Array<{
      steps?: Array<{
        distance: number;
        duration: number;
        name?: string;
        maneuver?: { instruction?: string };
      }>;
    }>;
  }>;
  code?: string;
  message?: string;
}

export async function getWalkingRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<{
  feature: Feature<LineString>;
  steps: DirectionsStep[];
}> {
  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_KEY;
  if (!accessToken) {
    throw new Error("Mapbox access token is not configured. Set NEXT_PUBLIC_MAPBOX_KEY.");
  }

  const url = new URL(
    `https://api.mapbox.com/directions/v5/mapbox/walking/${origin.lng},${origin.lat};${destination.lng},${destination.lat}`
  );
  url.searchParams.set("steps", "true");
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("overview", "full");
  url.searchParams.set("access_token", accessToken);

  let response: Response;
  try {
    response = await fetch(url.toString());
  } catch (networkError) {
    throw new Error("Network error contacting Mapbox Directions API.");
  }

  if (!response.ok) {
    const message = await response.text();
    if (response.status === 422 && message.includes("Route exceeds maximum distance")) {
      throw new Error(
        "Walking route is too long for Mapbox. Try a closer destination or switch to driving directions."
      );
    }
    throw new Error(`Failed to fetch directions: ${response.status} ${message}`);
  }

  const data = (await response.json()) as MapboxDirectionsResponse;
  const route = data.routes?.[0];
  if (!route || !route.geometry || route.geometry.type !== "LineString") {
    throw new Error("No walking route found.");
  }

  const feature: Feature<LineString> = {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: route.geometry.coordinates,
    },
    properties: {},
  };

  const steps: DirectionsStep[] =
    route.legs?.[0]?.steps?.map((step) => ({
      distance: step.distance,
      duration: step.duration,
      name: step.name,
      instruction: step.maneuver?.instruction || "",
    })) ?? [];

  return { feature, steps };
}
