/**
 * Travel Design System - Client Theme Example
 * 
 * Demonstrates how a travel brand or client (e.g., boutique tour company or event host)
 * can override base tokens with their own brand palette, logo color, or typography.
 * 
 * This is an example implementation - clients can customize this pattern to match
 * their brand identity while maintaining the design system structure.
 */

import { colors, typography, spacing, semanticSpacing, shadows, radius, semanticRadius } from "../index";
import type { Theme } from "./default";

/**
 * Example: Luxury Travel Brand Theme
 * A deeper, more sophisticated palette for a premium travel brand
 */
export const clientTheme: Theme = {
  colors: {
    ...colors,
    brand: {
      primary: "#005C99", // Deeper blue for luxury travel brand
      secondary: "#C08457", // Warm bronze instead of coral
      accent: "#FFC04D", // Gold highlight for premium feel
    },
    travel: {
      ...colors.travel,
      discovery: "#005C99", // Deeper ocean blue
      adventure: "#0A4D68", // Dark teal
      sunset: "#C08457", // Bronze sunset
      sunrise: "#FFC04D", // Gold sunrise
      ocean: "#003D5C", // Deep ocean
      sky: "#4A90E2", // Premium sky blue
      sand: "#F5E6D3", // Warm sand
      earth: "#8B6914", // Rich earth
    },
  },
  typography: {
    ...typography,
    fontFamily: {
      ...typography.fontFamily,
      sans: [
        "'Playfair Display'",
        "Georgia",
        "serif",
      ].join(", "),
      display: [
        "'Playfair Display'",
        "Georgia",
        "serif",
      ].join(", "),
    },
    textStyles: {
      ...typography.textStyles,
      display: {
        ...typography.textStyles.display,
        fontWeight: "700",
        letterSpacing: "0.01em",
      },
      h1: {
        ...typography.textStyles.h1,
        fontWeight: "700",
      },
    },
  },
  spacing,
  semanticSpacing,
  shadows: {
    ...shadows,
    brand: {
      primary: "0 4px 14px 0 rgba(0, 92, 153, 0.2)", // Deeper blue shadow
      secondary: "0 4px 14px 0 rgba(192, 132, 87, 0.15)",
      accent: "0 4px 14px 0 rgba(255, 192, 77, 0.2)", // Gold shadow
    },
  },
  radius,
  semanticRadius,
  name: "Luxury Travel Brand Theme",
  description: "Premium theme with deeper blues, bronze accents, and serif typography",
  version: "1.0.0",
};

/**
 * Example: Adventure Travel Company Theme
 * Vibrant, energetic colors for an adventure-focused brand
 */
export const adventureClientTheme: Theme = {
  colors: {
    ...colors,
    brand: {
      primary: "#00A8E8", // Bright sky blue
      secondary: "#FF6B35", // Vibrant orange
      accent: "#00D9FF", // Electric cyan
    },
    travel: {
      ...colors.travel,
      discovery: "#00A8E8",
      adventure: "#00D9FF",
      sunset: "#FF6B35",
      sunrise: "#FFB700",
      ocean: "#0077BE",
      sky: "#00A8E8",
      sand: "#FFF8E7",
      earth: "#8B4513",
    },
  },
  typography: {
    ...typography,
    fontFamily: {
      ...typography.fontFamily,
      sans: [
        "'Nunito'",
        "Inter",
        "-apple-system",
        "sans-serif",
      ].join(", "),
    },
  },
  spacing,
  semanticSpacing,
  shadows,
  radius,
  semanticRadius,
  name: "Adventure Travel Theme",
  description: "Energetic theme with vibrant colors and rounded typography",
  version: "1.0.0",
};

/**
 * Helper function to merge client theme with default theme
 * This allows partial overrides while maintaining full theme structure
 */
export function createClientTheme(
  overrides: Partial<Theme>
): Theme {
  // Import default theme dynamically to avoid circular dependencies
  const { defaultTheme } = require("./default");
  
  return {
    ...defaultTheme,
    ...overrides,
    colors: {
      ...defaultTheme.colors,
      ...overrides.colors,
      brand: {
        ...defaultTheme.colors.brand,
        ...overrides.colors?.brand,
      },
      neutral: {
        ...defaultTheme.colors.neutral,
        ...overrides.colors?.neutral,
        gray: {
          ...defaultTheme.colors.neutral.gray,
          ...overrides.colors?.neutral?.gray,
        },
      },
      travel: {
        ...defaultTheme.colors.travel,
        ...overrides.colors?.travel,
      },
    },
    typography: {
      ...defaultTheme.typography,
      ...overrides.typography,
      fontFamily: {
        ...defaultTheme.typography.fontFamily,
        ...overrides.typography?.fontFamily,
      },
      textStyles: {
        ...defaultTheme.typography.textStyles,
        ...overrides.typography?.textStyles,
      },
    },
  } as Theme;
}
