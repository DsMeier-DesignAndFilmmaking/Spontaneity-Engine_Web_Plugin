/**
 * Travel Design System - Spacing Tokens
 * 
 * 4-based scale for consistent, harmonious spacing throughout the UI.
 * Based on 4px base unit for visual rhythm and harmony.
 */

export const spacing = {
  // Base 4px unit scale
  0: "0",
  1: "0.25rem", // 4px
  2: "0.5rem", // 8px
  3: "0.75rem", // 12px
  4: "1rem", // 16px
  5: "1.25rem", // 20px
  6: "1.5rem", // 24px
  8: "2rem", // 32px
  10: "2.5rem", // 40px
  12: "3rem", // 48px
  16: "4rem", // 64px
  20: "5rem", // 80px
  24: "6rem", // 96px
  32: "8rem", // 128px
  40: "10rem", // 160px
  48: "12rem", // 192px
  64: "16rem", // 256px
};

// Semantic spacing tokens
export const semanticSpacing = {
  // Component spacing
  component: {
    padding: {
      xs: spacing[2], // 8px
      sm: spacing[3], // 12px
      md: spacing[4], // 16px
      lg: spacing[6], // 24px
      xl: spacing[8], // 32px
    },
    gap: {
      xs: spacing[1], // 4px
      sm: spacing[2], // 8px
      md: spacing[4], // 16px
      lg: spacing[6], // 24px
      xl: spacing[8], // 32px
    },
  },
  
  // Layout spacing
  layout: {
    section: spacing[16], // 64px
    container: spacing[8], // 32px
    card: spacing[6], // 24px
    group: spacing[4], // 16px
  },
  
  // Content spacing
  content: {
    paragraph: spacing[4], // 16px
    heading: spacing[6], // 24px
    list: spacing[3], // 12px
    inline: spacing[2], // 8px
  },
};

// Type exports for TypeScript
export type SpacingToken = typeof spacing;
export type SemanticSpacing = typeof semanticSpacing;
