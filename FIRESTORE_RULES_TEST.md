# Firestore Security Rules Testing Guide

## Important Note: Server-Side vs Client-Side

**Your current setup uses server-side API routes**, which means:
- Firestore operations happen on the server (Next.js API routes)
- Server-side Firestore uses the **Firebase Admin SDK** (if configured) or regular SDK
- **Security rules may not apply** if using Admin SDK (it bypasses rules)
- Regular SDK with server-side code **still requires authentication tokens**

## Testing Security Rules

### Option 1: Test via API Endpoint

I've created a test endpoint at `/api/test-firestore`:

**Test Read:**
```bash
curl http://localhost:3000/api/test-firestore
```

**Test Write:**
```bash
curl -X POST http://localhost:3000/api/test-firestore \
  -H "Content-Type: application/json" \
  -d '{"testData": true}'
```

### Option 2: Test in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `spontaneous-travel-app`
3. Navigate to **Firestore Database > Rules**
4. Click **Rules Playground** (if available)
5. Test rules with different scenarios

### Option 3: Test via Browser Console

Open browser console on your app and run:

```javascript
// Test Firestore read
fetch('/api/test-firestore')
  .then(r => r.json())
  .then(console.log);

// Test Firestore write
fetch('/api/test-firestore', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ testData: true })
})
  .then(r => r.json())
  .then(console.log);
```

## Security Rules Analysis

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

**What this means:**
- ✅ Allows reads/writes if user is authenticated
- ❌ Blocks anonymous/unauthenticated requests
- ⚠️ **Problem:** Server-side API routes might not have `request.auth` set

**When this works:**
- Client-side Firestore operations with Firebase Auth
- Server-side operations with Firebase Admin SDK (bypasses rules)
- Server-side operations with Firebase Auth token passed

**When this fails:**
- Server-side API routes without auth tokens (your current setup might have this issue)

### Rule Set 2: Open Access (Development Only)
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

**What this means:**
- ✅ Allows all reads/writes (no authentication required)
- ✅ Works for testing and development
- ❌ **NOT SECURE for production**

**When to use:**
- Development/testing only
- When you need to test Firestore functionality
- When you have other security measures (API keys, rate limiting)

## Current Implementation Analysis

Your current setup:
1. **Client-side:** User authenticates with Firebase Auth
2. **Server-side:** API routes receive `userId` in request body
3. **Firestore writes:** Happen server-side via API routes

**Potential Issue:**
- Server-side Firestore operations might not have `request.auth` context
- Security rules checking `request.auth != null` might fail
- Need to either:
  - Use Firebase Admin SDK (bypasses rules)
  - Pass Firebase Auth token to server and use it
  - Use open rules for development (not recommended for production)

## Recommended Solution

### For Development/Testing

Use open rules temporarily:
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

### For Production

Use tenant-based rules with API key validation:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /events/{eventId} {
      // Allow read if authenticated
      allow read: if request.auth != null;
      
      // Allow write if authenticated AND tenantId matches
      allow create: if request.auth != null && 
                       request.resource.data.tenantId != null;
      
      // Allow update/delete if user owns the event
      allow update, delete: if request.auth != null && 
                               resource.data.createdBy == request.auth.uid;
    }
  }
}
```

## Testing Steps

1. **Update Firestore Rules** in Firebase Console
2. **Test read access:**
   ```bash
   curl http://localhost:3000/api/test-firestore
   ```
3. **Test write access:**
   ```bash
   curl -X POST http://localhost:3000/api/test-firestore \
     -H "Content-Type: application/json" \
     -d '{"testData": true}'
   ```
4. **Try creating an event** in your app
5. **Check server logs** for any error messages
6. **Check Firestore Console** to see if documents were created

## Expected Results

### With Open Rules (if true)
- ✅ `/api/test-firestore` GET returns success
- ✅ `/api/test-firestore` POST returns success
- ✅ Creating events in app works
- ✅ No permission errors

### With Authenticated Rules (request.auth != null)
- ✅ `/api/test-firestore` GET might work (if server has auth context)
- ❌ `/api/test-firestore` POST might fail (if no auth token)
- ✅ Creating events might work (if auth token is passed)
- ❌ Might see "permission-denied" errors

## Debugging

If you see `permission-denied` errors:

1. **Check Firestore Console** for rule syntax errors
2. **Check server logs** for specific error codes
3. **Try open rules** to confirm it's a rules issue
4. **Verify Firebase config** in `.env.local`
5. **Check if Firestore is enabled** in Firebase Console

## Next Steps

1. Use open rules for now to test functionality
2. Once working, implement proper auth-based rules
3. Consider using Firebase Admin SDK for server-side operations
4. Implement proper tenant-based access control

