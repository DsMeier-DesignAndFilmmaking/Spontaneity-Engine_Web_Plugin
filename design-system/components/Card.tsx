/**
 * Travel Design System - Card Component
 * 
 * A flexible card component that demonstrates design token usage.
 * Can be customized with theme tokens for client branding.
 */

import React from "react";
import { colors } from "../tokens/colors";
import { typography } from "../tokens/typography";
import { spacing } from "../tokens/spacing";
import { shadows } from "../tokens/shadows";
import { radius, semanticRadius } from "../tokens/radius";

interface CardProps {
  children: React.ReactNode;
  variant?: "default" | "elevated" | "outlined";
  padding?: "sm" | "md" | "lg";
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = "default",
  padding = "md",
  className = "",
  style = {},
  onClick,
}) => {
  const baseStyles: React.CSSProperties = {
    backgroundColor: colors.semantic.background.primary,
    borderRadius: semanticRadius.card,
    fontFamily: typography.fontFamily.sans,
    ...style,
  };

  // Variant styles
  const variantStyles: Record<string, React.CSSProperties> = {
    default: {
      boxShadow: shadows.md,
      border: `1px solid ${colors.semantic.border.default}`,
    },
    elevated: {
      boxShadow: shadows.xl,
      border: "none",
    },
    outlined: {
      boxShadow: shadows.none,
      border: `2px solid ${colors.semantic.border.default}`,
    },
  };

  // Padding styles
  const paddingStyles: Record<string, React.CSSProperties> = {
    sm: { padding: spacing[3] },
    md: { padding: spacing[4] },
    lg: { padding: spacing[6] },
  };

  const combinedStyles: React.CSSProperties = {
    ...baseStyles,
    ...variantStyles[variant],
    ...paddingStyles[padding],
    cursor: onClick ? "pointer" : "default",
  };

  return (
    <div
      className={className}
      style={combinedStyles}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? "button" : undefined}
    >
      {children}
    </div>
  );
};

// Card Header Component
interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  className = "",
}) => {
  return (
    <div
      className={className}
      style={{
        marginBottom: spacing[4],
      }}
    >
      {children}
    </div>
  );
};

// Card Title Component
interface CardTitleProps {
  children: React.ReactNode;
  level?: 1 | 2 | 3 | 4;
  className?: string;
}

export const CardTitle: React.FC<CardTitleProps> = ({
  children,
  level = 3,
  className = "",
}) => {
  const headingStyles = typography.textStyles[`h${level}` as keyof typeof typography.textStyles];
  
  return (
    <div
      className={className}
      style={{
        ...headingStyles,
        color: colors.semantic.text.primary,
        margin: 0,
      }}
    >
      {children}
    </div>
  );
};

// Card Content Component
interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({
  children,
  className = "",
}) => {
  return (
    <div
      className={className}
      style={{
        ...typography.textStyles.body,
        color: colors.semantic.text.secondary,
      }}
    >
      {children}
    </div>
  );
};
