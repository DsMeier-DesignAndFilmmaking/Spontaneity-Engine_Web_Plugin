/**
 * Travel Design System - Shadow Tokens
 * 
 * Soft, natural shadows that emphasize depth and warmth.
 * Creates a sense of elevation without being overwhelming.
 */

export const shadows = {
  // Elevation levels
  none: "none",
  
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  base: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  
  // Inner shadows
  inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)",
  
  // Colored shadows for brand elements
  brand: {
    primary: "0 4px 14px 0 rgba(0, 122, 255, 0.15)",
    secondary: "0 4px 14px 0 rgba(255, 122, 89, 0.15)",
    accent: "0 4px 14px 0 rgba(42, 183, 202, 0.15)",
  },
  
  // Focus states
  focus: {
    default: "0 0 0 3px rgba(0, 122, 255, 0.1)",
    error: "0 0 0 3px rgba(255, 59, 48, 0.1)",
    success: "0 0 0 3px rgba(51, 217, 178, 0.1)",
  },
  
  // Hover states
  hover: {
    sm: "0 2px 4px 0 rgba(0, 0, 0, 0.08)",
    md: "0 6px 12px -2px rgba(0, 0, 0, 0.12)",
  },
};

// Type exports for TypeScript
export type ShadowToken = typeof shadows;
