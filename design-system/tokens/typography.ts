/**
 * Travel Design System - Typography Tokens
 * 
 * Rounded, approachable sans-serif fonts that convey friendliness and accessibility.
 * Recommended fonts: Inter, Nunito, Outfit, or system fallbacks.
 */

export const typography = {
  fontFamily: {
    sans: [
      "Inter",
      "-apple-system",
      "BlinkMacSystemFont",
      "'Segoe UI'",
      "Roboto",
      "'Helvetica Neue'",
      "Arial",
      "sans-serif",
    ].join(", "),
    
    display: [
      "Outfit",
      "Inter",
      "-apple-system",
      "BlinkMacSystemFont",
      "sans-serif",
    ].join(", "),
    
    mono: [
      "'SF Mono'",
      "Monaco",
      "'Cascadia Code'",
      "'Roboto Mono'",
      "Consolas",
      "monospace",
    ].join(", "),
  },
  
  fontSize: {
    xs: "0.75rem", // 12px
    sm: "0.875rem", // 14px
    base: "1rem", // 16px
    lg: "1.125rem", // 18px
    xl: "1.25rem", // 20px
    "2xl": "1.5rem", // 24px
    "3xl": "1.875rem", // 30px
    "4xl": "2.25rem", // 36px
    "5xl": "3rem", // 48px
    "6xl": "3.75rem", // 60px
  },
  
  fontWeight: {
    light: "300",
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    extrabold: "800",
  },
  
  lineHeight: {
    tight: "1.25",
    snug: "1.375",
    normal: "1.5",
    relaxed: "1.625",
    loose: "2",
  },
  
  letterSpacing: {
    tighter: "-0.05em",
    tight: "-0.025em",
    normal: "0",
    wide: "0.025em",
    wider: "0.05em",
    widest: "0.1em",
  },
  
  // Semantic text styles
  textStyles: {
    display: {
      fontSize: "3rem",
      fontWeight: "700",
      lineHeight: "1.2",
      letterSpacing: "-0.025em",
    },
    h1: {
      fontSize: "2.25rem",
      fontWeight: "700",
      lineHeight: "1.3",
      letterSpacing: "-0.025em",
    },
    h2: {
      fontSize: "1.875rem",
      fontWeight: "600",
      lineHeight: "1.35",
      letterSpacing: "-0.025em",
    },
    h3: {
      fontSize: "1.5rem",
      fontWeight: "600",
      lineHeight: "1.4",
      letterSpacing: "-0.025em",
    },
    h4: {
      fontSize: "1.25rem",
      fontWeight: "600",
      lineHeight: "1.45",
      letterSpacing: "0",
    },
    body: {
      fontSize: "1rem",
      fontWeight: "400",
      lineHeight: "1.5",
      letterSpacing: "0",
    },
    bodyLarge: {
      fontSize: "1.125rem",
      fontWeight: "400",
      lineHeight: "1.625",
      letterSpacing: "0",
    },
    caption: {
      fontSize: "0.875rem",
      fontWeight: "400",
      lineHeight: "1.5",
      letterSpacing: "0",
    },
    small: {
      fontSize: "0.75rem",
      fontWeight: "400",
      lineHeight: "1.5",
      letterSpacing: "0.025em",
    },
    button: {
      fontSize: "1rem",
      fontWeight: "600",
      lineHeight: "1.5",
      letterSpacing: "0.025em",
    },
  },
};

// Type exports for TypeScript
export type TypographyToken = typeof typography;
export type FontSize = keyof typeof typography.fontSize;
export type FontWeight = keyof typeof typography.fontWeight;
