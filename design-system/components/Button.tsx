/**
 * Travel Design System - Button Component
 * 
 * A flexible button component that demonstrates design token usage.
 * Supports multiple variants and can be customized with theme tokens.
 */

import React from "react";
import { colors } from "../tokens/colors";
import { typography } from "../tokens/typography";
import { spacing } from "../tokens/spacing";
import { shadows } from "../tokens/shadows";
import { radius, semanticRadius } from "../tokens/radius";

interface ButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "accent" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  fullWidth?: boolean;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  className?: string;
  style?: React.CSSProperties;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  fullWidth = false,
  onClick,
  type = "button",
  className = "",
  style = {},
}) => {
  // Base styles
  const baseStyles: React.CSSProperties = {
    fontFamily: typography.fontFamily.sans,
    ...typography.textStyles.button,
    borderRadius: semanticRadius.button,
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 0.2s ease-in-out",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    width: fullWidth ? "100%" : "auto",
    ...style,
  };

  // Size styles
  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: {
      padding: `${spacing[2]} ${spacing[3]}`,
      fontSize: typography.fontSize.sm,
    },
    md: {
      padding: `${spacing[3]} ${spacing[6]}`,
      fontSize: typography.fontSize.base,
    },
    lg: {
      padding: `${spacing[4]} ${spacing[8]}`,
      fontSize: typography.fontSize.lg,
    },
  };

  // Variant styles
  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: disabled ? colors.neutral.gray[300] : colors.brand.primary,
      color: colors.neutral.white,
      boxShadow: disabled ? shadows.none : shadows.sm,
    },
    secondary: {
      backgroundColor: disabled ? colors.neutral.gray[300] : colors.brand.secondary,
      color: colors.neutral.white,
      boxShadow: disabled ? shadows.none : shadows.sm,
    },
    accent: {
      backgroundColor: disabled ? colors.neutral.gray[300] : colors.brand.accent,
      color: colors.neutral.white,
      boxShadow: disabled ? shadows.none : shadows.sm,
    },
    outline: {
      backgroundColor: "transparent",
      color: disabled ? colors.neutral.gray[400] : colors.brand.primary,
      border: `2px solid ${disabled ? colors.neutral.gray[300] : colors.brand.primary}`,
      boxShadow: shadows.none,
    },
    ghost: {
      backgroundColor: "transparent",
      color: disabled ? colors.neutral.gray[400] : colors.brand.primary,
      boxShadow: shadows.none,
    },
    danger: {
      backgroundColor: disabled ? colors.neutral.gray[300] : colors.status.error,
      color: colors.neutral.white,
      boxShadow: disabled ? shadows.none : shadows.sm,
    },
  };

  // Hover styles (applied via CSS or inline with pseudo-classes)
  const hoverStyles = disabled
    ? {}
    : variant === "primary"
    ? {
        backgroundColor: "#0066CC", // Darker blue
        boxShadow: shadows.md,
        transform: "translateY(-1px)",
      }
    : variant === "secondary"
    ? {
        backgroundColor: "#E65C3E", // Darker coral
        boxShadow: shadows.md,
        transform: "translateY(-1px)",
      }
    : variant === "accent"
    ? {
        backgroundColor: "#2198A8", // Darker teal
        boxShadow: shadows.md,
        transform: "translateY(-1px)",
      }
    : variant === "outline"
    ? {
        backgroundColor: colors.brand.primary,
        color: colors.neutral.white,
        boxShadow: shadows.sm,
      }
    : variant === "ghost"
    ? {
        backgroundColor: colors.neutral.gray[100],
        boxShadow: shadows.none,
      }
    : variant === "danger"
    ? {
        backgroundColor: "#CC2E24", // Darker red
        boxShadow: shadows.md,
        transform: "translateY(-1px)",
      }
    : {};

  const combinedStyles: React.CSSProperties = {
    ...baseStyles,
    ...sizeStyles[size],
    ...variantStyles[variant],
    opacity: disabled ? 0.6 : 1,
  };

  return (
    <button
      type={type}
      className={className}
      style={combinedStyles}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      onMouseEnter={(e) => {
        if (!disabled) {
          Object.assign(e.currentTarget.style, hoverStyles);
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          Object.assign(e.currentTarget.style, combinedStyles);
        }
      }}
    >
      {children}
    </button>
  );
};
