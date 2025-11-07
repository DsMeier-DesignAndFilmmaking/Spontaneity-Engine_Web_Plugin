# Spontaneity Widget - Integration Guide

## Overview

The Spontaneity Widget is a lightweight, embeddable React component that provides AI-powered event discovery with real-time updates, customizable theming, and multi-tenant support.

## Quick Start

### React Integration

```tsx
import SpontaneityWidget from '@spontaneity/widget';

function MyApp() {
  return (
    <SpontaneityWidget
      apiKey="your-api-key"
      buttonText="Discover Events"
      primaryColor="#3b82f6"
    />
  );
}
```

### Configuration Options

#### Authentication
- `apiKey` (string, optional): API key for tenant authentication
- `tenantId` (string, optional): Direct tenant ID (alternative to API key)

#### UI Customization
- `buttonText` (string, default: "Discover Events"): Text on the embeddable button
- `buttonStyle` (CSSProperties, optional): Custom CSS styles for the button
- `className` (string, optional): Additional CSS classes

#### Theme Customization
- `primaryColor` (string, default: "#3b82f6"): Primary brand color (affects button, markers, UI accents)
- `mapStyle` (string, default: "mapbox://styles/mapbox/streets-v12"): Mapbox style URL

#### Feature Toggles
- `showAIEvents` (boolean, default: true): Include AI-generated events
- `enableSorting` (boolean, default: true): Enable sorting options (newest/nearest)
- `defaultSortBy` ("newest" | "nearest", default: "newest"): Default sort order

#### Text Customization
- `aiBadgeText` (string, default: "🤖 AI Event"): Badge text for AI events
- `eventLabel` (string, default: "Hang Out"): Label for events throughout UI

#### Performance
- `cacheDuration` (number, default: 5): AI event cache duration in minutes
- `pollingInterval` (number, default: 30): Event feed polling interval in seconds

## REST API Integration

For non-React applications, use the REST API directly:

### Base URL
```
https://your-domain.com/api/plugin
```

### Endpoints

#### Fetch Events
```http
GET /api/plugin/fetch-events?apiKey=YOUR_KEY&limit=50&location=New York&includeAI=true&sortBy=newest
```

**Query Parameters:**
- `apiKey` or `tenantId`: Authentication
- `limit` (number, default: 50): Maximum events to return
- `location` (string): Location string or coordinates "lat, lng"
- `includeAI` (boolean, default: true): Include AI-generated events
- `tags` (string, comma-separated): Filter by tags
- `sortBy` ("newest" | "nearest"): Sort order
- `cacheDuration` (number, minutes): Override default cache duration

**Response:**
```json
{
  "events": [
    {
      "id": "event-123",
      "title": "Street Food Market",
      "description": "Local food vendors",
      "tags": ["food", "outdoor"],
      "location": { "lat": 40.7128, "lng": -74.0060 },
      "createdBy": "user-uid",
      "source": "User",
      "tenantId": "tenant-1",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "total": 1,
    "limit": 50,
    "includeAI": true,
    "location": "New York",
    "tags": [],
    "sortBy": "newest",
    "tenantId": "tenant-1"
  }
}
```

#### Submit Event
```http
POST /api/plugin/submit-event
Content-Type: application/json
{
  "apiKey": "your-key",
  "userId": "user-uid",
  "title": "Event Title",
  "description": "Event Description",
  "tags": ["tag1", "tag2"],
  "location": { "lat": 40.7128, "lng": -74.0060 }
}
```

#### Update Event
```http
PATCH /api/plugin/update-event
Content-Type: application/json
{
  "apiKey": "your-key",
  "eventId": "event-123",
  "userId": "user-uid",
  "updates": {
    "title": "Updated Title",
    "description": "Updated Description"
  }
}
```

#### Delete Event
```http
DELETE /api/plugin/delete-event?apiKey=YOUR_KEY&eventId=event-123&userId=user-uid
```

## Performance Optimization

### Caching Strategy

AI-generated events are cached to reduce OpenAI API costs:

- **Default Cache Duration**: 5 minutes
- **Cache Key**: Based on `tenantId` + `location`
- **Incremental Updates**: Cached events are reused until expiration
- **Custom Cache Duration**: Override via `cacheDuration` parameter

### Polling Strategy

- **Default Interval**: 30 seconds
- **Configurable**: Set `pollingInterval` prop (in seconds)
- **Silent Updates**: Polling doesn't show loading indicators

## Multi-Tenant Support

Each tenant can have:
- Custom AI prompt templates
- Custom branding (colors, map styles)
- Isolated event data (filtered by `tenantId`)
- Custom badge text and labels

## Examples

### Basic Integration
```tsx
<SpontaneityWidget apiKey="demo-key-1" />
```

### Custom Themed Widget
```tsx
<SpontaneityWidget
  apiKey="demo-key-1"
  primaryColor="#10b981"
  mapStyle="mapbox://styles/mapbox/outdoors-v12"
  buttonText="Explore Local Events"
  aiBadgeText="✨ AI Suggested"
  eventLabel="Adventure"
/>
```

### Performance-Tuned Widget
```tsx
<SpontaneityWidget
  apiKey="demo-key-1"
  cacheDuration={10} // 10 minute cache
  pollingInterval={60} // 1 minute polling
  showAIEvents={true}
  enableSorting={true}
  defaultSortBy="nearest"
/>
```

### Vanilla JavaScript (REST API)
```javascript
async function fetchEvents(apiKey, location) {
  const response = await fetch(
    `https://your-domain.com/api/plugin/fetch-events?apiKey=${apiKey}&location=${location}&limit=20`
  );
  const data = await response.json();
  return data.events;
}
```

## Security

- API keys are validated server-side
- All CRUD operations require authentication
- Events are filtered by `tenantId` to ensure data isolation
- User ownership is enforced for update/delete operations

## Support

For integration support, contact: support@spontaneity.com

