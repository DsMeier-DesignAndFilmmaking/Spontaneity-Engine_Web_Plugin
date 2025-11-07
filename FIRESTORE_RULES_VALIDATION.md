# Firestore Security Rules Validation

## Testing Your Security Rules

I've created a test endpoint at `/api/test-firestore` to help validate your Firestore security rules.

## Quick Test

### Test 1: Read Access
Open your browser console and run:
```javascript
fetch('/api/test-firestore')
  .then(r => r.json())
  .then(console.log);
```

### Test 2: Write Access
```javascript
fetch('/api/test-firestore', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ testData: true })
})
  .then(r => r.json())
  .then(console.log);
```

## Rule Set Analysis

### Rule Set 1: Authenticated Users Only
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /events/{eventId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Expected Behavior:**
- ✅ **Works for:** Client-side Firestore operations with Firebase Auth
- ❌ **May fail for:** Server-side API routes (your current setup)
- **Reason:** Server-side Firestore operations don't automatically have `request.auth` context

**Test Result Prediction:**
- If you see `permission-denied` errors → Rules are blocking server-side operations
- If it works → Rules are allowing operations (or you're using Admin SDK)

### Rule Set 2: Open Access (Development)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**Expected Behavior:**
- ✅ **Works for:** All operations (client and server-side)
- ✅ **Best for:** Development and testing
- ⚠️ **NOT SECURE:** Never use in production

**Test Result Prediction:**
- Should always work (unless Firestore is not configured)

## Current Implementation Issue

Your app uses **server-side API routes** for Firestore operations:

1. Client sends request to `/api/plugin/submit-event`
2. Server-side code writes to Firestore
3. Firestore security rules check `request.auth`
4. **Problem:** Server-side operations may not have `request.auth` set

## Solutions

### Option 1: Use Open Rules (Development)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```
**Pros:** Simple, works immediately  
**Cons:** No security (development only)

### Option 2: Use Firebase Admin SDK (Production)
- Install: `npm install firebase-admin`
- Admin SDK bypasses security rules
- Use for all server-side operations
- Keep client SDK for client-side operations

### Option 3: Pass Auth Token to Server
- Client gets Firebase Auth token: `user.getIdToken()`
- Send token in API request headers
- Server validates token before Firestore operations
- More complex but maintains security

## Recommended Approach

**For Now (Development):**
1. Use open rules (Rule Set 2) to test functionality
2. Verify events can be created
3. Once working, implement proper security

**For Production:**
1. Use Firebase Admin SDK for server-side operations
2. Or implement auth token passing
3. Use tenant-based rules for multi-tenant isolation

## Test Endpoint Usage

Visit these URLs in your browser or use curl:

```bash
# Test read
curl http://localhost:3000/api/test-firestore

# Test write
curl -X POST http://localhost:3000/api/test-firestore \
  -H "Content-Type: application/json" \
  -d '{"testData": true}'
```

## Expected Results

### With Open Rules (if true)
```json
{
  "success": true,
  "message": "Firestore connection successful",
  "tests": {
    "databaseInitialized": true,
    "canReadCollection": true,
    "eventCount": 0
  }
}
```

### With Authenticated Rules (request.auth != null)
```json
{
  "success": false,
  "error": "Failed to read from Firestore",
  "code": "permission-denied",
  "message": "..."
}
```

## Next Steps

1. **Update Firestore Rules** in Firebase Console with Rule Set 2 (open rules)
2. **Test the endpoint:** Visit `http://localhost:3000/api/test-firestore`
3. **Try creating an event** in your app
4. **Check server logs** for any errors
5. **Once working, implement proper security** for production

