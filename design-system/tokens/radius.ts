/**
 * Travel Design System - Border Radius Tokens
 * 
 * Soft, natural radius values that create warmth and approachability.
 * Rounded corners evoke friendliness and modern design.
 */

export const radius = {
  none: "0",
  sm: "0.25rem", // 4px
  base: "0.375rem", // 6px
  md: "0.5rem", // 8px
  lg: "0.75rem", // 12px
  xl: "1rem", // 16px
  "2xl": "1.5rem", // 24px
  "3xl": "2rem", // 32px
  full: "9999px",
};

// Semantic radius tokens
export const semanticRadius = {
  // Component radius
  button: radius.md, // 8px
  input: radius.md, // 8px
  card: radius["2xl"], // 24px
  badge: radius.full, // Full pill shape
  avatar: radius.full, // Full circle
  
  // Layout radius
  modal: radius.xl, // 16px
  dropdown: radius.lg, // 12px
  tooltip: radius.md, // 8px
  
  // Special cases
  image: radius.lg, // 12px
  chip: radius.full, // Full pill
};

// Type exports for TypeScript
export type RadiusToken = typeof radius;
export type SemanticRadius = typeof semanticRadius;
