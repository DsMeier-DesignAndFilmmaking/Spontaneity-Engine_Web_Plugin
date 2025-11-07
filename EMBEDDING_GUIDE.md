# Spontaneity Plugin - Embedding & Customization Guide

## Overview

The Spontaneity Plugin provides embeddable React components and REST API endpoints for event discovery and management. All components are designed to be isolated, customizable, and non-intrusive when embedded in external applications.

## Visual Distinction: AI vs User Events

### Consistent Visual Indicators

**AI Events:**
- **Background Color**: Yellow tint (`bg-yellow-50`) - customizable via `aiBackgroundColor`
- **Badge**: Yellow badge with "🤖 AI Event" text - customizable via `aiBadgeText`, `aiBadgeColor`, `aiBadgeTextColor`
- **Map Marker**: Yellow markers (`#fbbf24`) on map
- **Footer Text**: "🤖 AI Generated" instead of creation date
- **Edit/Delete**: Not available (AI events are read-only)

**User Events:**
- **Background Color**: White (`bg-white`)
- **Map Marker**: Blue markers (`#3b82f6`) - customizable via `primaryColor`
- **Footer Text**: Creation date/time
- **Edit/Delete**: Available for event owners

### Visual Consistency Across Components

All components maintain visual distinction:
- `EventCard`: Yellow background + badge for AI events
- `MapView`: Yellow markers for AI events, blue for user events
- `EventFeed`: Passes `aiBadgeText` to all EventCard instances

## Embedding Components

### 1. EventFeed Component

The main feed component that displays and manages events.

```tsx
import EventFeed from '@spontaneity/plugin/components/EventFeed';

<EventFeed
  // Authentication
  defaultApiKey="your-api-key"
  defaultTenantId="tenant-1"
  
  // API Endpoint Overrides (for custom deployments)
  apiBaseUrl="https://api.yourdomain.com"
  fetchEventsEndpoint="/api/plugin/fetch-events"
  submitEventEndpoint="/api/plugin/submit-event"
  updateEventEndpoint="/api/plugin/update-event"
  deleteEventEndpoint="/api/plugin/delete-event"
  
  // Customization
  showAIEvents={true}
  enableSorting={true}
  defaultSortBy="newest"
  aiBadgeText="✨ AI Suggested"
  eventLabel="Event"
  cacheDuration={5} // minutes
  pollingInterval={30} // seconds
  
  // Callbacks
  onEventsChange={(events) => {
    console.log('Events updated:', events);
  }}
  
  // UI Controls
  showTestingControls={false} // Hide in production
/>
```

**Key Features:**
- **Incremental Updates**: After initial fetch, only fetches new events since last fetch (reduces bandwidth)
- **API Endpoint Overrides**: Allows embedding in apps with custom API deployments
- **Real-time Updates**: Polling with configurable intervals
- **Caching**: AI events cached for configurable duration (reduces API costs)

### 2. EventCard Component

Individual event display card.

```tsx
import EventCard from '@spontaneity/plugin/components/EventCard';

<EventCard
  event={event}
  aiBadgeText="🤖 AI Event"
  primaryColor="#3b82f6"
  aiBadgeColor="#fef3c7"
  aiBadgeTextColor="#92400e"
  aiBackgroundColor="#fffbeb"
  onUpdate={(updates) => {
    // Handle update
  }}
  onDelete={() => {
    // Handle delete
  }}
/>
```

### 3. EventForm Component

Form for creating/editing events.

```tsx
import EventForm from '@spontaneity/plugin/components/EventForm';

<EventForm
  onSubmit={async (data) => {
    // Submit to your API
  }}
  onCancel={() => {
    // Handle cancel
  }}
  apiBaseUrl="https://api.yourdomain.com"
  submitEventEndpoint="/api/plugin/submit-event"
  eventLabel="Event"
  primaryColor="#3b82f6"
/>
```

### 4. SpontaneityWidget (Full Widget)

Complete embeddable widget with map + feed.

```tsx
import SpontaneityWidget from '@spontaneity/plugin/components/SpontaneityWidget';

<SpontaneityWidget
  apiKey="your-api-key"
  primaryColor="#10b981"
  mapStyle="mapbox://styles/mapbox/outdoors-v12"
  buttonText="Discover Events"
  showAIEvents={true}
  enableSorting={true}
  aiBadgeText="✨ AI Suggested"
  eventLabel="Adventure"
/>
```

## REST API Integration

For non-React applications, use the REST API directly.

### Base Configuration

All endpoints support:
- **Authentication**: `apiKey` or `tenantId` query parameter or `x-api-key` header
- **Multi-tenant**: Events filtered by `tenantId`
- **Incremental Updates**: `since` query parameter (timestamp in milliseconds)

### Fetch Events (with Incremental Updates)

```http
GET /api/plugin/fetch-events?apiKey=YOUR_KEY&limit=50&location=New York&since=1704067200000
```

**Query Parameters:**
- `apiKey` or `tenantId`: Authentication
- `limit`: Maximum events (default: 50)
- `location`: Location string or coordinates "lat, lng"
- `includeAI`: Include AI events (default: true)
- `tags`: Comma-separated tags filter
- `sortBy`: "newest" or "nearest"
- `since`: Timestamp (ms) - only fetch events created after this time (incremental)
- `cacheDuration`: Override AI cache duration (minutes)

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
    },
    {
      "id": "AI-tenant-1-new-york",
      "title": "AI Generated Event",
      "source": "AI",
      "tenantId": "tenant-1",
      ...
    }
  ],
  "meta": {
    "total": 2,
    "limit": 50,
    "includeAI": true,
    "location": "New York",
    "tags": [],
    "sortBy": "newest",
    "tenantId": "tenant-1"
  }
}
```

### Incremental Updates Example

```javascript
let lastFetchTimestamp = null;

async function fetchEvents() {
  const params = new URLSearchParams({
    apiKey: 'your-key',
    limit: '50',
    location: 'New York',
  });
  
  // Add incremental update parameter
  if (lastFetchTimestamp) {
    params.set('since', lastFetchTimestamp.toString());
  }
  
  const response = await fetch(`/api/plugin/fetch-events?${params}`);
  const data = await response.json();
  
  // Update timestamp for next incremental fetch
  lastFetchTimestamp = Date.now();
  
  return data.events;
}
```

## Performance Optimizations

### 1. Caching Strategy

**AI Events:**
- Cached in-memory for configurable duration (default: 5 minutes)
- Cache key: `tenantId` + `location`
- Prevents redundant OpenAI API calls
- Cache duration configurable via `cacheDuration` prop or query parameter

**User Events:**
- Real-time Firestore updates (no caching needed)
- Incremental updates reduce bandwidth

### 2. Incremental Updates

**How It Works:**
1. Initial fetch: Full event list
2. Subsequent fetches: Only events created after `lastFetchTimestamp`
3. Frontend merges new events with existing ones (deduplicates by ID)

**Benefits:**
- Reduced bandwidth
- Faster response times
- Lower API costs

### 3. Polling Configuration

- **Default Interval**: 30 seconds
- **Configurable**: Set `pollingInterval` prop (in seconds)
- **Silent Updates**: Polling doesn't show loading indicators

## Customization Hooks

### Theme Customization

```tsx
<EventFeed
  // Color customization
  primaryColor="#10b981" // Affects buttons, markers, accents
  aiBadgeColor="#fef3c7" // AI badge background
  aiBadgeTextColor="#92400e" // AI badge text
  aiBackgroundColor="#fffbeb" // AI event card background
  
  // Map customization
  mapStyle="mapbox://styles/mapbox/outdoors-v12"
  
  // Text customization
  aiBadgeText="✨ AI Suggested"
  eventLabel="Adventure"
/>
```

### Sorting Options

```tsx
<EventFeed
  enableSorting={true}
  defaultSortBy="newest" // or "nearest"
/>
```

## Isolation & Safety

### CSS Isolation

Components use:
- Scoped class names (Tailwind CSS)
- No global CSS conflicts
- Isolated styling per component

### JavaScript Isolation

- No global variables
- No side effects on parent app
- All state managed internally

### API Isolation

- All API calls use configurable endpoints
- Can point to different domains
- Supports custom authentication

## Testing Checklist

### Visual Distinction
- [ ] AI events show yellow background
- [ ] AI events show badge
- [ ] AI events have yellow map markers
- [ ] User events show white background
- [ ] User events have blue map markers
- [ ] Edit/Delete only available for user events

### Embedding
- [ ] Components render without conflicts
- [ ] API endpoint overrides work
- [ ] Customization props apply correctly
- [ ] No CSS/JS conflicts with parent app

### Performance
- [ ] Incremental updates work (only new events fetched)
- [ ] AI events cached correctly
- [ ] Real-time updates for user events still work
- [ ] Polling doesn't cause performance issues

### Functionality
- [ ] Create events works
- [ ] Update events works (user events only)
- [ ] Delete events works (user events only)
- [ ] Sorting works (newest/nearest)
- [ ] Filtering by tags works

## Example: Full Integration

```tsx
import { EventFeed, EventCard, EventForm } from '@spontaneity/plugin';

function MyApp() {
  return (
    <div className="my-app">
      <h1>My Travel App</h1>
      
      <EventFeed
        apiBaseUrl="https://api.spontaneity.com"
        defaultApiKey="my-api-key"
        showAIEvents={true}
        enableSorting={true}
        aiBadgeText="✨ AI Suggested"
        eventLabel="Experience"
        primaryColor="#10b981"
        cacheDuration={10}
        pollingInterval={60}
        showTestingControls={false}
        onEventsChange={(events) => {
          console.log(`${events.length} events loaded`);
        }}
      />
    </div>
  );
}
```

## Support

For integration support, contact: support@spontaneity.com

