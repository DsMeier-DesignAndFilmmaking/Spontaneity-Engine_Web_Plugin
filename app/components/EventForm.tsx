"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "./AuthContext";
import { EventFormData } from "@/lib/types";
import LocationPicker from "./LocationPicker";

interface EventFormProps {
  event?: {
    id: string;
    title: string;
    description: string;
    tags: string[];
    location: { lat: number; lng: number };
  };
  onSubmit: (data: EventFormData) => Promise<void>;
  onCancel: () => void;
  // API endpoint override for embedding flexibility
  apiBaseUrl?: string; // Override base URL for API endpoints
  submitEventEndpoint?: string; // Custom submit event endpoint (default: "/api/plugin/submit-event")
  eventLabel?: string; // "Hang Out", "Event", etc.
  primaryColor?: string; // For submit button
}

export default function EventForm({ 
  event, 
  onSubmit, 
  onCancel,
  apiBaseUrl = "",
  submitEventEndpoint = "/api/plugin/submit-event",
  eventLabel = "Hang Out",
  primaryColor = "#3b82f6",
}: EventFormProps) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false); // GDPR consent flag

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<EventFormData>({
    defaultValues: event || {
      title: "",
      description: "",
      tags: [],
      location: { lat: 40.7128, lng: -74.0060 },
    },
  });

  const location = watch("location");

  useEffect(() => {
    if (event || typeof window === "undefined" || !navigator.geolocation) {
      return;
    }

    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) {
          return;
        }
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setValue("location", coords, { shouldValidate: true });
      },
      (geoError) => {
        console.warn("EventForm geolocation unavailable, keeping default location:", geoError);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );

    return () => {
      cancelled = true;
    };
  }, [event, setValue]);

  const handleLocationSelect = (selectedLocation: { lat: number; lng: number }) => {
    setValue("location", selectedLocation, { shouldValidate: true });
  };

  const onFormSubmit = async (data: EventFormData) => {
    if (!user) {
      setError("You must be logged in to submit hang outs");
      return;
    }

    if (!data.location || typeof data.location.lat !== "number" || typeof data.location.lng !== "number") {
      setError("Please select a location on the map");
      return;
    }

    // GDPR: Require consent before submission
    if (!consentGiven) {
      setError("Please provide consent for data processing");
      return;
    }

    // Validate required fields
    if (!data.title || !data.title.trim()) {
      setError("Title is required");
      return;
    }

    if (!data.description || !data.description.trim()) {
      setError("Description is required");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      // Include consent flag in submission
      // Ensure tags is an array
      const submitData = {
        ...data,
        tags: Array.isArray(data.tags) ? data.tags : [],
        location: {
          lat: typeof data.location.lat === "number" ? data.location.lat : parseFloat(data.location.lat),
          lng: typeof data.location.lng === "number" ? data.location.lng : parseFloat(data.location.lng),
        },
        consentGiven: true,
      };
      
      await onSubmit(submitData);
    } catch (err: any) {
      console.error("EventForm submission error:", err);
      setError(err.message || "Failed to submit hang out");
    } finally {
      setSubmitting(false);
    }
  };

  const formatCoordinates = (lat: number, lng: number) => {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
        <h3 className="text-xl font-semibold mb-4 text-gray-900">
          {event ? `Edit ${eventLabel}` : `Create New ${eventLabel}`}
        </h3>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900">
              {eventLabel} Title *
            </label>
            <input
              {...register("title", {
                required: "Title is required",
                maxLength: { value: 100, message: "Title must be less than 100 characters" },
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={`Enter ${eventLabel.toLowerCase()} title`}
            />
            {errors.title && (
              <p className="text-red-600 text-sm mt-1 font-medium">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900">
              Description *
            </label>
            <textarea
              {...register("description", {
                required: "Description is required",
                maxLength: {
                  value: 1000,
                  message: "Description must be less than 1000 characters",
                },
              })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={`Enter ${eventLabel.toLowerCase()} description`}
            />
            {errors.description && (
              <p className="text-red-600 text-sm mt-1 font-medium">
                {errors.description.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900">Location *</label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowLocationPicker(true)}
                className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-700 hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
              >
                <svg
                  className="w-5 h-5 text-gray-500"
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
                <span className="font-medium">
                  {location?.lat && location?.lng
                    ? `Location: ${formatCoordinates(location.lat, location.lng)}`
                    : "Pick Location on Map"}
                </span>
              </button>
              {location?.lat && location?.lng && (
                <p className="text-xs text-gray-500">
                  Coordinates: {formatCoordinates(location.lat, location.lng)}
                </p>
              )}
              {errors.location && (
                <p className="text-red-600 text-sm font-medium">
                  {errors.location.message || "Location is required"}
                </p>
              )}
            </div>
          </div>

          {/* GDPR Consent Checkbox */}
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="consent"
              checked={consentGiven}
              onChange={(e) => setConsentGiven(e.target.checked)}
              className="mt-1 w-4 h-4"
              required
            />
            <label htmlFor="consent" className="text-sm text-gray-700">
              I consent to the processing of my data for event creation and sharing. 
              <span className="text-gray-500 text-xs block mt-1">
                Your data will be used to display events and may be shared with other users. 
                You can delete your events at any time.
              </span>
            </label>
          </div>

          {error && <p className="text-red-600 text-sm font-medium">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 text-white px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
              style={{ backgroundColor: primaryColor }}
            >
              {submitting ? "Submitting..." : event ? `Update ${eventLabel}` : `Create ${eventLabel}`}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* Location Picker Modal */}
      {showLocationPicker && (
        <LocationPicker
          initialLocation={location}
          onLocationSelect={handleLocationSelect}
          onClose={() => setShowLocationPicker(false)}
        />
      )}
    </>
  );
}
