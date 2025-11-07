"use client";

import { useState } from "react";
import { getCurrentLocation } from "@/lib/hooks/useGeolocation";

interface LocationPermissionModalProps {
  onAllow: () => void;
  onSkip: () => void;
}

export default function LocationPermissionModal({
  onAllow,
  onSkip,
}: LocationPermissionModalProps) {
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAllow = async () => {
    setRequesting(true);
    setError(null);

    try {
      // Request location permission
      await getCurrentLocation({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      });
      
      // Success - permission granted
      onAllow();
    } catch (err: any) {
      // Handle different error types
      if (err.message?.includes("denied")) {
        setError("Location access was denied. You can enable it later in your browser settings.");
        setRequesting(false);
        // Auto-close after showing message (non-blocking)
        setTimeout(() => {
          onAllow();
        }, 2500);
      } else {
        setError(err.message || "Failed to get location. You can try again later.");
        setRequesting(false);
      }
    }
  };

  const handleSkip = () => {
    // Store preference that user skipped (optional)
    if (typeof window !== "undefined") {
      localStorage.setItem("locationPermissionSkipped", "true");
    }
    onSkip();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
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
          </div>
        </div>

        <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">
          Enable Location Services
        </h3>

        <p className="text-gray-700 text-center mb-6">
          We'd like to use your location to show you nearby travel events and help you discover
          spontaneous experiences in your area. This helps us personalize your experience.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleAllow}
            disabled={requesting}
            className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {requesting ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
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
                Requesting permission...
              </span>
            ) : (
              "Allow Location Access"
            )}
          </button>

          <button
            onClick={handleSkip}
            disabled={requesting}
            className="w-full bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            Skip for Now
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          You can change this later in your browser settings
        </p>
      </div>
    </div>
  );
}

