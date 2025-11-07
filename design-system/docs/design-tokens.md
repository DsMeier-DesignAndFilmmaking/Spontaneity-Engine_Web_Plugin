# Travel Design System - Design Tokens Documentation

## Overview

The Travel Design System is a customizable, travel-themed token system designed with emotional and experiential design logic for the Spontaneous Travel API Plugin. The system emphasizes **freedom, movement, calm energy, sunlight, trust, and connection** through carefully curated colors, typography, spacing, and visual effects.

### Design Philosophy

- **Emotion-Driven**: Every token is designed to evoke positive emotions associated with travel and exploration
- **Adaptability**: Easy to customize for different travel brands and client needs
- **Client Theming**: Built-in support for brand customization and white-labeling
- **Accessibility**: All tokens meet WCAG contrast requirements
- **Consistency**: 4-based spacing scale and harmonious color palette ensure visual rhythm

---

## Color Palette

### Brand Colors

| Token | Hex | Emotion/Usage |
|-------|-----|---------------|
| `brand.primary` | `#007AFF` | **Discovery Blue** - Primary actions, links, trust, navigation |
| `brand.secondary` | `#FF7A59` | **Sunset Coral** - Secondary actions, highlights, warmth |
| `brand.accent` | `#2AB7CA` | **Adventure Teal** - Accents, callouts, energy |

### Neutral Colors

| Token | Hex | Emotion/Usage |
|-------|-----|---------------|
| `neutral.white` | `#FFFFFF` | **Cloud White** - Pure backgrounds, cards |
| `neutral.black` | `#1C1C1E` | **Jet Black** - Primary text, strong contrast |
| `neutral.gray.50-900` | Various | **Soft Sand to Near Black** - Subtle hierarchy, backgrounds |

### Status Colors

| Token | Hex | Emotion/Usage |
|-------|-----|---------------|
| `status.success` | `#33D9B2` | Success states, confirmations, positive feedback |
| `status.warning` | `#FFB700` | Warnings, attention needed, caution |
| `status.error` | `#FF3B30` | Errors, destructive actions, critical alerts |
| `status.info` | `#007AFF` | Informational messages, tips |

### Travel-Specific Semantic Colors

| Token | Hex | Emotion/Usage |
|-------|-----|---------------|
| `travel.discovery` | `#007AFF` | Discovery moments, exploration |
| `travel.adventure` | `#2AB7CA` | Adventure activities, excitement |
| `travel.sunset` | `#FF7A59` | Sunset moments, warmth |
| `travel.sunrise` | `#FFB700` | Sunrise, new beginnings |
| `travel.ocean` | `#0066CC` | Ocean, depth, tranquility |
| `travel.sky` | `#87CEEB` | Sky, openness, freedom |
| `travel.sand` | `#F4F5F7` | Beach, relaxation, softness |
| `travel.earth` | `#8B6914` | Earth, grounding, nature |

---

## Typography

### Font Families

- **Sans**: `Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`
  - Primary font for body text and UI elements
  - Rounded, approachable, modern
  
- **Display**: `Outfit, Inter, -apple-system, BlinkMacSystemFont, sans-serif`
  - Used for headings and large display text
  - Friendly and readable

- **Mono**: `'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace`
  - Code, technical content, data

### Text Styles

| Style | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `display` | 3rem (48px) | 700 | 1.2 | Hero headlines, landing pages |
| `h1` | 2.25rem (36px) | 700 | 1.3 | Page titles |
| `h2` | 1.875rem (30px) | 600 | 1.35 | Section headings |
| `h3` | 1.5rem (24px) | 600 | 1.4 | Subsection headings |
| `h4` | 1.25rem (20px) | 600 | 1.45 | Card titles |
| `body` | 1rem (16px) | 400 | 1.5 | Body text |
| `bodyLarge` | 1.125rem (18px) | 400 | 1.625 | Emphasized body text |
| `caption` | 0.875rem (14px) | 400 | 1.5 | Captions, metadata |
| `small` | 0.75rem (12px) | 400 | 1.5 | Fine print, labels |
| `button` | 1rem (16px) | 600 | 1.5 | Button text |

---

## Spacing System

### Base Scale (4px unit)

The spacing system uses a 4px base unit for consistent visual rhythm:

| Token | Value | Pixels | Usage |
|-------|-------|--------|-------|
| `spacing.1` | 0.25rem | 4px | Tight spacing, icon padding |
| `spacing.2` | 0.5rem | 8px | Small gaps, compact layouts |
| `spacing.3` | 0.75rem | 12px | Default small spacing |
| `spacing.4` | 1rem | 16px | Default base spacing |
| `spacing.6` | 1.5rem | 24px | Medium spacing, card padding |
| `spacing.8` | 2rem | 32px | Large spacing, section gaps |
| `spacing.12` | 3rem | 48px | Extra large spacing |
| `spacing.16` | 4rem | 64px | Section spacing |

### Semantic Spacing

- **Component Padding**: `xs` (8px), `sm` (12px), `md` (16px), `lg` (24px), `xl` (32px)
- **Component Gap**: `xs` (4px), `sm` (8px), `md` (16px), `lg` (24px), `xl` (32px)
- **Layout**: Section (64px), Container (32px), Card (24px), Group (16px)
- **Content**: Paragraph (16px), Heading (24px), List (12px), Inline (8px)

---

## Shadows

### Elevation Levels

| Token | Value | Usage |
|-------|-------|-------|
| `shadows.none` | `none` | No elevation |
| `shadows.sm` | Subtle shadow | Small elevation, subtle depth |
| `shadows.base` | Default shadow | Standard cards, buttons |
| `shadows.md` | Medium shadow | Elevated cards, modals |
| `shadows.lg` | Large shadow | High elevation, dropdowns |
| `shadows.xl` | Extra large shadow | Maximum elevation, overlays |
| `shadows.2xl` | Maximum shadow | Dramatic elevation |

### Brand Shadows

- `shadows.brand.primary`: Colored shadow for primary brand elements
- `shadows.brand.secondary`: Colored shadow for secondary brand elements
- `shadows.brand.accent`: Colored shadow for accent brand elements

### Focus States

- `shadows.focus.default`: Focus ring for interactive elements
- `shadows.focus.error`: Focus ring for error states
- `shadows.focus.success`: Focus ring for success states

---

## Border Radius

### Base Scale

| Token | Value | Pixels | Usage |
|-------|-------|--------|-------|
| `radius.sm` | 0.25rem | 4px | Small elements |
| `radius.base` | 0.375rem | 6px | Default small radius |
| `radius.md` | 0.5rem | 8px | Buttons, inputs |
| `radius.lg` | 0.75rem | 12px | Images, medium elements |
| `radius.xl` | 1rem | 16px | Large cards |
| `radius.2xl` | 1.5rem | 24px | Cards, modals |
| `radius.3xl` | 2rem | 32px | Extra large elements |
| `radius.full` | 9999px | Full | Pills, badges, avatars |

### Semantic Radius

- `semanticRadius.button`: 8px - Standard button radius
- `semanticRadius.input`: 8px - Input field radius
- `semanticRadius.card`: 24px - Card radius for warmth
- `semanticRadius.badge`: Full - Pill-shaped badges
- `semanticRadius.avatar`: Full - Circular avatars
- `semanticRadius.modal`: 16px - Modal dialogs
- `semanticRadius.dropdown`: 12px - Dropdown menus

---

## Component Examples

### Button Component

```tsx
import { Button } from "@/design-system/components";

// Primary button
<Button variant="primary" size="md">Discover Events</Button>

// Secondary button
<Button variant="secondary" size="lg">Explore</Button>

// Outline button
<Button variant="outline" size="sm">Learn More</Button>
```

### Card Component

```tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/design-system/components";

<Card variant="elevated" padding="lg">
  <CardHeader>
    <CardTitle level={3}>Adventure Awaits</CardTitle>
  </CardHeader>
  <CardContent>
    Discover spontaneous events near you!
  </CardContent>
</Card>
```

---

## Extending and Overriding Tokens

### Method 1: Direct Override

```tsx
import { colors } from "@/design-system/tokens";

const customColors = {
  ...colors,
  brand: {
    ...colors.brand,
    primary: "#005C99", // Deeper blue
  },
};
```

### Method 2: Using Theme System

```tsx
import { createClientTheme } from "@/design-system/tokens/themes/clientThemeExample";

const myTheme = createClientTheme({
  colors: {
    brand: {
      primary: "#005C99",
      accent: "#FFC04D",
    },
  },
  typography: {
    fontFamily: {
      sans: "'Playfair Display', serif",
    },
  },
});
```

### Method 3: CSS Custom Properties

```css
:root {
  --color-brand-primary: #007AFF;
  --color-brand-secondary: #FF7A59;
  --color-brand-accent: #2AB7CA;
}
```

---

## Integration with Existing Components

To integrate tokens into existing components (like `EventCard`):

1. Import tokens:
```tsx
import { colors, typography, spacing, shadows, radius } from "@/design-system/tokens";
```

2. Replace hardcoded values:
```tsx
// Before
style={{ color: "#3b82f6" }}

// After
style={{ color: colors.brand.primary }}
```

3. Use semantic tokens for consistency:
```tsx
// Use semantic colors
backgroundColor: colors.semantic.background.primary
color: colors.semantic.text.primary
```

---

## Next Steps

1. **Integrate tokens into existing components**: Update `EventCard`, `EventFeed`, `Navbar`, etc.
2. **Create theme provider**: React Context for theme switching
3. **Build token utilities**: Helper functions for common patterns
4. **Document component API**: Full API documentation for all components
5. **Figma integration**: Export tokens to Figma for design handoff

---

## Resources

- [Design Tokens Community Group](https://www.designtokens.org/)
- [Style Dictionary](https://amzn.github.io/style-dictionary/) - Token transformation tool
- [Figma Tokens](https://www.figma.com/community/plugin/843461159747178946/Figma-Tokens) - Figma plugin for tokens
