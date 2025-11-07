# Firebase Admin SDK Setup

## Problem

Firestore security rules are blocking server-side writes because server-side operations don't have `request.auth` context.

## Solution: Firebase Admin SDK

Firebase Admin SDK **bypasses security rules**, which is the correct approach for server-side operations.

## Setup Instructions

### Option 1: Quick Setup (No Service Account - Development Only)

For local development, Admin SDK can work with just the project ID. The code will try to use Application Default Credentials.

**Currently configured:** The code will automatically try Admin SDK first, then fall back to regular SDK.

### Option 2: Full Setup with Service Account (Recommended for Production)

1. **Get Service Account Key:**
   - Go to Firebase Console: https://console.firebase.google.com/
   - Select project: **spontaneous-travel-app**
   - Click gear icon ⚙️ > **Project Settings**
   - Go to **Service Accounts** tab
   - Click **Generate New Private Key**
   - Download the JSON file (keep it secure!)

2. **Add to `.env.local`:**
   ```bash
   # Option A: Base64 encoded (safer for deployment)
   FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...",...}'
   
   # Option B: Path to file (local development)
   # FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/service-account-key.json
   ```

3. **Or use Application Default Credentials:**
   - If deployed on Google Cloud, Admin SDK will automatically use credentials
   - No configuration needed

## Current Status

✅ **Code is ready:** The `submitEvent` function will automatically use Admin SDK if available.

❌ **Admin SDK not initialized:** We need to either:
- Set up service account credentials (Option 2)
- Or update Firestore rules to allow writes (temporary fix)

## Quick Fix: Update Firestore Rules (Temporary)

If you want to test immediately without service account setup:

1. Go to Firebase Console > Firestore Database > Rules
2. Paste this:

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

3. Click **Publish**
4. Wait 30 seconds
5. Try creating an event again

## Testing Admin SDK

After setting up, test with:

```javascript
fetch('/api/test-firestore', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ testData: true })
})
  .then(r => r.json())
  .then(console.log);
```

If Admin SDK is working, you should see:
```json
{
  "success": true,
  "message": "Test write successful"
}
```

## Next Steps

1. **For Development:** Use open Firestore rules (quick fix above)
2. **For Production:** Set up service account key (Option 2)

The code will automatically use Admin SDK when available, otherwise it falls back to regular SDK (which requires proper security rules).

