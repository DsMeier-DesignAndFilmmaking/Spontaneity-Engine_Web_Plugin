/**
 * Travel Design System - Default Theme
 * 
 * The base theme that combines all tokens into a cohesive design system.
 * This is the default theme used throughout the application.
 */

import { colors } from "../colors";
import { typography } from "../typography";
import { spacing, semanticSpacing } from "../spacing";
import { shadows } from "../shadows";
import { radius, semanticRadius } from "../radius";

export const defaultTheme = {
  colors,
  typography,
  spacing,
  semanticSpacing,
  shadows,
  radius,
  semanticRadius,
  
  // Theme metadata
  name: "Default Travel Theme",
  description: "The default travel-themed design system with emotional color palette",
  version: "1.0.0",
};

// Type exports for TypeScript
export type Theme = typeof defaultTheme;
export type ThemeColors = typeof colors;
export type ThemeTypography = typeof typography;
