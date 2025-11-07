# Debug Firestore Permission Errors

## Current Issue

You're still getting `403 Forbidden` errors even after updating rules. Let's diagnose this step by step.

## Step 1: Verify Rules Are Actually Updated

1. Go to Firebase Console: https://console.firebase.google.com/
2. Select project: **spontaneous-travel-app**
3. Navigate to: **Firestore Database > Rules**
4. **Copy and paste your current rules here** - what do you see?

## Step 2: Test Firestore Directly

Open your browser console and run:

```javascript
fetch('/api/test-firestore', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ testData: true })
})
  .then(r => r.json())
  .then(console.log);
```

**What does this return?** Share the full response.

## Step 3: Check Server Logs

Look at your terminal where `npm run dev` is running. After trying to create an event, what error messages do you see?

You should see logs like:
```
Firestore submit error: [error object]
Error code: permission-denied
Error message: ...
```

## Step 4: Verify Rules Are Correct

The rules MUST be exactly this (for development):

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

**Common mistakes:**
- Missing `rules_version = '2';` at the top
- Missing `service cloud.firestore {` wrapper
- Missing `match /databases/{database}/documents {` wrapper
- Extra characters or syntax errors
- Rules not actually published (need to click "Publish")

## Step 5: Clear Browser Cache

Sometimes Firebase caches rules. Try:
1. Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
2. Or clear browser cache
3. Wait 30 seconds after publishing rules

## Step 6: Check Firebase Project

Verify you're editing the correct project:
- Project ID should be: `spontaneous-travel-app`
- Check `.env.local` has correct `NEXT_PUBLIC_FIREBASE_PROJECT_ID`

## Still Not Working?

If rules are correct and still failing:

1. **Check if Firestore is enabled:**
   - Firebase Console > Firestore Database
   - Should see "Create Database" or existing database
   - If not enabled, click "Create Database" and choose "Start in test mode"

2. **Check Firebase configuration:**
   - Verify `.env.local` has all Firebase keys
   - Check terminal for "Firestore database not initialized" errors

3. **Try the test endpoint:**
   - Visit: `http://localhost:3000/api/test-firestore` in browser
   - Then try POST: `http://localhost:3000/api/test-firestore` (POST request)

## Expected Test Results

### ✅ If Rules Are Working:
```json
{
  "success": true,
  "message": "Test write successful",
  "documentId": "abc123..."
}
```

### ❌ If Rules Are Blocking:
```json
{
  "success": false,
  "error": "Test write failed",
  "code": "permission-denied",
  "details": {
    "permissionDenied": true,
    "message": "Security rules are blocking writes..."
  }
}
```

## Next Steps

1. Run the test endpoint and share the results
2. Share what you see in the Rules tab in Firebase Console
3. Share any error messages from your terminal/server logs

This will help identify exactly what's wrong!

