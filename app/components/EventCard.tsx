"use client";

import { useEffect, useState } from "react";
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
  aiBadgeText?: string;
  // Theme customization
  primaryColor?: string; // For edit/delete buttons
  aiBadgeColor?: string; // Background color for AI badge
  aiBadgeTextColor?: string; // Text color for AI badge
  aiBackgroundColor?: string; // Background color for AI event cards
}

export default function EventCard({ 
  event, 
  onEdit, 
  onDelete, 
  onUpdate, 
  aiBadgeText = "🤖 AI Event",
  primaryColor = "#3b82f6",
  aiBadgeColor = "#ede9fe", // violet-100
  aiBadgeTextColor = "#4c1d95", // violet-900
  aiBackgroundColor = "#f5f3ff", // subtle violet
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

  const [displayName, setDisplayName] = useState<string>(
    initialName || (isAI ? "AI Concierge" : "Anonymous")
  );
  const [avatarUrl, setAvatarUrl] = useState<string>(
    event.creator?.profileImageUrl ||
      legacyEvent.creatorProfileImageUrl ||
      legacyEvent.profileImageUrl ||
      defaultAvatar
  );

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
    // The avatar source may change when Firestore data updates; update state if it differs.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAvatarUrl((prev) => (prev === nextAvatar ? prev : nextAvatar));
  }, [event.creator?.profileImageUrl, legacyEvent.creatorProfileImageUrl, legacyEvent.profileImageUrl]);

  useEffect(() => {
    const nextName = initialName || (isAI ? "AI Concierge" : "Anonymous");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisplayName((prev) => (prev === nextName ? prev : nextName));
  }, [initialName, isAI, event.id]);

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
      // Fallback to onEdit if onUpdate not provided
      onEdit({ ...event, title, description });
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setTitle(event.title);
    setDescription(event.description);
    setEditing(false);
  };

  return (
    <div
      className={`rounded-2xl shadow p-4 mb-4 hover:shadow-md transition ${
        isAI ? "border border-yellow-300" : "bg-white"
      }`}
      style={isAI ? { backgroundColor: aiBackgroundColor } : {}}
    >
      {/* AI Badge */}
      {isAI && (
        <span 
          className="inline-block text-xs px-2 py-1 rounded-full mb-2 font-medium"
          style={{ 
            backgroundColor: aiBadgeColor, 
            color: aiBadgeTextColor 
          }}
        >
          {aiBadgeText}
        </span>
      )}

      {!isAI && (
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
            {event.createdAt && (
              <span className="text-xs text-gray-500">{`Posted ${formatDate(event.createdAt)}`}</span>
            )}
          </div>
        </div>
      )}

      {editing ? (
        <div className="space-y-2">
          <input
            className="border border-gray-300 p-2 rounded w-full text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Hang Out Title"
          />
          <textarea
            className="border border-gray-300 p-2 rounded w-full text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            rows={4}
          />
          <div className="flex gap-2">
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              onClick={handleSave}
            >
              Save
            </button>
            <button
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-lg text-gray-900">{event.title}</h3>
            {isOwner && !isAI && (
              <div className="flex gap-2">
                {(onEdit || onUpdate) && (
                  <button
                    onClick={() => setEditing(true)}
                    className="text-sm font-medium hover:opacity-80 transition-opacity"
                    style={{ color: primaryColor }}
                  >
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => onDelete()}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>

          <p className="text-gray-800 mb-2">{event.description}</p>

          <div className="flex flex-wrap gap-2 mb-2">
            {event.tags?.map((tag: string, idx: number) => (
              <span
                key={idx}
                className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-md font-medium"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="text-xs text-gray-700 mt-2">
            {isAI ? "🤖 AI Generated" : `Created ${formatDate(event.createdAt)}`}
          </div>
        </>
      )}
    </div>
  );
}
