# Security & Privacy Guide

## Overview

This guide documents the security measures, privacy compliance, and monetization features implemented in the Spontaneity Plugin/API.

## API Key Protection

### Server-Side Only

All sensitive API keys are stored server-side and never exposed to the frontend:

- **OpenAI Key**: `OPENAI_KEY` or `OPENAI_API_KEY` in `.env.local`
  - Only used in server-side API routes (`app/api/**`)
  - Never exposed in client components
  - All AI generation happens server-side

- **Mapbox Key**: `MAPBOX_KEY` in `.env.local` (server-side) or `NEXT_PUBLIC_MAPBOX_KEY` (public)
  - Mapbox public keys are safe to expose (designed for client-side use)
  - For geocoding, we use a server-side proxy (`/api/geocode`) to protect the key
  - Map rendering uses `NEXT_PUBLIC_MAPBOX_KEY` (this is acceptable per Mapbox security)

### Environment Variables

```bash
# .env.local (server-side only, never committed)
OPENAI_KEY=sk-...
OPENAI_API_KEY=sk-...  # Alternative name
MAPBOX_KEY=pk.eyJ...   # For server-side geocoding

# .env.local (public, safe to expose)
NEXT_PUBLIC_MAPBOX_KEY=pk.eyJ...  # For client-side map rendering
```

## Per-Tenant API Key Validation

### API Key Structure

Each tenant has a unique API key that:
- Identifies the tenant
- Enables multi-tenant data isolation
- Tracks usage for billing/rate limiting

### Validation Flow

1. **Client sends API key** in query parameter or header:
   ```http
   GET /api/plugin/fetch-events?apiKey=tenant-api-key-123
   ```

2. **Server validates** (server-side only):
   ```typescript
   const tenantId = getTenantId(apiKey);
   if (!tenantId) {
     return 401 Unauthorized;
   }
   ```

3. **All operations filtered by tenantId**:
   - Firestore queries filter by `tenantId`
   - AI events tagged with `tenantId`
   - Rate limits tracked per `tenantId`

### API Key Management

Currently using in-memory registry (for production, use Firestore):

```typescript
// app/services/tenant.ts
const TENANT_REGISTRY = new Map([
  ["demo-key-1", { tenantId: "tenant-1", name: "Demo Tenant 1", enabled: true }],
  ["demo-key-2", { tenantId: "tenant-2", name: "Demo Tenant 2", enabled: true }],
]);
```

**Production Recommendation**: Store in Firestore with:
- API key (hashed)
- Tenant ID
- Enabled status
- Rate limit configuration
- Billing plan

## GDPR / Privacy Compliance

### Consent Management

All user-generated events require explicit consent:

1. **Consent Checkbox** in EventForm:
   ```tsx
   <input
     type="checkbox"
     id="consent"
     checked={consentGiven}
     onChange={(e) => setConsentGiven(e.target.checked)}
     required
   />
   <label>
     I consent to the processing of my data for event creation and sharing.
   </label>
   ```

2. **Consent Flag** stored in Firestore:
   ```typescript
   {
     title: "Event Title",
     createdBy: "user-uid",
     consentGiven: true,  // Required for GDPR
     ...
   }
   ```

3. **Server-side Validation**:
   ```typescript
   if (eventData.consentGiven === false) {
     return 400 Bad Request; // Consent required
   }
   ```

### User ID Anonymization

For external tenant access, user IDs can be anonymized:

```typescript
// Anonymize user ID (hash-based, one-way)
function anonymizeUserId(userId: string): string {
  // Returns: "anon-abc123" (non-reversible)
}
```

**Usage**: When serving events to external tenants, anonymize `createdBy` to prevent user tracking.

### Data Minimization

- Only store necessary data (title, description, location, tags)
- No PII (personally identifiable information) stored
- User IDs are Firebase UIDs (not email addresses)
- Location data is coordinates only (no addresses)

## Rate Limiting & Abuse Prevention

### Rate Limit Types

1. **AI Events Per Minute**: Limits AI event generation (cost control)
2. **Requests Per Minute**: General API request limit
3. **Requests Per Hour**: Long-term usage limit

### Configuration

```typescript
// Per-tenant rate limits
const TENANT_RATE_LIMITS = {
  "tenant-1": {
    aiEventsPerMinute: 50,
    requestsPerMinute: 100,
    requestsPerHour: 1000,
  },
  "tenant-2": {
    aiEventsPerMinute: 100,
    requestsPerMinute: 200,
    requestsPerHour: 2000,
  },
};
```

### Implementation

```typescript
// Check rate limit before processing
const rateLimitCheck = checkRateLimit(tenantId, "aiEvents");
if (!rateLimitCheck.allowed) {
  return 429 Too Many Requests;
}
```

### Rate Limit Headers

API responses include rate limit headers:

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 50
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1704067200000
```

When limit exceeded:

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 50
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1704067200000
Retry-After: 30
```

### Error Response

```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Limit: 50 per minute. Reset at: 2024-01-01T00:01:00Z",
  "rateLimit": {
    "remaining": 0,
    "resetAt": 1704067260000,
    "limit": 50
  }
}
```

## Security Validation Checklist

### ✅ API Key Protection

- [x] OpenAI key only in server-side code
- [x] Mapbox key proxied via `/api/geocode` for geocoding
- [x] No API keys in client-side code
- [x] Environment variables properly scoped

### ✅ API Key Validation

- [x] All `/api/plugin/*` routes require valid API key
- [x] Validation happens server-side before any operations
- [x] Invalid keys return 401 Unauthorized
- [x] Tenant isolation enforced (events filtered by `tenantId`)

### ✅ GDPR Compliance

- [x] Consent checkbox in EventForm
- [x] Consent flag stored in Firestore
- [x] Server-side consent validation
- [x] User ID anonymization available
- [x] No PII stored in events

### ✅ Rate Limiting

- [x] Rate limits per tenant/API key
- [x] AI event generation rate limited
- [x] General request rate limited
- [x] Informative error messages
- [x] Rate limit headers in responses

### ✅ Data Isolation

- [x] Events filtered by `tenantId` in all queries
- [x] AI events tagged with `tenantId`
- [x] User ownership validation for updates/deletes
- [x] No cross-tenant data leakage

## Testing Security

### Test API Key Protection

```bash
# Should fail: No API key
curl http://localhost:3000/api/plugin/fetch-events

# Should fail: Invalid API key
curl "http://localhost:3000/api/plugin/fetch-events?apiKey=invalid-key"

# Should succeed: Valid API key
curl "http://localhost:3000/api/plugin/fetch-events?apiKey=demo-key-1"
```

### Test Rate Limiting

```bash
# Make 101 requests (limit is 100/minute)
for i in {1..101}; do
  curl "http://localhost:3000/api/plugin/fetch-events?apiKey=demo-key-1"
done
# Should return 429 after 100 requests
```

### Test GDPR Consent

```bash
# Should fail: No consent
curl -X POST http://localhost:3000/api/plugin/submit-event \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"demo-key-1","userId":"user-123","title":"Test","consentGiven":false}'

# Should succeed: Consent given
curl -X POST http://localhost:3000/api/plugin/submit-event \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"demo-key-1","userId":"user-123","title":"Test","consentGiven":true}'
```

## Production Recommendations

1. **API Key Storage**: Move tenant registry to Firestore
2. **Rate Limiting**: Use Redis for distributed rate limiting
3. **Monitoring**: Add logging/analytics for security events
4. **Audit Logs**: Track all API key usage and access
5. **Key Rotation**: Implement API key rotation mechanism
6. **Encryption**: Encrypt sensitive data at rest
7. **HTTPS Only**: Enforce HTTPS in production
8. **CORS**: Configure CORS for allowed origins
9. **Input Validation**: Sanitize all user inputs
10. **SQL Injection Prevention**: Use parameterized queries (Firestore handles this)

## Support

For security concerns, contact: security@spontaneity.com

