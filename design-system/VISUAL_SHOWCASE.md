# Visual Design System Showcase

## 🎨 View the Design System

To visually explore all the design tokens and components:

1. **Start the development server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Navigate to the showcase page**:
   ```
   http://localhost:3000/design-system
   ```

## 📋 What You'll See

The showcase page displays:

### Colors
- **Brand Colors**: Discovery Blue, Sunset Coral, Adventure Teal
- **Neutral Colors**: Complete gray scale (50-900) plus white and black
- **Status Colors**: Success, Warning, Error, Info
- **Travel Semantic Colors**: All 8 travel-themed colors

### Typography
- **Font Families**: Sans, Display, and Mono examples
- **Text Styles**: All 11 text style presets (display, h1-h4, body, caption, etc.)

### Spacing
- **Base Scale**: Visual representation of all spacing values (4px-based scale)
- Interactive swatches showing actual pixel values

### Shadows
- **Elevation Levels**: 7 shadow levels from none to 2xl
- **Brand Shadows**: Colored shadows for brand elements
- Visual examples with colored boxes

### Border Radius
- **Base Scale**: All radius values from sm to full
- Visual circles showing each radius size

### Components
- **Button Variants**: All 6 button variants (primary, secondary, accent, outline, ghost, danger)
- **Button Sizes**: Small, medium, and large sizes
- **Card Variants**: Default, elevated, and outlined card styles

## 🎯 Features

- **Interactive**: All components are live and functional
- **Color Swatches**: Click to see hex values and token names
- **Responsive**: Works on all screen sizes
- **Real Tokens**: Uses actual design system tokens (not hardcoded values)

## 🔗 Quick Navigation

You can also add a link to your navbar:

```tsx
// In app/components/Navbar.tsx
<a href="/design-system">Design System</a>
```

## 📱 Mobile View

The showcase is fully responsive and adapts to mobile screens with:
- Grid layouts that stack on smaller screens
- Touch-friendly component sizes
- Readable typography at all sizes

---

**Enjoy exploring your design system!** 🚀
