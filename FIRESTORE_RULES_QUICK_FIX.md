# Quick Fix: Firestore Security Rules

## The Problem

You're getting `403 Forbidden` errors because:
- Server-side Firestore operations don't have `request.auth` context
- Security rules require `request.auth != null` 
- Rules are blocking writes

## Immediate Solution: Update Firestore Rules

### Step 1: Go to Firebase Console

1. Visit: https://console.firebase.google.com/
2. Select your project: **spontaneous-travel-app**
3. Navigate to: **Firestore Database > Rules**

### Step 2: Replace Rules with Open Rules (Development Only)

Paste this into the rules editor:

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

### Step 3: Click "Publish"

### Step 4: Test Again

Try creating an event in your app - it should work now!

## ⚠️ Important Notes

1. **These rules are for DEVELOPMENT ONLY** - they allow anyone to read/write
2. **For production**, you'll need to:
   - Use Firebase Admin SDK (bypasses rules)
   - Or implement auth token passing (more complex)
3. **You already have API key validation** - that provides some security even with open Firestore rules

## Why This Works

- Open rules (`if true`) bypass the `request.auth` requirement
- Your API routes still validate API keys and user IDs
- This is a temporary solution for development

## Next Steps (Production)

1. Implement Firebase Admin SDK for server-side operations
2. Or pass Firebase Auth tokens from client to server
3. Update security rules to enforce tenant-based access

