"use client";

import React from "react";
import { useRouter } from "next/navigation";

export interface SpontaneityWidgetConfig {
  // Authentication
  apiKey?: string;
  tenantId?: string;
  
  // UI Customization
  buttonText?: string;
  buttonStyle?: React.CSSProperties;
  className?: string;
  
  // Theme Customization
  primaryColor?: string;
  mapStyle?: string;
  showAIEvents?: boolean;
  enableSorting?: boolean;
  defaultSortBy?: "newest" | "nearest";
  aiBadgeText?: string;
  eventLabel?: string;
  cacheDuration?: number;
  pollingInterval?: number;
}

export default function SpontaneityWidget({
  apiKey,
  tenantId,
  buttonText = "Discover Events",
  buttonStyle,
  className = "",
  primaryColor = "#3b82f6",
}: SpontaneityWidgetConfig) {
  const router = useRouter();

  const handleClick = () => {
    const params = new URLSearchParams();
    if (apiKey) params.set("apiKey", apiKey);
    if (tenantId) params.set("tenantId", tenantId);
    router.push(
      params.toString()
        ? `/explore/spontaneous?${params.toString()}`
        : "/explore/spontaneous"
    );
  };

  return (
    <button
      onClick={handleClick}
      className={`spontaneity-widget-button ${className}`}
      style={{
        backgroundColor: primaryColor,
        color: "white",
        border: "none",
        borderRadius: "9999px",
        padding: "14px 28px",
        fontSize: "16px",
        fontWeight: 600,
        cursor: "pointer",
        boxShadow: "0 10px 30px rgba(59, 130, 246, 0.35)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        ...buttonStyle,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 18px 42px rgba(59, 130, 246, 0.35)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 10px 30px rgba(59, 130, 246, 0.35)";
      }}
    >
      {buttonText}
    </button>
  );
}
