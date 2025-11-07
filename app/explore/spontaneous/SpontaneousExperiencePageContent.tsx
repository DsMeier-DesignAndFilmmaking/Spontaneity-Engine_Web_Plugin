"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import MapView from "@/app/components/MapView";
import EventFeed from "@/app/components/EventFeed";
import EventDetailPanel from "@/app/components/EventDetailPanel";
import { Event } from "@/lib/types";
import type { NavigationRoutePayload } from "@/lib/mapbox";

export default function SpontaneousExperiencePageContent() {
  const router = useRouter();
  const params = useSearchParams();

  const apiKey = params.get("apiKey") || undefined;
  const tenantId = params.get("tenantId") || undefined;

  const [events, setEvents] = useState<Event[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>();
  const [panelOpen, setPanelOpen] = useState(false);
  const [detailEvent, setDetailEvent] = useState<Event | null>(null);
  const [activeRoute, setActiveRoute] = useState<NavigationRoutePayload | null>(null);

  const handleBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/explore");
    }
  }, [router]);

  const handleEventsChange = useCallback((incoming: Event[]) => {
    setEvents(incoming);
    setHasLoaded(true);
  }, []);

  const handleMoreInfo = useCallback(
    (event: Event) => {
      setDetailEvent(event);
      setSelectedEventId(event.id);
      setPanelOpen(true);
    },
    []
  );

  const hasOnlyAIEvents = useMemo(
    () =>
      events.length > 0 &&
      events.every((event) => (event.source ?? "").toLowerCase() === "ai"),
    [events]
  );

  const hasUserEvents = useMemo(
    () =>
      events.some((event) => (event.source ?? "").toLowerCase() !== "ai"),
    [events]
  );

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="spontaneous-view"
        className="relative flex h-screen w-screen overflow-hidden bg-transparent"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <div className="relative flex-1">
          <MapView
            events={events}
            selectedEventId={selectedEventId}
            onEventClick={(event) => setSelectedEventId(event.id)}
            navigationRoute={activeRoute}
            onClearNavigation={() => {
              setActiveRoute(null);
              setDetailEvent(null);
            }}
          />

          <motion.button
            type="button"
            onClick={handleBack}
            className="pointer-events-auto absolute top-5 left-4 z-40 flex items-center gap-2 rounded-full bg-white/85 px-4 py-2 text-sm font-semibold text-gray-900 shadow-lg backdrop-blur transition hover:bg-white"
            initial={{ y: -12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <span className="text-lg leading-none">←</span>
            Back
          </motion.button>

          {!panelOpen && (
            <motion.button
              type="button"
              onClick={() => {
                setPanelOpen(true);
                setDetailEvent(null);
              }}
              className="pointer-events-auto absolute bottom-32 right-4 md:bottom-24 md:right-6 z-40 flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              <motion.span
                className="text-lg leading-none"
                variants={{
                  initial: { rotate: -90, scale: 0.9, opacity: 0 },
                  enter: {
                    rotate: 0,
                    scale: 1,
                    opacity: 1,
                    transition: { duration: 0.5, ease: "easeOut" },
                  },
                  idle: {
                    rotate: [0, 2, -2, 0],
                    transition: {
                      duration: 3.2,
                      ease: "easeInOut",
                      repeat: Infinity,
                      repeatDelay: 6,
                    },
                  },
                }}
                initial="initial"
                animate={["enter", "idle"]}
                aria-hidden="true"
              >
                🎲
              </motion.span>
              Feeling Spontaneous?
            </motion.button>
          )}

          {hasLoaded && !hasUserEvents && (
            <motion.div
              className="pointer-events-none absolute bottom-6 left-1/2 z-40 w-[90vw] max-w-md -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-center text-sm text-white shadow-lg backdrop-blur"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              {hasOnlyAIEvents
                ? "No live hang outs nearby yet—here’s some AI inspiration while the community catches up."
                : "No hang outs discovered just yet. Try refreshing in a moment."}
            </motion.div>
          )}
        </div>

        {panelOpen && (
          <motion.aside
            className="absolute inset-y-0 right-0 z-30 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 px-5 pb-3 pt-24 md:pt-20 backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
                    Feeling Spontaneous?
                  </p>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Explore Hang Outs and Things To Do
                  </h2>
                  <p className="mt-1 text-xs text-gray-500">
                    Live and upcoming community hang outs based on real-time information, such as weather, time and your saved and learned preferences.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPanelOpen(false);
                    setDetailEvent(null);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-gray-300 hover:text-gray-700"
                  aria-label="Close panel"
                >
                  ×
                </button>
              </div>
            </header>

            <div
              className={`flex-1 overflow-hidden ${detailEvent ? "md:grid md:grid-cols-[minmax(0,0.65fr)_minmax(0,0.35fr)]" : ""}`}
            >
              <div
                className={`flex h-full flex-col ${detailEvent ? "border-b border-gray-200 md:border-b-0 md:border-r" : ""}`}
              >
                <div className="flex-1 overflow-y-auto px-4 pb-6 pt-4">
                  <EventFeed
                    onEventsChange={handleEventsChange}
                    onNavigationRouteChange={setActiveRoute}
                    onMoreInfo={handleMoreInfo}
                    defaultApiKey={apiKey}
                    defaultTenantId={tenantId}
                    showTestingControls={false}
                    showAIEvents
                    enableSorting={false}
                    defaultSortBy="newest"
                    eventLabel="Hang Out"
                    aiBadgeText="🤖 AI Inspiration"
                    cacheDuration={5}
                    pollingInterval={45}
                  />
                </div>
              </div>

              {detailEvent && (
                <div className="hidden h-full overflow-y-auto md:block">
                  <EventDetailPanel
                    event={detailEvent}
                    onClose={() => setDetailEvent(null)}
                  />
                </div>
              )}
            </div>
          </motion.aside>
        )}
        {panelOpen && detailEvent && (
          <div className="pointer-events-none absolute inset-y-0 right-0 z-20 flex w-full max-w-sm flex-col bg-transparent md:hidden">
            <div className="pointer-events-auto"> 
              <EventDetailPanel
                event={detailEvent}
                onClose={() => setDetailEvent(null)}
              />
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

