"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Timestamp } from "firebase/firestore";
import EventCard from "./EventCard";
import EventForm from "./EventForm";
import Loader from "./Loader";
import { useAuth } from "./AuthContext";
import { Event, EventFormData } from "@/lib/types";
import { combineAdventureCards, getNextAdventureIndex } from "@/lib/adventureCards";
import type { AdventureCard } from "@/lib/adventureCards";
import { getCurrentLocation } from "@/lib/hooks/useGeolocation";
import { useHangoutsFeed } from "@/lib/hooks/useHangoutsFeed";
import { getWalkingRoute, type NavigationRoutePayload } from "@/lib/mapbox";

/**
 * The previous panel rendered AI and Firestore cards as soon as each async branch finished. Because
 * the fetches resolved at different times, React re-rendered multiple times with partially populated
 * data, causing the user-facing card area to flicker. This refactor establishes a strict lifecycle:
 *   1. Mount → show a single skeleton loader.
 *   2. Prefetch Firestore + AI cards in parallel.
 *   3. Commit one atomic state update once both datasets are ready.
 *   4. Flip `readyToRender` to true and fade the first real card in with Framer Motion.
 * No card DOM ever renders before the data is complete, eliminating flicker entirely.
 */

type Hangout = Event;

interface AiApiCard {
  title: string;
  description: string;
  vibeTags: string[];
  navigationLink?: string | null;
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
  eventLabel?: string;
  cacheDuration?: number;
  pollingInterval?: number;
  apiBaseUrl?: string;
  submitEventEndpoint?: string;
  updateEventEndpoint?: string;
  deleteEventEndpoint?: string;
  primaryColor?: string;
  aiBadgeColor?: string;
  aiBadgeTextColor?: string;
  aiBackgroundColor?: string;
  onNavigationRouteChange?: (payload: NavigationRoutePayload | null) => void;
  onMoreInfo?: (event: Event) => void;
}

interface CarouselSnapshot {
  cards: AdventureCard[];
  currentIndex: number;
  activeId: string | null;
}

const haveSameCardOrder = (a: AdventureCard[], b: AdventureCard[]): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((card, index) => card.id === b[index]?.id);
};

const selectDisplayedCard = (snapshot: CarouselSnapshot): AdventureCard | null => {
  if (snapshot.cards.length === 0) {
    return null;
  }
  return snapshot.cards[Math.max(0, snapshot.currentIndex)] ?? null;
};

const EARTH_RADIUS_METERS = 6_371_000;

const haversineDistanceMeters = (
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number => {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);

  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const haversine =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return EARTH_RADIUS_METERS * c;
};

const asNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const sanitizeCardTitle = (value: unknown, index: number): string => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed.slice(0, 120);
    }
  }
  return `AI Suggestion ${index + 1}`;
};

const sanitizeCardDescription = (value: unknown): string => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return "A spontaneous local experience worth checking out.";
};

const normalizeNavigationLink = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
};

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
  submitEventEndpoint = "/api/plugin/submit-event",
  updateEventEndpoint = "/api/plugin/update-event",
  deleteEventEndpoint = "/api/plugin/delete-event",
  primaryColor = "#3b82f6",
  aiBadgeColor = "#fef3c7",
  aiBadgeTextColor = "#92400e",
  aiBackgroundColor = "#f5f3ff",
  onNavigationRouteChange = () => undefined,
  onMoreInfo,
}: EventFeedProps) {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [includeAI, setIncludeAI] = useState(showAIEvents);
  const [sortBy, setSortBy] = useState<"newest" | "nearest">(defaultSortBy);
  const [location, setLocation] = useState<string>("New York");
  const [userCoordinates, setUserCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [limit, setLimit] = useState(50);

  const [aiSourceBreakdown, setAiSourceBreakdown] = useState<{
    openai: number;
    gemini: number;
    fallback: number;
  } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReady, setAiReady] = useState(false);

  const [tenantId, setTenantId] = useState(defaultTenantId || "");
  const [apiKey, setApiKey] = useState(defaultApiKey || "");
  const [useApiKey, setUseApiKey] = useState(!!defaultApiKey);
  const [tenantResolving, setTenantResolving] = useState(false);
  const resolvingTenantRef = useRef(false);

  const sanitizedApiKey = typeof apiKey === "string" ? apiKey.trim() : "";

  const [navigationLoading, setNavigationLoading] = useState(false);
  const { hangouts, loading: hangoutsLoading, error: hangoutsError } = useHangoutsFeed({
    tenantId: tenantId || undefined,
    tags: tags.length > 0 ? tags : undefined,
    limit,
  });

  const sortedHangouts = useMemo(() => {
    const deduped: Event[] = [];
    const seen = new Set<string>();

    const getEventId = (event: Event): string => {
      if (event.id) {
        return event.id;
      }
      return `${event.title}-${
        event.createdAt instanceof Date ? event.createdAt.toISOString() : String(event.createdAt)
      }`;
    };

    hangouts.forEach((event) => {
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

      const toRadians = (deg: number) => (deg * Math.PI) / 180;
      const R = 6371;
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
  }, [hangouts, enableSorting, sortBy, userCoordinates]);

  const [panelState, setPanelState] = useState<CarouselSnapshot>({
    cards: [],
    currentIndex: 0,
    activeId: null,
  });
  const [readyToRender, setReadyToRender] = useState(false);
  const initialAnimationPlayedRef = useRef(false);
  const aiCardsRef = useRef<Event[]>([]);
  const [initialHangoutsReady, setInitialHangoutsReady] = useState(false);

  const commitCombinedCards = useCallback(
    (options?: { resetIndex?: boolean }) => {
      const aiCards = showAIEvents && includeAI ? aiCardsRef.current : [];
      const combined = combineAdventureCards(aiCards, sortedHangouts);

      setPanelState((previous) => {
        const previousActiveId = options?.resetIndex ? null : previous.activeId;
        const candidateActiveId = previousActiveId ?? previous.cards[previous.currentIndex]?.id ?? null;

        let resolvedIndex = 0;
        if (candidateActiveId) {
          const nextIndex = combined.findIndex((card) => card.id === candidateActiveId);
          resolvedIndex = nextIndex >= 0 ? nextIndex : 0;
        }

        if (combined.length === 0) {
          resolvedIndex = 0;
        } else if (resolvedIndex >= combined.length) {
          resolvedIndex = combined.length - 1;
        }

        const nextActiveId = combined.length > 0 ? combined[resolvedIndex]?.id ?? null : null;

        if (
          haveSameCardOrder(previous.cards, combined) &&
          previous.currentIndex === resolvedIndex &&
          previous.activeId === nextActiveId
        ) {
          return previous;
        }

        return {
          cards: combined,
          currentIndex: resolvedIndex,
          activeId: nextActiveId,
        };
      });
    },
    [includeAI, showAIEvents, sortedHangouts],
  );

  const loadAiSuggestions = useCallback(
    async ({ showSpinner, resetIndex }: { showSpinner: boolean; resetIndex?: boolean } = { showSpinner: false }) => {
      if (!showAIEvents || !includeAI) {
        aiCardsRef.current = [];
        setAiSourceBreakdown(null);
        setAiError(null);
        setAiReady(true);
        if (readyToRender) {
          commitCombinedCards({ resetIndex });
        }
        return;
      }

      if (showSpinner) {
        setAiLoading(true);
      }

      try {
        const fallbackCoordinates =
          userCoordinates && typeof userCoordinates.lat === "number" && typeof userCoordinates.lng === "number"
            ? userCoordinates
            : { lat: 40.7128, lng: -74.006 };

        const params = new URLSearchParams({
          lat: fallbackCoordinates.lat.toString(),
          lon: fallbackCoordinates.lng.toString(),
        });

        const primaryMood = tags.find((tag) => tag && tag.trim().length > 0) ?? "spontaneous";
        params.set("mood", primaryMood);

        const response = await fetch(`${apiBaseUrl}/api/spontaneous-cards?${params.toString()}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });

        if (!response.ok) {
          const textResponse = await response.text().catch(() => response.statusText);
          throw new Error(textResponse || `Failed to load AI suggestions (${response.status})`);
        }

        const payload = (await response.json()) as {
          aiCards?: AiApiCard[];
          sources?: { openai?: number; gemini?: number; fallback?: number };
          diagnostics?: { errors?: string[] };
        };

        const cards = Array.isArray(payload?.aiCards) ? payload.aiCards : [];

        const mappedCards: Event[] = cards
          .map((card, index) => {
            const title = sanitizeCardTitle(card?.title, index);
            const description = sanitizeCardDescription(card?.description);
            const vibeTags = Array.isArray(card?.vibeTags)
              ? card.vibeTags
                  .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
                  .filter((tag) => tag.length > 0)
                  .slice(0, 4)
              : [];
            const navigationLink = normalizeNavigationLink(card?.navigationLink);

            const decoratedDescription = navigationLink
              ? `${description}

Directions: ${navigationLink}`
              : description;

            return {
              id: `AI-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 32)}-${index}-${Date.now()}`,
              title,
              description: decoratedDescription,
              tags: vibeTags,
              location: fallbackCoordinates,
              createdBy: "ai",
              createdAt: new Date(),
              source: "AI" as const,
              tenantId: tenantId || undefined,
            } as Event;
          })
          .filter((card) => card.title.length > 0 && card.description.length > 0);

        aiCardsRef.current = mappedCards;

        if (payload?.sources) {
          setAiSourceBreakdown({
            openai: Number(payload.sources.openai ?? 0),
            gemini: Number(payload.sources.gemini ?? 0),
            fallback: Number(payload.sources.fallback ?? 0),
          });
        } else {
          setAiSourceBreakdown(null);
        }

        if (payload?.diagnostics?.errors?.length) {
          console.warn("AI diagnostics", payload.diagnostics.errors);
        }

        setAiError(null);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to load AI suggestions.";
        console.error("AI suggestion fetch failed", error);
        aiCardsRef.current = [];
        setAiSourceBreakdown(null);
        setAiError(message);
      } finally {
        if (showSpinner) {
          setAiLoading(false);
        }
        setAiReady(true);
        if (readyToRender) {
          commitCombinedCards({ resetIndex });
        }
      }
    },
    [
      apiBaseUrl,
      includeAI,
      showAIEvents,
      userCoordinates,
      tags,
      tenantId,
      readyToRender,
      commitCombinedCards,
    ],
  );

  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      await loadAiSuggestions({ showSpinner: true, resetIndex: true });
      if (!cancelled) {
        setAiReady(true);
      }
    };
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [loadAiSuggestions]);

  useEffect(() => {
    if (!initialHangoutsReady && !hangoutsLoading) {
      setInitialHangoutsReady(true);
    }
  }, [hangoutsLoading, initialHangoutsReady]);

  useEffect(() => {
    if (readyToRender) {
      return;
    }
    if (!aiReady || !initialHangoutsReady) {
      return;
    }
    commitCombinedCards({ resetIndex: true });
    setReadyToRender(true);
  }, [aiReady, initialHangoutsReady, readyToRender, commitCombinedCards]);

  useEffect(() => {
    if (!readyToRender) {
      return;
    }
    commitCombinedCards();
  }, [sortedHangouts, includeAI, showAIEvents, readyToRender, commitCombinedCards]);

  useEffect(() => {
    if (readyToRender && !initialAnimationPlayedRef.current) {
      initialAnimationPlayedRef.current = true;
    }
  }, [readyToRender]);

  const currentAdventure = readyToRender ? selectDisplayedCard(panelState) : null;
  const totalAdventureCards = panelState.cards.length;
  const noAdventuresAvailable = readyToRender && totalAdventureCards === 0;

  const handleNextAdventure = useCallback(() => {
    setPanelState((previous) => {
      if (previous.cards.length === 0) {
        return previous;
      }
      const nextIndex = getNextAdventureIndex(previous.currentIndex, previous.cards.length);
      if (nextIndex === previous.currentIndex) {
        return previous;
      }
      return {
        cards: previous.cards,
        currentIndex: nextIndex,
        activeId: previous.cards[nextIndex]?.id ?? null,
      };
    });
  }, []);

  const locationPending = locationLoading;
  const combinedErrorMessage = hangoutsError?.message || null;

  useEffect(() => {
    const fetchUserLocation = async () => {
      setLocationLoading(true);
      try {
        const coords = await getCurrentLocation({
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        });

        setUserCoordinates({ lat: coords.latitude, lng: coords.longitude });

        try {
          const response = await fetch(`/api/geocode?lng=${coords.longitude}&lat=${coords.latitude}`);
          if (response.ok) {
            const data = await response.json();
            if (data.placeName) {
              setLocation(data.placeName);
            } else {
              setLocation(`${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
            }
          } else {
            setLocation(`${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
          }
        } catch (geocodeError) {
          console.warn("Reverse geocoding failed, using coordinates:", geocodeError);
          setLocation(`${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
        }
      } catch (error: unknown) {
        console.warn("Failed to get user location:", error);
        setLocation("New York");
      } finally {
        setLocationLoading(false);
      }
    };

    fetchUserLocation();
  }, []);

  useEffect(() => {
    setApiKey(defaultApiKey || "");
  }, [defaultApiKey]);

  const showNotification = useCallback((type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  const handleNavigate = useCallback(
    (target: Event) => {
      if (!target.location) {
        showNotification("error", "This hang out does not have a valid location yet.");
        return;
      }

      const normalizedLat = asNumber((target.location as { lat: unknown }).lat);
      const normalizedLng = asNumber((target.location as { lng: unknown }).lng);

      if (normalizedLat === null || normalizedLng === null) {
        showNotification(
          "error",
          "This hang out is missing valid coordinates. Please update its location and try again."
        );
        return;
      }

      if (typeof navigator === "undefined" || !navigator.geolocation) {
        showNotification("error", "Geolocation is not supported in this browser.");
        return;
      }

      setNavigationLoading(true);
      onNavigationRouteChange?.(null);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const originCoords = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            const destinationCoords = {
              lat: normalizedLat,
              lng: normalizedLng,
              name: target.title,
            };

            const MAX_WALKING_DISTANCE_METERS = 200_000;
            const straightLineDistance = haversineDistanceMeters(originCoords, destinationCoords);

            if (straightLineDistance > MAX_WALKING_DISTANCE_METERS) {
              showNotification(
                "error",
                "This hang out is too far away to walk. Try another transport option or a closer destination."
              );
              setNavigationLoading(false);
              return;
            }

            const route = await getWalkingRoute(originCoords, destinationCoords);

            onNavigationRouteChange?.({
              feature: route.feature,
              steps: route.steps,
              origin: originCoords,
              destination: destinationCoords,
              title: target.title,
            });
          } catch (error) {
            console.error("Navigation route error", error);
            const message =
              error instanceof Error ? error.message : "Unable to calculate walking route.";
            showNotification("error", message);
            onNavigationRouteChange?.(null);
          } finally {
            setNavigationLoading(false);
          }
        },
        (geoError) => {
          console.warn("Geolocation error", geoError);
          setNavigationLoading(false);
          switch (geoError.code) {
            case geoError.PERMISSION_DENIED:
              showNotification(
                "error",
                "Location permission denied. Please enable location access and try again."
              );
              break;
            case geoError.POSITION_UNAVAILABLE:
              showNotification("error", "We couldn't determine your position. Please try again.");
              break;
            case geoError.TIMEOUT:
              showNotification("error", "Locating you took too long. Please retry.");
              break;
            default:
              showNotification("error", "Unexpected geolocation error occurred.");
          }
          onNavigationRouteChange?.(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        }
      );
    },
    [showNotification, onNavigationRouteChange]
  );

  useEffect(() => {
    if (!useApiKey || sanitizedApiKey.length === 0) {
      resolvingTenantRef.current = false;
      setTenantResolving(false);
      return;
    }

    if (tenantId && tenantId.trim().length > 0) {
      resolvingTenantRef.current = false;
      setTenantResolving(false);
      return;
    }

    if (resolvingTenantRef.current) {
      return;
    }

    resolvingTenantRef.current = true;
    setTenantResolving(true);

    const controller = new AbortController();

    (async () => {
      try {
        const url = `/api/plugin/resolve-tenant?apiKey=${encodeURIComponent(sanitizedApiKey)}`;
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": sanitizedApiKey,
          },
          signal: controller.signal,
          cache: "no-store",
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          console.warn("Failed to resolve tenantId from API key", { status: response.status, result });
          return;
        }

        if (typeof result?.tenantId === "string" && result.tenantId.trim().length > 0) {
          console.log("[tenantId] resolved via /api/plugin/resolve-tenant", {
            tenantId: result.tenantId,
            sources: result.sources,
          });
          setTenantId(result.tenantId.trim());
        } else {
          console.warn("Resolve-tenant endpoint returned without tenantId", result);
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error("Tenant resolution failed", error);
      } finally {
        resolvingTenantRef.current = false;
        setTenantResolving(false);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [useApiKey, sanitizedApiKey, tenantId]);

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

      if (useApiKey && sanitizedApiKey.length > 0) {
        requestBody.apiKey = sanitizedApiKey;
      } else if (tenantId) {
        requestBody.tenantId = tenantId;
      } else {
        requestBody.apiKey = sanitizedApiKey || defaultApiKey || "demo-key-1";
      }

      const response = await fetch(`${apiBaseUrl}${submitEventEndpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
        throw new Error(result.error || result.message || `Failed to create hang out (${response.status})`);
      }

      showNotification("success", "Hang out created successfully!");
      setShowForm(false);
      await loadAiSuggestions({ showSpinner: false, resetIndex: true });
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

      if (useApiKey && sanitizedApiKey.length > 0) {
        requestBody.apiKey = sanitizedApiKey;
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
      await loadAiSuggestions({ showSpinner: false, resetIndex: false });
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

      if (useApiKey && sanitizedApiKey.length > 0) {
        deleteParams.set("apiKey", sanitizedApiKey);
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
      await loadAiSuggestions({ showSpinner: false, resetIndex: true });
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
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  useEffect(() => {
    if (onEventsChange) {
      onEventsChange(sortedHangouts);
    }
  }, [sortedHangouts, onEventsChange]);

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

      {locationPending && (
        <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
          Updating your location… nearby hang outs may change shortly.
        </div>
      )}

      {combinedErrorMessage && (
        <div className="mb-4 p-3 rounded-lg bg-red-100 text-red-700">
          {combinedErrorMessage}
        </div>
      )}

      {showAIEvents && includeAI && aiSourceBreakdown && aiCardsRef.current.length > 0 && (
        <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
          AI sources — OpenAI: {aiSourceBreakdown.openai ?? 0}, Gemini: {aiSourceBreakdown.gemini ?? 0}, Fallback:{" "}
          {aiSourceBreakdown.fallback ?? 0}
        </div>
      )}

      {showTestingControls && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">API Testing Controls</h3>

          <div className="space-y-2">
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
                <label htmlFor="useApiKey" className="text-xs text-gray-700">
                  API Key
                </label>
                <input
                  type="radio"
                  id="useTenantId"
                  checked={!useApiKey}
                  onChange={() => setUseApiKey(false)}
                  className="w-4 h-4 ml-3"
                />
                <label htmlFor="useTenantId" className="text-xs text-gray-700">
                  Tenant ID
                </label>
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
              <p className="text-xs text-gray-500 mt-1">Demo keys: demo-key-1, demo-key-2, test-key</p>
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
                  onKeyDown={(e) => e.key === "Enter" && addTag()}
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
                onChange={(e) => setLimit(parseInt(e.target.value, 10) || 50)}
                min="1"
                max="100"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-gray-900"
              />
            </div>

            <button
              onClick={() => loadAiSuggestions({ showSpinner: true, resetIndex: true })}
              className="w-full px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
              disabled={aiLoading}
            >
              {aiLoading ? "Refreshing…" : "Refresh Events"}
            </button>
          </div>
        </div>
      )}

      {user && (
        <>
          <div className="sticky top-0 z-20 -mx-4 mb-4 px-4 pt-2 pb-3 backdrop-blur bg-white/95">
            <div className="flex items-center gap-2">
              <button
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-100"
                onClick={() => setShowForm(!showForm)}
              >
                {showForm ? "Cancel" : `+ Create ${eventLabel}`}
              </button>
              <button
                type="button"
                onClick={() => loadAiSuggestions({ showSpinner: true, resetIndex: true })}
                disabled={aiLoading || hangoutsLoading}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                aria-label="Refresh hang outs"
              >
                <span className="mr-2 text-base leading-none">⟳</span>
                Refresh
              </button>
            </div>
          </div>

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

      <div className="mt-6 flex flex-1 flex-col">
        <div className="relative flex-1">
          {!readyToRender ? (
            <div className="flex h-full min-h-[280px] items-center justify-center rounded-2xl border border-gray-200 bg-white/70 shadow-sm">
              <Loader />
            </div>
          ) : currentAdventure ? (
            <AnimatePresence mode="wait" initial={!initialAnimationPlayedRef.current}>
              <motion.div
                key={currentAdventure.id ?? `adventure-${panelState.currentIndex}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="h-full"
              >
                <EventCard
                  event={currentAdventure}
                  aiBadgeText={aiBadgeText}
                  primaryColor={primaryColor}
                  aiBadgeColor={aiBadgeColor}
                  aiBadgeTextColor={aiBadgeTextColor}
                  aiBackgroundColor={aiBackgroundColor}
                  onMoreInfo={onMoreInfo}
                  onNavigate={handleNavigate}
                  onUpdate={
                    currentAdventure.origin === "user" &&
                    currentAdventure.id &&
                    !currentAdventure.id.startsWith("AI-") &&
                    currentAdventure.createdBy !== "ai" &&
                    currentAdventure.createdBy === user?.uid
                      ? (updates: Partial<Event>) => {
                          if (currentAdventure.id) {
                            void handleUpdate(currentAdventure.id, updates, currentAdventure.createdBy);
                          }
                        }
                      : undefined
                  }
                  onDelete={
                    currentAdventure.origin === "user" &&
                    currentAdventure.id &&
                    !currentAdventure.id.startsWith("AI-") &&
                    currentAdventure.createdBy !== "ai"
                      ? () => {
                          if (currentAdventure.id) {
                            void handleDelete(currentAdventure.id, currentAdventure.createdBy);
                          }
                        }
                      : undefined
                  }
                />
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="flex h-full min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white/70 px-6 text-center text-sm font-medium text-gray-600">
              No Adventure Cards Available
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleNextAdventure}
          disabled={!readyToRender || totalAdventureCards <= 1}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          aria-label="View the next adventure card"
        >
          Next Adventure
          <span aria-hidden="true" className="text-base leading-none">
            →
          </span>
        </button>

        {readyToRender && totalAdventureCards > 0 && (
          <p className="mt-2 text-xs text-gray-500">
            Adventure {panelState.currentIndex + 1} of {totalAdventureCards}
          </p>
        )}

        {noAdventuresAvailable && showAIEvents && includeAI && aiError && (
          <p className="mt-3 text-xs font-medium text-red-600">{aiError}</p>
        )}
      </div>

      {navigationLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-2xl bg-white px-6 py-4 shadow-xl">
            <Loader />
            <p className="mt-2 text-sm font-medium text-gray-700">Calculating walking route…</p>
          </div>
        </div>
      )}
    </div>
  );
}
