"use client";
import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_KEY || "";

interface LocationPickerProps {
  initialLocation?: { lat: number; lng: number };
  onLocationSelect: (location: { lat: number; lng: number }) => void;
  onClose: () => void;
}

export default function LocationPicker({
  initialLocation,
  onLocationSelect,
  onClose,
}: LocationPickerProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(initialLocation || null);

  // Initialize map
  useEffect(() => {
    if (map.current) return;
    if (!mapContainer.current) return;

    const center = initialLocation
      ? [initialLocation.lng, initialLocation.lat]
      : [-74.5, 40]; // Default to New York

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: center as [number, number],
      zoom: 13,
    });

    // Add initial marker if location provided
    if (initialLocation) {
      const el = document.createElement("div");
      el.className = "location-picker-marker";
      el.style.width = "32px";
      el.style.height = "32px";
      el.style.borderRadius = "50%";
      el.style.backgroundColor = "#3b82f6";
      el.style.border = "4px solid white";
      el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
      el.style.cursor = "pointer";

      marker.current = new mapboxgl.Marker(el)
        .setLngLat([initialLocation.lng, initialLocation.lat])
        .addTo(map.current);
    }

    // Handle map click to set location
    const currentMap = map.current;
    currentMap.on("click", (e) => {
      const { lng, lat } = e.lngLat;
      setSelectedLocation({ lat, lng });

      // Remove existing marker
      if (marker.current) {
        marker.current.remove();
      }

      // Create new marker at clicked location
      const el = document.createElement("div");
      el.className = "location-picker-marker";
      el.style.width = "32px";
      el.style.height = "32px";
      el.style.borderRadius = "50%";
      el.style.backgroundColor = "#3b82f6";
      el.style.border = "4px solid white";
      el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
      el.style.cursor = "pointer";

      marker.current = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .addTo(currentMap);
    });

    // Resize map when window size changes
    const handleResize = () => {
      if (map.current) {
        map.current.resize();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (map.current) {
        map.current.remove();
      }
    };
  }, [initialLocation]);

  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation);
      onClose();
    }
  };

  const formatCoordinates = (lat: number, lng: number) => {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">Pick a Location</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Instructions */}
        <div className="p-4 bg-blue-50 border-b border-blue-200">
          <p className="text-sm text-blue-800">
            Click on the map to select a location for your hang out
          </p>
          {selectedLocation && (
            <p className="text-xs text-blue-600 mt-1">
              Selected: {formatCoordinates(selectedLocation.lat, selectedLocation.lng)}
            </p>
          )}
        </div>

        {/* Map Container */}
        <div className="flex-1 relative overflow-hidden">
          <div ref={mapContainer} className="w-full h-full" />
        </div>

        {/* Footer with actions */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedLocation}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Confirm Location
          </button>
        </div>
      </div>
    </div>
  );
}

