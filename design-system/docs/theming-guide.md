# Travel Design System - Theming Guide

## Overview

This guide explains how partners and clients can customize the Travel Design System to match their brand identity while maintaining the emotional design principles of spontaneous travel: **curiosity, belonging, anticipation, and lightness**.

---

## Theming Philosophy

The design system is built with customization in mind. Every token can be overridden, allowing clients to:

- Maintain their brand identity
- Create white-label experiences
- Adapt to different travel niches (luxury, adventure, budget, etc.)
- Preserve accessibility and usability standards

---

## Methods for Injecting Custom Tokens

### Method 1: JavaScript/TypeScript Theme Object

Create a custom theme file that extends the default theme:

```typescript
// themes/myBrandTheme.ts
import { createClientTheme } from "@/design-system/tokens/themes/clientThemeExample";

export const myBrandTheme = createClientTheme({
  colors: {
    brand: {
      primary: "#005C99", // Your brand's primary color
      secondary: "#C08457", // Your brand's secondary color
      accent: "#FFC04D", // Your brand's accent color
    },
  },
  typography: {
    fontFamily: {
      sans: "'Your Brand Font', Inter, sans-serif",
      display: "'Your Display Font', serif",
    },
  },
});
```

### Method 2: JSON Configuration

For API-driven theming, use JSON:

```json
{
  "theme": {
    "name": "Adventure Travel Co.",
    "colors": {
      "brand": {
        "primary": "#00A8E8",
        "secondary": "#FF6B35",
        "accent": "#00D9FF"
      }
    },
    "typography": {
      "fontFamily": {
        "sans": "'Nunito', Inter, sans-serif"
      }
    }
  }
}
```

Then load it in your application:

```typescript
// Load theme from API or config file
const themeConfig = await fetch('/api/theme').then(r => r.json());
const customTheme = createClientTheme(themeConfig.theme);
```

### Method 3: CSS Custom Properties

For runtime theming without JavaScript rebuilds:

```css
/* themes/my-brand.css */
:root[data-theme="my-brand"] {
  --color-brand-primary: #005C99;
  --color-brand-secondary: #C08457;
  --color-brand-accent: #FFC04D;
  
  --font-family-sans: 'Playfair Display', serif;
  --font-family-display: 'Playfair Display', serif;
  
  --spacing-base: 1rem;
  --radius-button: 0.5rem;
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
```

Apply the theme:

```html
<html data-theme="my-brand">
  <!-- Your app content -->
</html>
```

### Method 4: API-Level Overrides

For plugin-based implementations, pass theme tokens via API:

```typescript
// API request with theme override
POST /api/plugin/generate-event
{
  "eventData": { ... },
  "theme": {
    "colors": {
      "brand": {
        "primary": "#005C99"
      }
    }
  }
}
```

The plugin can then inject these tokens into the generated UI:

```typescript
// In your plugin endpoint
const theme = request.body.theme || defaultTheme;
const html = renderEventCard(event, theme);
```

---

## Figma Integration (Future)

### Exporting Tokens to Figma

1. **Install Figma Tokens Plugin**: Install the "Figma Tokens" plugin from the Figma Community

2. **Convert Tokens to Figma Format**:

```typescript
// scripts/export-figma-tokens.ts
import { colors, typography, spacing, shadows, radius } from "../design-system/tokens";

export const figmaTokens = {
  color: {
    "brand/primary": {
      value: colors.brand.primary,
      type: "color",
    },
    "brand/secondary": {
      value: colors.brand.secondary,
      type: "color",
    },
    // ... more colors
  },
  typography: {
    "heading/h1": {
      value: {
        fontFamily: typography.fontFamily.sans,
        fontSize: typography.textStyles.h1.fontSize,
        fontWeight: typography.textStyles.h1.fontWeight,
        lineHeight: typography.textStyles.h1.lineHeight,
      },
      type: "typography",
    },
    // ... more typography tokens
  },
  spacing: {
    "base/4": {
      value: spacing[4],
      type: "spacing",
    },
    // ... more spacing tokens
  },
};

// Export as JSON
fs.writeFileSync("figma-tokens.json", JSON.stringify(figmaTokens, null, 2));
```

3. **Import to Figma**:
   - Open Figma Tokens plugin
   - Import the generated JSON file
   - Apply tokens to your design system components

### Syncing from Figma to Code

Use Style Dictionary or a similar tool to transform Figma tokens back to code:

```bash
npm install style-dictionary
```

```json
// style-dictionary.config.json
{
  "source": ["tokens/figma-imported/**/*.json"],
  "platforms": {
    "css": {
      "transformGroup": "css",
      "buildPath": "styles/",
      "files": [{
        "destination": "tokens.css",
        "format": "css/variables"
      }]
    },
    "typescript": {
      "transformGroup": "js",
      "buildPath": "design-system/tokens/generated/",
      "files": [{
        "destination": "tokens.ts",
        "format": "typescript/es6-declarations"
      }]
    }
  }
}
```

---

## Emotional Design Alignment

### Curiosity

- **Colors**: Use discovery blue (`#007AFF`) for interactive elements that invite exploration
- **Typography**: Rounded, friendly fonts (Inter, Nunito) reduce friction
- **Spacing**: Generous spacing creates breathing room for exploration

### Belonging

- **Colors**: Warm accents (sunset coral, sunrise amber) create welcoming environments
- **Shadows**: Soft, natural shadows create depth without intimidation
- **Radius**: Rounded corners (24px cards) feel approachable and friendly

### Anticipation

- **Colors**: Adventure teal (`#2AB7CA`) for call-to-action elements
- **Shadows**: Elevated shadows on interactive elements hint at interactivity
- **Typography**: Bold headings build excitement

### Lightness

- **Colors**: Light backgrounds (cloud white, soft sand) create airy, uncluttered spaces
- **Spacing**: Generous spacing prevents visual weight
- **Shadows**: Subtle shadows maintain lightness while adding depth

---

## Theme Customization Examples

### Example 1: Luxury Travel Brand

```typescript
const luxuryTheme = createClientTheme({
  colors: {
    brand: {
      primary: "#005C99", // Deeper, more sophisticated blue
      secondary: "#C08457", // Warm bronze instead of coral
      accent: "#FFC04D", // Gold for premium feel
    },
  },
  typography: {
    fontFamily: {
      sans: "'Playfair Display', Georgia, serif",
      display: "'Playfair Display', Georgia, serif",
    },
  },
  shadows: {
    brand: {
      primary: "0 4px 14px 0 rgba(0, 92, 153, 0.2)", // Deeper shadows
    },
  },
});
```

### Example 2: Adventure Travel Company

```typescript
const adventureTheme = createClientTheme({
  colors: {
    brand: {
      primary: "#00A8E8", // Bright sky blue
      secondary: "#FF6B35", // Vibrant orange
      accent: "#00D9FF", // Electric cyan
    },
  },
  typography: {
    fontFamily: {
      sans: "'Nunito', Inter, sans-serif", // More rounded, friendly
    },
  },
  radius: {
    card: "1rem", // Slightly less rounded for more edge
  },
});
```

### Example 3: Budget Travel Platform

```typescript
const budgetTheme = createClientTheme({
  colors: {
    brand: {
      primary: "#007AFF", // Keep discovery blue for trust
      secondary: "#33D9B2", // Success green for value
      accent: "#FFB700", // Warning amber for deals
    },
  },
  spacing: {
    // Tighter spacing for more content density
    card: "1rem", // 16px instead of 24px
  },
});
```

---

## Best Practices

### 1. Maintain Contrast Ratios

Always ensure text meets WCAG AA contrast requirements:
- Normal text: 4.5:1 contrast ratio
- Large text: 3:1 contrast ratio

Use tools like [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) to validate.

### 2. Test Across Devices

Test your custom theme on:
- Mobile devices (small screens)
- Tablets (medium screens)
- Desktop (large screens)
- Different operating systems (iOS, Android, Windows, macOS)

### 3. Preserve Semantic Meaning

Don't override status colors in ways that break meaning:
- Success should remain green-like
- Error should remain red-like
- Warning should remain yellow/amber-like

### 4. Document Your Customizations

Create a `THEME.md` file documenting your customizations:

```markdown
# My Brand Theme

## Customizations
- Primary color: #005C99 (deeper blue for luxury feel)
- Font: Playfair Display (serif for premium branding)
- Card radius: 16px (slightly less rounded)

## Rationale
- Deeper blue conveys trust and sophistication
- Serif font adds premium feel
- Reduced radius maintains elegance
```

---

## Integration Checklist

- [ ] Define your brand colors
- [ ] Choose appropriate typography
- [ ] Test contrast ratios
- [ ] Create theme file using `createClientTheme`
- [ ] Apply theme to your application
- [ ] Test on multiple devices
- [ ] Document customizations
- [ ] Export tokens to Figma (if using design tools)
- [ ] Update API endpoints to accept theme overrides (if needed)

---

## Support

For questions or issues with theming:
1. Review the [Design Tokens Documentation](./design-tokens.md)
2. Check the [System Map](./system-map.mmd) for architecture
3. Review example themes in `design-system/tokens/themes/clientThemeExample.ts`

---

## Future Enhancements

- [ ] Theme builder UI for non-technical users
- [ ] Real-time theme preview
- [ ] Theme marketplace (shareable themes)
- [ ] Automatic contrast validation
- [ ] Dark mode theme support
- [ ] Accessibility audit tool
