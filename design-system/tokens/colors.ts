/**
 * Travel Design System - Color Tokens
 * 
 * Emotional palette inspired by modern travel and exploration brands.
 * Colors evoke: freedom, movement, calm energy, sunlight, trust, and connection.
 */

export const colors = {
  brand: {
    primary: "#007AFF", // Discovery Blue - Primary actions, links, trust
    secondary: "#FF7A59", // Sunset Coral - Secondary actions, highlights
    accent: "#2AB7CA", // Adventure Teal - Accents, callouts
  },
  
  neutral: {
    white: "#FFFFFF", // Cloud White - Pure backgrounds
    black: "#1C1C1E", // Jet Black - Primary text
    gray: {
      50: "#F9FAFB", // Soft Cloud
      100: "#F4F5F7", // Soft Sand
      200: "#E5E7EB", // Light Gray
      300: "#D1D5DB", // Medium Gray
      400: "#9CA3AF", // Gray
      500: "#6B7280", // Dark Gray
      600: "#4B5563", // Darker Gray
      700: "#374151", // Very Dark Gray
      800: "#1F2937", // Almost Black
      900: "#111827", // Near Black
    },
  },
  
  status: {
    success: "#33D9B2", // Success Green - Confirmations, positive states
    warning: "#FFB700", // Warning Amber - Warnings, attention needed
    error: "#FF3B30", // Error Red - Errors, destructive actions
    info: "#007AFF", // Info Blue - Informational messages
  },
  
  semantic: {
    background: {
      primary: "#FFFFFF",
      secondary: "#F9FAFB",
      tertiary: "#F4F5F7",
      accent: "#FFFBEB", // Warm cream for AI highlights
    },
    text: {
      primary: "#1C1C1E",
      secondary: "#6B7280",
      tertiary: "#9CA3AF",
      inverse: "#FFFFFF",
    },
    border: {
      default: "#E5E7EB",
      hover: "#D1D5DB",
      focus: "#007AFF",
      error: "#FF3B30",
    },
  },
  
  // Travel-specific semantic colors
  travel: {
    discovery: "#007AFF", // Discovery Blue
    adventure: "#2AB7CA", // Adventure Teal
    sunset: "#FF7A59", // Sunset Coral
    sunrise: "#FFB700", // Sunrise Amber
    ocean: "#0066CC", // Deep Ocean Blue
    sky: "#87CEEB", // Sky Blue
    sand: "#F4F5F7", // Soft Sand
    earth: "#8B6914", // Earth Brown
  },
};

// Type exports for TypeScript
export type ColorToken = typeof colors;
export type BrandColors = typeof colors.brand;
export type NeutralColors = typeof colors.neutral;
export type StatusColors = typeof colors.status;
