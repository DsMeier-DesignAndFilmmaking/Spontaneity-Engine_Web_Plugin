"use client";

import { useEffect, useRef, useState } from "react";
import { Event } from "@/lib/types";
import { formatDateTime } from "@/lib/helpers";
import { useAuth } from "./AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface EventCardProps {
  event: Event;
  onEdit?: (event: Event) => void;
  onDelete?: () => void;
  onUpdate?: (updates: Partial<Event>) => void;
  onNavigate?: (event: Event) => void;
  onMoreInfo?: (event: Event) => void;
  aiBadgeText?: string;
  primaryColor?: string;
  aiBadgeColor?: string;
  aiBadgeTextColor?: string;
  aiBackgroundColor?: string;
}

export default function EventCard({
  event,
  onEdit,
  onDelete,
  onUpdate,
  onNavigate,
  onMoreInfo,
  aiBadgeText = "🤖 AI Event",
  primaryColor = "#3b82f6",
  aiBadgeColor = "#ede9fe",
  aiBadgeTextColor = "#4c1d95",
  aiBackgroundColor = "#f5f3ff",
}: EventCardProps) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description);

  const isOwner = user && event.createdBy === user.uid;
  const isAI = event.id?.startsWith("AI-") || event.createdBy === "ai" || event.createdBy?.startsWith("AI-");

  type LegacyCreatorFields = {
    creatorName?: string;
    creatorProfileImageUrl?: string;
    createdByName?: string;
    profileImageUrl?: string;
  };

  const legacyEvent = event as Event & LegacyCreatorFields;

  const defaultAvatar = "/default-profile.png";
  const initialName =
    event.creator?.name ||
    legacyEvent.creatorName ||
    legacyEvent.createdByName ||
    (event.createdBy && event.createdBy !== "unknown" && !event.createdBy.startsWith("AI-")
      ? event.createdBy
      : undefined);

  const [displayName, setDisplayName] = useState<string>(initialName || (isAI ? "AI Concierge" : "Anonymous"));
  const [avatarUrl, setAvatarUrl] = useState<string>(
    event.creator?.profileImageUrl ||
      legacyEvent.creatorProfileImageUrl ||
      legacyEvent.profileImageUrl ||
      defaultAvatar
  );

  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isMounted = true;

    const maybeResolveName = async () => {
      if (
        initialName ||
        isAI ||
        (!event.createdBy && !event.creator?.uid) ||
        event.createdBy === "unknown" ||
        event.createdBy?.startsWith("AI-")
      ) {
        return;
      }

      if (!db) {
        return;
      }

      try {
        const lookupUid = event.creator?.uid || event.createdBy;
        const userDocRef = doc(db, "users", lookupUid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const userData = userSnap.data() as { displayName?: string; name?: string };
          const fallbackName = userData.displayName || userData.name || undefined;
          if (isMounted && fallbackName) {
            setDisplayName(fallbackName);
          }
        }
      } catch (error) {
        console.warn("Failed to fetch creator display name:", error);
      }
    };

    void maybeResolveName();

    return () => {
      isMounted = false;
    };
  }, [event.createdBy, event.creator?.uid, initialName, isAI]);

  useEffect(() => {
    const nextAvatar =
      event.creator?.profileImageUrl ||
      legacyEvent.creatorProfileImageUrl ||
      legacyEvent.profileImageUrl ||
      defaultAvatar;
    setAvatarUrl((prev) => (prev === nextAvatar ? prev : nextAvatar));
  }, [event.creator?.profileImageUrl, legacyEvent.creatorProfileImageUrl, legacyEvent.profileImageUrl]);

  useEffect(() => {
    const nextName = initialName || (isAI ? "AI Concierge" : "Anonymous");
    setDisplayName((prev) => (prev === nextName ? prev : nextName));
  }, [initialName, isAI, event.id]);

  useEffect(() => {
    if (!actionsOpen) return;

    const handleClick = (clickEvent: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(clickEvent.target as Node)) {
        setActionsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [actionsOpen]);

  const formatDate = (date: unknown) => {
    if (date instanceof Date) {
      return formatDateTime(date);
    }

    if (date && typeof date === "object" && "toDate" in date && typeof (date as { toDate?: () => Date }).toDate === "function") {
      const converted = (date as { toDate: () => Date }).toDate();
      return formatDateTime(converted);
    }

    return formatDateTime(new Date(date as string | number | Date));
  };

  const handleSave = () => {
    if (onUpdate) {
      onUpdate({ title, description });
    } else if (onEdit) {
      onEdit({ ...event, title, description });
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setTitle(event.title);
    setDescription(event.description);
    setEditing(false);
  };

  const renderAvatarBlock = () => (
    <div className="mb-3 flex items-center gap-3">
      <div className="h-10 w-10 flex-shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl || defaultAvatar}
          alt={displayName}
          className="h-10 w-10 rounded-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => {
            if (e.currentTarget.src !== defaultAvatar) {
              setAvatarUrl(defaultAvatar);
            }
          }}
        />
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-semibold text-gray-900">{displayName}</span>
        {!isAI && event.createdAt && (
          <span className="text-xs text-gray-500">{`Posted ${formatDate(event.createdAt)}`}</span>
        )}
      </div>
    </div>
  );

  return (
    <div
      className={`relative rounded-2xl p-4 shadow transition hover:shadow-md ${
        isAI ? "border border-yellow-300" : "bg-white"
      }`}
      style={isAI ? { backgroundColor: aiBackgroundColor } : {}}
    >
      {isAI && (
        <span
          className="mb-2 inline-block rounded-full px-2 py-1 text-xs font-medium"
          style={{ backgroundColor: aiBadgeColor, color: aiBadgeTextColor }}
        >
          {aiBadgeText}
        </span>
      )}

      {isOwner && !isAI && (
        <div className="absolute right-4 top-4" ref={actionsRef}>
          <button
            type="button"
            onClick={() => setActionsOpen((open) => !open)}
            className="rounded-full border border-gray-200 bg-white p-2 text-gray-600 shadow-sm transition hover:bg-gray-50 hover:text-gray-900"
            aria-label="Open hang out actions"
          >
            ⋯
          </button>
          {actionsOpen && (
            <div className="absolute right-0 z-10 mt-2 w-40 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
              {(onEdit || onUpdate) && (
                <button
                  type="button"
                  onClick={() => {
                    setActionsOpen(false);
                    setEditing(true);
                  }}
                  className="block w-full px-4 py-2 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                >
                  Edit Hang Out
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    setActionsOpen(false);
                    onDelete();
                  }}
                  className="block w-full px-4 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                >
                  Delete Hang Out
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {renderAvatarBlock()}

      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
        <p className="mt-1 text-gray-800">{event.description}</p>
      </div>

      {editing ? (
        <div className="space-y-2">
          <input
            className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Hang Out Title"
          />
          <textarea
            className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            rows={4}
          />
          <div className="flex gap-2">
            <button
              className="flex-1 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              onClick={handleSave}
            >
              Save Changes
            </button>
            <button
              className="flex-1 rounded border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-100"
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {event.location && onNavigate ? (
            !isAI ? (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => onMoreInfo?.(event)}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-100"
                >
                  More Info
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate(event)}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Let's Go!
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate(event)}
                className="mt-3 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Let's Go!
              </button>
            )
          ) : null}
        </>
      )}
    </div>
  );
}
