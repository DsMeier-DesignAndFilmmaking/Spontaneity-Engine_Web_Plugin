"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { getCurrentLocation } from "@/lib/hooks/useGeolocation";
import { Event } from "@/lib/types";
import type { NavigationRoutePayload, DirectionsStep } from "@/lib/mapbox";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_KEY || "";
if (typeof window !== "undefined") {
  console.log("🔑 Mapbox token present:", !!mapboxgl.accessToken);
}

interface MapViewProps {
  events?: Event[];
  onEventClick?: (event: Event) => void;
  selectedEventId?: string;
  mapStyle?: string; // Mapbox style URL
  primaryColor?: string; // For user location marker
  navigationRoute?: NavigationRoutePayload | null;
  onClearNavigation?: () => void;
}

export default function MapView({
  events = [],
  onEventClick,
  selectedEventId,
  mapStyle = "mapbox://styles/mapbox/streets-v12",
  primaryColor = "#3b82f6",
  navigationRoute,
  onClearNavigation,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const userMarker = useRef<mapboxgl.Marker | null>(null);
  const eventMarkers = useRef<mapboxgl.Marker[]>([]);
  const navigationMarkers = useRef<{ origin: mapboxgl.Marker | null; destination: mapboxgl.Marker | null }>({
    origin: null,
    destination: null,
  });
  const [locationPermission, setLocationPermission] = useState<"granted" | "denied" | "prompt" | "checking">("checking");
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [activeSteps, setActiveSteps] = useState<DirectionsStep[]>([]);
  const [activeDestinationName, setActiveDestinationName] = useState<string | undefined>();
  const [activeTitle, setActiveTitle] = useState<string | undefined>();

  const ROUTE_SOURCE_ID = "active-navigation-route";
  const ROUTE_LAYER_ID = "active-navigation-route-layer";

  // Initialize map
  useEffect(() => {
    if (map.current) return;
    if (!mapContainer.current) return;

    mapContainer.current.style.backgroundColor = "transparent";

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: [-74.5, 40], // Default to New York
      zoom: 9,
    });

    map.current.once("style.load", () => {
      const canvas = map.current?.getCanvas();
      if (canvas) {
        canvas.style.backgroundColor = "transparent";
        canvas.style.opacity = "1";
        canvas.style.filter = "none";
      }

      const canvasContainer = map.current?.getCanvasContainer();
      if (canvasContainer instanceof HTMLElement) {
        canvasContainer.style.backgroundColor = "transparent";
      }

      if (map.current?.getFog()) {
        map.current.setFog(null);
      }
    });

    // Resize map when window size changes
    const handleResize = () => {
      if (map.current) {
        map.current.resize();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mapStyle]);

  // Function to center map on user's location
  const centerOnUserLocation = useCallback(async () => {
    if (!map.current) return;

    setIsLocating(true);
    setLocationError(null);

    try {
      const location = await getCurrentLocation({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      });

      // Center map on user location
      map.current.flyTo({
        center: [location.longitude, location.latitude],
        zoom: 13,
        duration: 1500,
      });

      // Remove existing marker if any
      if (userMarker.current) {
        userMarker.current.remove();
      }

      // Create custom marker element
      const el = document.createElement("div");
      el.className = "user-location-marker";
      el.style.width = "20px";
      el.style.height = "20px";
          el.style.borderRadius = "50%";
          el.style.backgroundColor = primaryColor;
          el.style.border = "3px solid white";
          el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
          el.style.cursor = "pointer";

      // Add marker to map
      userMarker.current = new mapboxgl.Marker(el)
        .setLngLat([location.longitude, location.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div class="p-2">
              <p class="font-semibold text-sm">Your Location</p>
              <p class="text-xs text-gray-600">Accuracy: ${Math.round(location.accuracy)}m</p>
            </div>`
          )
        )
        .addTo(map.current);

      setLocationPermission("granted");
    } catch (error: unknown) {
      console.error("Error getting location:", error);
      const message = error instanceof Error ? error.message : "Failed to get your location";
      setLocationError(message);
      
      // Determine permission status from error
      if (message.includes("denied")) {
        setLocationPermission("denied");
      } else {
        setLocationPermission("prompt");
      }
    } finally {
      setIsLocating(false);
    }
  }, [primaryColor]);

  // Check location permission status
  useEffect(() => {
    if (typeof navigator !== "undefined" && "permissions" in navigator) {
      navigator.permissions.query({ name: "geolocation" as PermissionName }).then((result) => {
        setLocationPermission(result.state);
        
        result.addEventListener("change", () => {
          setLocationPermission(result.state);
          // Auto-center if permission changes to granted
          if (result.state === "granted" && map.current) {
            centerOnUserLocation();
          }
        });
      }).catch(() => {
        // Fallback if permissions API is not supported
        setLocationPermission("prompt");
      });
    } else {
      setLocationPermission("prompt");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-center on user location if permission was already granted (don't auto-request)
  useEffect(() => {
    // Only auto-center if permission was already granted (not on first visit)
    if (
      map.current &&
      locationPermission === "granted" &&
      !isLocating &&
      !userMarker.current
    ) {
      // Small delay to ensure map is fully rendered
      const timer = setTimeout(() => {
        centerOnUserLocation();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [locationPermission, centerOnUserLocation, isLocating]);

  const clearNavigationOverlays = useCallback(() => {
    if (!map.current) return;

    const source = map.current.getSource(ROUTE_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData({ type: "FeatureCollection", features: [] });
    }

    if (map.current.getLayer(ROUTE_LAYER_ID)) {
      map.current.removeLayer(ROUTE_LAYER_ID);
    }

    if (map.current.getSource(ROUTE_SOURCE_ID)) {
      map.current.removeSource(ROUTE_SOURCE_ID);
    }

    navigationMarkers.current.origin?.remove();
    navigationMarkers.current.destination?.remove();
    navigationMarkers.current = { origin: null, destination: null };
    setActiveSteps([]);
    setActiveDestinationName(undefined);
    setActiveTitle(undefined);
  }, []);

  useEffect(() => {
    if (!map.current) return;

    if (!navigationRoute) {
      clearNavigationOverlays();
      return;
    }

    const ensureRouteLayer = () => {
      if (!map.current) return;

      const geojson = {
        type: "FeatureCollection" as const,
        features: [navigationRoute.feature],
      };

      if (!map.current.getSource(ROUTE_SOURCE_ID)) {
        map.current.addSource(ROUTE_SOURCE_ID, {
          type: "geojson",
          data: geojson,
        });
      } else {
        const source = map.current.getSource(ROUTE_SOURCE_ID) as mapboxgl.GeoJSONSource;
        source.setData(geojson);
      }

      if (!map.current.getLayer(ROUTE_LAYER_ID)) {
        map.current.addLayer({
          id: ROUTE_LAYER_ID,
          type: "line",
          source: ROUTE_SOURCE_ID,
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#3b82f6",
            "line-width": 6,
            "line-opacity": 0.85,
          },
        });
      }

      navigationMarkers.current.origin?.remove();
      navigationMarkers.current.destination?.remove();

      navigationMarkers.current.origin = new mapboxgl.Marker({ color: "#22c55e" })
        .setLngLat([navigationRoute.origin.lng, navigationRoute.origin.lat])
        .setPopup(new mapboxgl.Popup().setText("You"))
        .addTo(map.current!);

      navigationMarkers.current.destination = new mapboxgl.Marker({ color: "#ef4444" })
        .setLngLat([navigationRoute.destination.lng, navigationRoute.destination.lat])
        .setPopup(
          new mapboxgl.Popup().setText(navigationRoute.destination.name ?? navigationRoute.title ?? "Destination")
        )
        .addTo(map.current!);

      const bounds = new mapboxgl.LngLatBounds();
      navigationRoute.feature.geometry.coordinates.forEach((coord) => {
        bounds.extend(coord as mapboxgl.LngLatLike);
      });
      map.current!.fitBounds(bounds, { padding: 80, duration: 1000 });

      setActiveSteps(navigationRoute.steps);
      setActiveDestinationName(navigationRoute.destination.name);
      setActiveTitle(navigationRoute.title);
    };

    if (map.current.isStyleLoaded()) {
      ensureRouteLayer();
    } else {
      map.current.once("styledata", ensureRouteLayer);
    }

    return () => {
      map.current?.off("styledata", ensureRouteLayer);
    };
  }, [navigationRoute, clearNavigationOverlays]);

  // Update event markers when events change (API-first: consume API data only)
  useEffect(() => {
    if (!map.current || !events.length) {
      // Clear existing markers if no events
      eventMarkers.current.forEach(marker => marker.remove());
      eventMarkers.current = [];
      return;
    }

    // Remove old markers
    eventMarkers.current.forEach(marker => marker.remove());
    eventMarkers.current = [];

    // Add markers for each event
    events.forEach((event) => {
      if (!event.location || !event.location.lat || !event.location.lng) return;

      const isAI = event.source === "AI" || event.createdBy === "ai" || event.id?.startsWith("AI-");
      const isSelected = event.id === selectedEventId;

      // Create marker element
      const el = document.createElement("div");
      el.className = "event-marker";
      el.style.width = isSelected ? "24px" : "20px";
      el.style.height = isSelected ? "24px" : "20px";
      el.style.borderRadius = "50%";
      el.style.backgroundColor = isAI ? "#fbbf24" : "#3b82f6"; // Yellow for AI, blue for user
      el.style.border = isSelected ? "3px solid #ef4444" : "3px solid white";
      el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
      el.style.cursor = "pointer";
      el.style.transition = "all 0.2s";

      // Create marker
      const marker = new mapboxgl.Marker(el)
        .setLngLat([event.location.lng, event.location.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div class="p-2">
              <p class="font-semibold text-sm">${event.title || "Untitled Event"}</p>
              <p class="text-xs text-gray-600">${event.description || ""}</p>
              ${isAI ? '<span class="inline-block mt-1 text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">AI Event</span>' : ""}
            </div>`
          )
        )
        .addTo(map.current!);

      // Add click handler
      if (onEventClick) {
        el.addEventListener("click", () => {
          onEventClick(event);
        });
      }

      eventMarkers.current.push(marker);
    });

    // Cleanup function
    return () => {
      eventMarkers.current.forEach(marker => marker.remove());
      eventMarkers.current = [];
    };
  }, [events, selectedEventId, onEventClick]);

  return (
    <div className="relative w-full h-full min-h-[320px]">
      <div
        ref={mapContainer}
        className="absolute inset-0 w-full h-full z-0"
      />

      {/* Location Button */}
      <button
        onClick={centerOnUserLocation}
        disabled={isLocating}
        className="absolute bottom-16 right-4 md:bottom-5 z-30 bg-white rounded-full p-3 shadow-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Center on my location"
        title="Center on my location"
      >
            {isLocating ? (
              <svg
                className="w-6 h-6 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
                style={{ color: primaryColor }}
              >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{ color: primaryColor }}
              >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        )}
      </button>

      {/* Error Message */}
      {locationError && (
        <div className="absolute top-20 left-4 right-4 z-30 bg-red-50 border border-red-200 text-red-800 px-4 py-2 rounded-lg text-sm shadow-md">
          <div className="flex items-center justify-between">
            <span>{locationError}</span>
            <button
              onClick={() => setLocationError(null)}
              className="ml-2 text-red-600 hover:text-red-800"
              aria-label="Dismiss error"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Permission Prompt (if needed) */}
      {locationPermission === "denied" && !locationError && (
        <div className="absolute top-20 left-4 right-4 z-30 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-lg text-sm shadow-md">
          <p>
            Location access denied. Please enable location permissions in your browser settings to use this feature.
          </p>
        </div>
      )}

      {navigationRoute && activeSteps.length > 0 && (
        <div className="pointer-events-auto absolute left-4 top-4 z-40 max-h-[75vh] w-72 overflow-hidden rounded-2xl bg-white/95 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <div>
              <p className="text-xs font-medium uppercase text-blue-600">Walking Directions</p>
              <h3 className="text-sm font-semibold text-gray-900">
                {activeTitle ?? activeDestinationName ?? "Destination"}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                clearNavigationOverlays();
                onClearNavigation?.();
              }}
              className="rounded-full p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close navigation"
            >
              ×
            </button>
          </div>

          <ol className="max-h-[60vh] space-y-2 overflow-y-auto px-4 py-3 text-xs text-gray-700">
            {activeSteps.map((step, index) => (
              <li key={`${step.instruction}-${index}`} className="rounded-lg bg-gray-50 p-3">
                <p className="font-semibold text-gray-900">{step.instruction || `Step ${index + 1}`}</p>
                <p className="mt-1 text-[11px] text-gray-500">
                  {formatDistance(step.distance)} · {formatDuration(step.duration)}{" "}
                  {step.name ? `via ${step.name}` : ""}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return `${hours}h ${remaining}m`;
  }
  return `${minutes} min`;
}
