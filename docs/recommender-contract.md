# Recommender Integration Contract

This document defines how user preferences from the settings UI feed into the recommendation engine.

## Request Payload

Clients must include the user's id and the relevant subset of preferences when calling the recommender API.

```jsonc
{
  "userId": "user-123",
  "preferences": {
    "spontaneity": "high",
    "radiusKm": 5,
    "transportPreference": "walking",
    "safetyMode": "standard",
    "timeAvailability": { "from": "now", "to": "2025-11-07T22:00:00Z" },
    "aiPersona": "adventurous"
  }
}
```

- `spontaneity`: one of `low | medium | high`
- `timeAvailability`: allow literal `"now"` or an ISO 8601 window.
- Additional fields (e.g. `locationSharing`, `autoJoin`) may be provided; the recommender should ignore unknown keys but must respect the contract below.

## Recommender Responsibilities

1. **Match Strictness**
   - When `preferences.matchStrictness === "strict"`, treat user interests as a *hard filter*. Candidates lacking required tags/attributes must be excluded.

2. **Spontaneity Weighting**
   - Increase exploration and reduce popularity bias when `spontaneity === "high"`.
   - Implementation guidance: apply a multiplier (e.g., `popularityWeight *= 0.6`) before scoring.

3. **Geofence Filtering**
   - Combine radius + location sharing to compute allowable area: if sharing is `off`, use coarse home area; if `nearby` or `live`, leverage real-time location.
   - Ensure venue coordinates fall inside the geofence before returning results.

4. **Auto-Join Flag**
   - If `preferences.autoJoin === true`, include `autoJoinCandidate: true` in the recommendation response item so clients can auto-RSVP.

## Testing Requirements

Unit tests for the recommender should cover:

- Strict match mode excludes non-matching events.
- High spontaneity reduces popularity score contribution.
- Geofence filters out events beyond radius or outside sharing context.
- Auto-join preference triggers `autoJoinCandidate` in the outbound payload.
