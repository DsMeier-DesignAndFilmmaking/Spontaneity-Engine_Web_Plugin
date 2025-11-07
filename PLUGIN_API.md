# Plugin API Documentation

This document describes the plugin/API architecture for the Travel AI Platform.

## Architecture Overview

The application is structured with a clear separation between:
- **Services Layer** (`app/services/`) - Core business logic
- **API Routes** (`app/api/plugin/`) - HTTP endpoints
- **UI Components** - Consume API routes only

## Services

### `app/services/events.ts`

Firestore CRUD operations for events:

- `fetchEvents(options)` - Fetch events with filtering
- `submitEvent(options)` - Create new event
- `updateEvent(options)` - Update existing event
- `deleteEvent(options)` - Delete event

### `app/services/ai.ts`

OpenAI event generation:

- `generateEvent(options)` - Generate AI-powered travel event

## API Endpoints

All endpoints are under `/api/plugin/` namespace.

### GET `/api/plugin/fetch-events`

Fetch events (user-generated + optional AI-generated).

**Query Parameters:**
- `limit` (number, optional) - Maximum number of events (default: 100)
- `includeAI` (boolean, optional) - Include AI-generated events (default: true)
- `location` (string, optional) - Location context for AI generation
- `tenantId` (string, optional) - Filter by tenant ID
- `createdBy` (string, optional) - Filter by creator user ID
- `apiKey` (string, optional) - API key for multi-tenant access

**Response:**
```json
[
  {
    "id": "event-id",
    "title": "Event Title",
    "description": "Event description",
    "tags": ["tag1", "tag2"],
    "location": { "lat": 40.7128, "lng": -74.0060 },
    "createdAt": "2024-01-01T00:00:00Z",
    "createdBy": "user-id"
  }
]
```

### POST `/api/plugin/submit-event`

Create a new event.

**Request Body:**
```json
{
  "title": "Event Title",
  "description": "Event description",
  "tags": ["tag1", "tag2"],
  "location": { "lat": 40.7128, "lng": -74.0060 },
  "userId": "user-id",
  "tenantId": "tenant-id (optional)",
  "apiKey": "api-key (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Event submitted successfully",
  "id": "event-id"
}
```

### PATCH `/api/plugin/update-event`

Update an existing event.

**Request Body:**
```json
{
  "eventId": "event-id",
  "updates": {
    "title": "Updated Title",
    "description": "Updated description"
  },
  "userId": "user-id",
  "tenantId": "tenant-id (optional)",
  "apiKey": "api-key (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Event updated successfully"
}
```

### DELETE `/api/plugin/delete-event`

Delete an event.

**Query Parameters:**
- `eventId` (string, required)
- `userId` (string, required)
- `tenantId` (string, optional)
- `apiKey` (string, optional)

**Response:**
```json
{
  "success": true,
  "message": "Event deleted successfully"
}
```

### POST `/api/plugin/generate-event`

Generate an AI-powered travel event.

**Request Body:**
```json
{
  "location": "New York (optional)",
  "context": "Additional context (optional)",
  "apiKey": "api-key (optional)"
}
```

**Response:**
```json
{
  "id": "AI-timestamp-random",
  "title": "Event Title",
  "description": "Event description",
  "tags": ["tag1", "tag2"],
  "location": { "lat": 40.7128, "lng": -74.0060 },
  "createdAt": "2024-01-01T00:00:00Z",
  "createdBy": "ai"
}
```

## Multi-Tenant Support

The API supports multi-tenant architecture through:

1. **Tenant ID** - Direct tenant filtering
2. **API Key** - Extract tenant from API key (placeholder for future implementation)

To implement API key validation:
- Update `extractTenantFromApiKey()` functions in plugin routes
- Add API key validation service
- Store tenant mappings in database

## Error Handling

All endpoints return consistent error format:

```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

HTTP Status Codes:
- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing authentication)
- `403` - Forbidden (ownership/permission issues)
- `404` - Not Found
- `500` - Internal Server Error

## Usage Examples

### Frontend Component

```typescript
// Fetch events
const response = await fetch("/api/plugin/fetch-events?includeAI=true&limit=50");
const events = await response.json();

// Submit event
await fetch("/api/plugin/submit-event", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title: "My Event",
    description: "Description",
    tags: [],
    location: { lat: 40.7128, lng: -74.0060 },
    userId: user.uid,
  }),
});
```

### External API Integration

```bash
# Fetch events with API key
curl -X GET "https://your-domain.com/api/plugin/fetch-events?includeAI=true&apiKey=your-api-key"

# Submit event
curl -X POST "https://your-domain.com/api/plugin/submit-event" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Event Title",
    "description": "Description",
    "tags": [],
    "location": {"lat": 40.7128, "lng": -74.0060},
    "userId": "user-id",
    "apiKey": "your-api-key"
  }'
```

