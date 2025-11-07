"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Timestamp } from "firebase/firestore";
import EventCard from "./EventCard";
import EventForm from "./EventForm";
import { useAuth } from "./AuthContext";
import { Event, EventFormData } from "@/lib/types";
import { getCurrentLocation } from "@/lib/hooks/useGeolocation";
import { useHangoutsFeed } from "@/lib/hooks/useHangoutsFeed";

interface ApiResponse {
  events: Event[];
  meta: {
    total: number;
    limit: number;
    includeAI: boolean;
    location: string;
    tags: string[];
    sortBy: string;
  };
}

interface SubmitEventPayload extends EventFormData {
  userId: string;
  apiKey?: string;
  tenantId?: string;
  consentGiven?: boolean;
  creator?: {
    uid: string;
    name?: string;
    profileImageUrl?: string;
  };
  creatorName?: string;
  creatorProfileImageUrl?: string;
}

interface UpdateEventPayload {
  eventId: string;
  updates: Partial<Event>;
  userId: string;
  apiKey?: string;
  tenantId?: string;
}

interface EventFeedProps {
  onEventsChange?: (events: Event[]) => void;
  defaultApiKey?: string;
  defaultTenantId?: string;
  showTestingControls?: boolean;
  showAIEvents?: boolean;
  enableSorting?: boolean;
  defaultSortBy?: "newest" | "nearest";
  aiBadgeText?: string;
  eventLabel?: string; // "Hang Out", "Event", etc.
  cacheDuration?: number; // minutes
  pollingInterval?: number; // seconds
  // API endpoint overrides for embedding flexibility
  apiBaseUrl?: string; // Override base URL for API endpoints (default: "")
  fetchEventsEndpoint?: string; // Custom fetch events endpoint (default: "/api/plugin/fetch-events")
  submitEventEndpoint?: string; // Custom submit event endpoint (default: "/api/plugin/submit-event")
  updateEventEndpoint?: string; // Custom update event endpoint (default: "/api/plugin/update-event")
  deleteEventEndpoint?: string; // Custom delete event endpoint (default: "/api/plugin/delete-event")
  // Theme customization
  primaryColor?: string; // For buttons, markers, accents
  aiBadgeColor?: string; // Background color for AI badge
  aiBadgeTextColor?: string; // Text color for AI badge
  aiBackgroundColor?: string; // Background color for AI event cards
}

export default function EventFeed({
  onEventsChange,
  defaultApiKey,
  defaultTenantId,
  showTestingControls = true,
  showAIEvents = true,
  enableSorting = true,
  defaultSortBy = "newest",
  aiBadgeText = "🤖 AI Event",
  eventLabel = "Hang Out",
  cacheDuration = 5,
  apiBaseUrl = "",
  fetchEventsEndpoint = "/api/plugin/fetch-events",
  submitEventEndpoint = "/api/plugin/submit-event",
  updateEventEndpoint = "/api/plugin/update-event",
  deleteEventEndpoint = "/api/plugin/delete-event",
  primaryColor = "#3b82f6",
  aiBadgeColor = "#fef3c7",
  aiBadgeTextColor = "#92400e",
  aiBackgroundColor = "#fffbeb",
}: EventFeedProps) {
  const { user, loading: authLoading } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // API query parameters for testing
  const [includeAI, setIncludeAI] = useState(showAIEvents);
  const [sortBy, setSortBy] = useState<"newest" | "nearest">(defaultSortBy);
  const [location, setLocation] = useState<string>("New York"); // Default fallback
  const [userCoordinates, setUserCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [limit, setLimit] = useState(50);

  const [aiEvents, setAiEvents] = useState<Event[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  
  // Multi-tenant testing controls
  const [apiKey, setApiKey] = useState(defaultApiKey || "");
  const [tenantId, setTenantId] = useState(defaultTenantId || "");
  const [useApiKey, setUseApiKey] = useState(!!defaultApiKey);
  
  const { hangouts, loading: hangoutsLoading, error: hangoutsError } = useHangoutsFeed({
    tenantId: useApiKey ? undefined : tenantId || undefined,
    tags: tags.length > 0 ? tags : undefined,
    limit,
  });

  const combinedEvents = useMemo(() => {
    const baseEvents = includeAI && showAIEvents ? [...aiEvents, ...hangouts] : [...hangouts];
    const deduped: Event[] = [];
    const seen = new Set<string>();

    const getEventId = (event: Event): string => {
      if (event.id) {
        return event.id;
      }
      return `${event.title}-${event.createdAt instanceof Date ? event.createdAt.toISOString() : String(event.createdAt)}`;
    };

    baseEvents.forEach((event) => {
      const key = getEventId(event);
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(event);
      }
    });

    const getEventDate = (event: Event) => {
      const createdAt = event.createdAt as Timestamp | Date | string | undefined;
      if (createdAt instanceof Date) {
        return createdAt;
      }
      if (createdAt && typeof (createdAt as Timestamp).toDate === "function") {
        try {
          return (createdAt as Timestamp).toDate();
        } catch (timestampError) {
          console.warn("Failed to convert Firestore timestamp in EventFeed:", timestampError);
        }
      }
      if (typeof createdAt === "string") {
        const parsed = new Date(createdAt);
        if (!Number.isNaN(parsed.valueOf())) {
          return parsed;
        }
      }
      return new Date(0);
    };

    const toRadians = (deg: number) => (deg * Math.PI) / 180;

    const distanceFromUser = (event: Event) => {
      if (!userCoordinates || !event.location) {
        return Number.POSITIVE_INFINITY;
      }

      const { lat: lat1, lng: lon1 } = userCoordinates;
      const { lat: lat2, lng: lon2 } = event.location;

      if (
        typeof lat2 !== "number" ||
        typeof lon2 !== "number" ||
        Number.isNaN(lat2) ||
        Number.isNaN(lon2)
      ) {
        return Number.POSITIVE_INFINITY;
      }

      const R = 6371; // Earth's radius in km
      const dLat = toRadians(lat2 - lat1);
      const dLon = toRadians(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const sorted = [...deduped];

    if (enableSorting && sortBy === "nearest" && userCoordinates) {
      sorted.sort((a, b) => distanceFromUser(a) - distanceFromUser(b));
    } else {
      sorted.sort((a, b) => getEventDate(b).getTime() - getEventDate(a).getTime());
    }

    return sorted;
  }, [aiEvents, hangouts, includeAI, showAIEvents, enableSorting, sortBy, userCoordinates]);

  const loading = authLoading || hangoutsLoading || aiLoading || locationLoading;
  const combinedErrorMessage = hangoutsError?.message || aiError || null;

  // Get user's current location on mount
  useEffect(() => {
    const fetchUserLocation = async () => {
      setLocationLoading(true);
      try {
        const coords = await getCurrentLocation({
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // Cache for 5 minutes
        });

        setUserCoordinates({ lat: coords.latitude, lng: coords.longitude });

        // Reverse geocode to get city name (using server-side API to protect Mapbox key)
        try {
          const response = await fetch(
            `/api/geocode?lng=${coords.longitude}&lat=${coords.latitude}`
          );
          if (response.ok) {
            const data = await response.json();
            if (data.placeName) {
              setLocation(data.placeName);
            } else {
              // Fallback to coordinates
              setLocation(`${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
            }
          } else {
            // Fallback to coordinates if geocoding fails
            setLocation(`${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
          }
        } catch (geocodeError) {
          console.warn("Reverse geocoding failed, using coordinates:", geocodeError);
          // Fallback to coordinates
          setLocation(`${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
        }
      } catch (error: unknown) {
        console.warn("Failed to get user location:", error);
        // Keep default "New York" if location fails
        setLocation("New York");
      } finally {
        setLocationLoading(false);
      }
    };

    fetchUserLocation();
  }, []);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Build API query string
  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    params.set("limit", limit.toString());
    // Use user coordinates if available, otherwise use location string
    const locationParam = userCoordinates 
      ? `${userCoordinates.lat}, ${userCoordinates.lng}` 
      : location;
    params.set("location", locationParam);
    params.set("includeAI", includeAI.toString());
    if (enableSorting && sortBy) {
      params.set("sortBy", sortBy);
    }
    if (tags.length > 0) {
      params.set("tags", tags.join(","));
    }
    if (userCoordinates) {
      params.set("userLat", userCoordinates.lat.toString());
      params.set("userLng", userCoordinates.lng.toString());
    }
    if (location) {
      params.set("city", location);
    }
    // Add tenant authentication
    if (useApiKey && apiKey) {
      params.set("apiKey", apiKey);
    } else if (tenantId) {
      params.set("tenantId", tenantId);
    }
    params.set("cacheDuration", cacheDuration.toString());
    return params.toString();
  }, [
    limit,
    userCoordinates,
    location,
    includeAI,
    enableSorting,
    sortBy,
    tags,
    useApiKey,
    apiKey,
    tenantId,
    cacheDuration,
  ]);

  const fetchAiEvents = useCallback(
    async (showLoading: boolean = false) => {
      if (!showAIEvents || !includeAI) {
        setAiEvents([]);
        setAiError(null);
        setAiLoading(false);
        return;
      }

      if (showLoading) {
        setAiLoading(true);
      }

      try {
        const queryString = buildQueryString();
        console.log("📡 Fetching AI hangOuts...", { queryString });
        const response = await fetch(`${apiBaseUrl}${fetchEventsEndpoint}?${queryString}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch AI events: ${response.statusText}`);
        }

        const data: ApiResponse = await response.json();
        const eventsArray = Array.isArray(data) ? data : (data.events || []);

        const aiOnly = eventsArray.filter(
          (event) =>
            event.source === "AI" ||
            event.createdBy === "ai" ||
            (typeof event.id === "string" && event.id.startsWith("AI-")),
        );

        if (aiOnly.length === 0) {
          console.log("⚠️ No AI events returned from API. Showing user-generated hangOuts only.");
        } else {
          console.log("✅ AI events fetched:", aiOnly);
        }

        setAiEvents(aiOnly);
        setAiError(null);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to fetch AI events";
        console.error("❌ AI events fetch error:", error);
        setAiError(message);
        setAiEvents([]);
      } finally {
        setAiLoading(false);
      }
    },
    [
      apiBaseUrl,
      fetchEventsEndpoint,
      includeAI,
      showAIEvents,
      buildQueryString,
    ],
  );

  // Notify parent when events change (after state update)
  useEffect(() => {
    if (onEventsChange) {
      onEventsChange(combinedEvents);
    }
  }, [combinedEvents, onEventsChange]);

  useEffect(() => {
    fetchAiEvents(true);
  }, [fetchAiEvents]);

  const handleSubmit = async (formData: EventFormData) => {
    if (!user) {
      showNotification("error", "You must be logged in to create hang outs");
      return;
    }

    try {
      const requestBody: SubmitEventPayload = {
        ...formData,
        userId: user.uid,
        creator: {
          uid: user.uid,
          name:
            user.displayName ||
            user.email?.split("@")[0] ||
            (user.providerData && user.providerData[0]?.displayName) ||
            "Anonymous",
          profileImageUrl: user.photoURL || "/default-profile.png",
        },
      };

      // Add tenant authentication - ensure we always have either apiKey or tenantId
      if (useApiKey && apiKey) {
        requestBody.apiKey = apiKey;
      } else if (tenantId) {
        requestBody.tenantId = tenantId;
      } else {
        // Default to demo key if no tenant specified (for testing)
        requestBody.apiKey = defaultApiKey || "demo-key-1";
      }

      console.log("Submitting event with request body:", {
        hasTitle: !!requestBody.title,
        hasDescription: !!requestBody.description,
        hasLocation: !!requestBody.location,
        hasApiKey: !!requestBody.apiKey,
        hasTenantId: !!requestBody.tenantId,
        hasUserId: !!requestBody.userId,
      });

      const response = await fetch(`${apiBaseUrl}${submitEventEndpoint}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          // Also send API key in header as fallback
          ...(requestBody.apiKey && { "x-api-key": requestBody.apiKey }),
        },
        body: JSON.stringify(requestBody),
      });

      let result;
      try {
        const text = await response.text();
        result = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error("Failed to parse response:", parseError);
        result = { error: "Invalid response from server", status: response.status };
      }

      if (!response.ok) {
        console.error("Submit error response:", result);
        console.error("Response status:", response.status);
        console.error("Response headers:", Object.fromEntries(response.headers.entries()));
        throw new Error(result.error || result.message || `Failed to create hang out (${response.status})`);
      }

      showNotification("success", "Hang out created successfully!");
      setShowForm(false);
      
      // Refresh AI events (user events will stream via Firestore)
      await fetchAiEvents(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create hang out";
      showNotification("error", message);
      throw err;
    }
  };

  const handleUpdate = async (id: string, updates: Partial<Event>, ownerId: string) => {
    if (!user) {
      showNotification("error", "You must be logged in to update hang outs");
      return;
    }

    if (ownerId?.startsWith("AI-") || ownerId === "ai") {
      showNotification("error", "Cannot update AI-generated hang outs");
      return;
    }

    if (user.uid !== ownerId) {
      showNotification("error", "You can only update your own hang outs");
      return;
    }

    try {
      const requestBody: UpdateEventPayload = {
        eventId: id,
        updates,
        userId: user.uid,
      };

      // Add tenant authentication
      if (useApiKey && apiKey) {
        requestBody.apiKey = apiKey;
      } else if (tenantId) {
        requestBody.tenantId = tenantId;
      }

      const response = await fetch(`${apiBaseUrl}${updateEventEndpoint}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || "Failed to update hang out");
      }

      showNotification("success", "Hang out updated successfully!");
      await fetchAiEvents(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update hang out";
      console.error("Update error:", err);
      showNotification("error", message);
    }
  };

  const handleDelete = async (id: string, ownerId: string) => {
    if (!user) {
      showNotification("error", "You must be logged in to delete hang outs");
      return;
    }

    if (ownerId?.startsWith("AI-") || ownerId === "ai") {
      showNotification("error", "Cannot delete AI-generated hang outs");
      return;
    }

    if (user.uid !== ownerId) {
      showNotification("error", "You can only delete your own hang outs");
      return;
    }

    if (!confirm("Are you sure you want to delete this hang out?")) {
      return;
    }

    try {
      const deleteParams = new URLSearchParams();
      deleteParams.set("eventId", id);
      deleteParams.set("userId", user.uid);
      
      // Add tenant authentication
      if (useApiKey && apiKey) {
        deleteParams.set("apiKey", apiKey);
      } else if (tenantId) {
        deleteParams.set("tenantId", tenantId);
      }
      
      const response = await fetch(`${apiBaseUrl}${deleteEventEndpoint}?${deleteParams.toString()}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || "Failed to delete hang out");
      }

      showNotification("success", "Hang out deleted successfully!");
      await fetchAiEvents(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete hang out";
      console.error("Delete error:", err);
      showNotification("error", message);
    }
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  if (loading) {
    return <p className="text-gray-900">Loading hang outs...</p>;
  }

  return (
    <div className="overflow-y-auto h-full pr-0 md:pr-2">
      {notification && (
        <div
          className={`mb-4 p-3 rounded-lg ${
            notification.type === "success"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {notification.message}
        </div>
      )}

      {combinedErrorMessage && (
        <div className="mb-4 p-3 rounded-lg bg-red-100 text-red-700">
          {combinedErrorMessage}
        </div>
      )}

      {/* API Testing Controls - Only show if enabled */}
      {showTestingControls && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">API Testing Controls</h3>
          
          <div className="space-y-2">
            {/* Multi-Tenant Controls */}
            <div className="pb-2 border-b border-gray-300">
              <label className="block text-xs font-semibold text-gray-700 mb-2">Multi-Tenant Authentication</label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="radio"
                  id="useApiKey"
                  checked={useApiKey}
                  onChange={() => setUseApiKey(true)}
                  className="w-4 h-4"
                />
                <label htmlFor="useApiKey" className="text-xs text-gray-700">API Key</label>
                <input
                  type="radio"
                  id="useTenantId"
                  checked={!useApiKey}
                  onChange={() => setUseApiKey(false)}
                  className="w-4 h-4 ml-3"
                />
                <label htmlFor="useTenantId" className="text-xs text-gray-700">Tenant ID</label>
              </div>
              {useApiKey ? (
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="demo-key-1, demo-key-2, test-key"
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded text-gray-900"
                />
              ) : (
                <input
                  type="text"
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  placeholder="tenant-1, tenant-2, test-tenant"
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded text-gray-900"
                />
              )}
              <p className="text-xs text-gray-500 mt-1">
                Demo keys: demo-key-1, demo-key-2, test-key
              </p>
            </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includeAI"
                    checked={includeAI}
                    onChange={(e) => setIncludeAI(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="includeAI" className="text-sm text-gray-700">
                    Include AI Events
                  </label>
                </div>

                {enableSorting && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Sort By</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as "newest" | "nearest")}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-gray-900"
                    >
                      <option value="newest">Newest First</option>
                      <option value="nearest">Nearest First</option>
                    </select>
                  </div>
                )}

            <div>
              <label className="block text-xs text-gray-600 mb-1">Location (for AI)</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="New York"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-gray-900"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Filter by Tags</label>
              <div className="flex gap-1 mb-1">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addTag()}
                  placeholder="Add tag"
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded text-gray-900"
                />
                <button
                  onClick={addTag}
                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="text-blue-700 hover:text-blue-900"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Limit</label>
              <input
                type="number"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value) || 50)}
                min="1"
                max="100"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-gray-900"
              />
            </div>

            <button
              onClick={() => fetchAiEvents(true)}
              className="w-full px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Refresh Events
            </button>
          </div>
        </div>
      )}

          {user && (
            <>
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded-lg mb-4 hover:bg-blue-700 w-full"
                onClick={() => setShowForm(!showForm)}
              >
                {showForm ? "Cancel" : `+ Create ${eventLabel}`}
              </button>

              {showForm && (
                <EventForm 
                  onSubmit={handleSubmit} 
                  onCancel={() => setShowForm(false)}
                  apiBaseUrl={apiBaseUrl}
                  submitEventEndpoint={submitEventEndpoint}
                  eventLabel={eventLabel}
                  primaryColor={primaryColor}
                />
              )}
            </>
          )}

      {!user && (
        <div className="mb-4 p-3 bg-yellow-100 text-yellow-700 rounded-lg">
          Please log in to create and manage hang outs.
        </div>
      )}

      {combinedEvents.length === 0 ? (
        <p className="text-gray-800">No hang outs found. Be the first to create one!</p>
      ) : (
            combinedEvents.map((event) => (
              <div key={event.id} id={`event-${event.id}`}>
                <EventCard
                  event={event}
                  aiBadgeText={aiBadgeText}
                  primaryColor={primaryColor}
                  aiBadgeColor={aiBadgeColor}
                  aiBadgeTextColor={aiBadgeTextColor}
                  aiBackgroundColor={aiBackgroundColor}
                  onUpdate={
                    event.id &&
                    !event.id.startsWith("AI-") &&
                    event.createdBy !== "ai" &&
                    event.createdBy === user?.uid
                      ? (updates: Partial<Event>) => {
                          if (event.id) {
                            handleUpdate(event.id, updates, event.createdBy);
                          }
                        }
                      : undefined
                  }
                  onDelete={
                    event.id && !event.id.startsWith("AI-") && event.createdBy !== "ai"
                      ? () => {
                          if (event.id) {
                            handleDelete(event.id, event.createdBy);
                          }
                        }
                      : undefined
                  }
                />
              </div>
            ))
      )}
    </div>
  );
}
