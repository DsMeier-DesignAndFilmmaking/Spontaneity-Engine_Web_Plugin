"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "@/lib/mapbox";
import type { Feature, LineString } from "geojson";
import type { DirectionsStep } from "@/lib/mapbox";

interface NavigationModalProps {
  routeFeature: Feature<LineString>;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number; name?: string };
  steps: DirectionsStep[];
  onClose: () => void;
  title?: string;
}

const ROUTE_SOURCE_ID = "navigation-route";
const ROUTE_LAYER_ID = "navigation-route-layer";

export default function NavigationModal({
  routeFeature,
  origin,
  destination,
  steps,
  onClose,
  title = "Turn-by-turn Navigation",
}: NavigationModalProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) {
      return;
    }

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/navigation-day-v1",
      center: [origin.lng, origin.lat],
      zoom: 14,
    });

    mapRef.current = map;

    map.on("load", () => {
      if (!map.getSource(ROUTE_SOURCE_ID)) {
        map.addSource(ROUTE_SOURCE_ID, {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [routeFeature],
          },
        });
      }

      if (!map.getLayer(ROUTE_LAYER_ID)) {
        map.addLayer({
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
          },
        });
      }

      // Origin marker
      new mapboxgl.Marker({ color: "#22c55e" })
        .setLngLat([origin.lng, origin.lat])
        .setPopup(new mapboxgl.Popup().setText("You"))
        .addTo(map);

      // Destination marker
      new mapboxgl.Marker({ color: "#ef4444" })
        .setLngLat([destination.lng, destination.lat])
        .setPopup(new mapboxgl.Popup().setText(destination.name ?? "Destination"))
        .addTo(map);

      const bounds = new mapboxgl.LngLatBounds();
      routeFeature.geometry.coordinates.forEach((coord) => {
        bounds.extend(coord as mapboxgl.LngLatLike);
      });
      map.fitBounds(bounds, { padding: 60, duration: 0 });
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [routeFeature, origin, destination]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500">Walking directions from your location</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close navigation"
          >
            ×
          </button>
        </header>

        <div className="grid flex-1 grid-cols-1 divide-y md:grid-cols-2 md:divide-x md:divide-y-0">
          <div className="relative h-[320px] md:h-full">
            <div ref={mapContainer} className="absolute inset-0" />
          </div>

          <div className="flex h-full flex-col overflow-y-auto bg-gray-50">
            <div className="border-b border-gray-200 px-6 py-4">
              <p className="text-sm font-medium text-gray-900">Route Steps</p>
              <p className="text-xs text-gray-500">Follow the instructions below to reach your hangout.</p>
            </div>

            <ol className="space-y-3 px-6 py-4 text-sm text-gray-700">
              {steps.length === 0 && (
                <li className="rounded-lg bg-white p-3 shadow">Turn-by-turn instructions are unavailable for this route.</li>
              )}
              {steps.map((step, index) => (
                <li key={`${step.instruction}-${index}`} className="rounded-lg bg-white p-3 shadow">
                  <p className="font-medium text-gray-900">{step.instruction || `Step ${index + 1}`}</p>
                  <p className="text-xs text-gray-500">
                    {formatDistance(step.distance)} · {formatDuration(step.duration)} {step.name ? `via ${step.name}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
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

