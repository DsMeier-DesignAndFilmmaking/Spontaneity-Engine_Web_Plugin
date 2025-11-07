# Firestore Setup Guide

## Collection Creation

**Good news:** Firestore collections are created automatically when you first write a document to them. You don't need to manually create the `events` collection.

## Required Setup

### 1. Firestore Database

Make sure Firestore is enabled in your Firebase Console:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `spontaneous-travel-app`
3. Navigate to **Firestore Database**
4. Click **Create Database** if not already created
5. Choose **Start in test mode** (for development) or **Production mode** (with security rules)

### 2. Security Rules

For development/testing, use these rules in **Firestore Database > Rules**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Hang Outs collection - allow authenticated users to read/write
    match /hangOuts/{hangOutId} {
      // Allow read if user is authenticated
      allow read: if request.auth != null;
      
      // Allow write if user is authenticated and owns the event
      allow create: if request.auth != null && 
                       request.resource.data.createdBy == request.auth.uid;
      allow update: if request.auth != null && 
                       request.resource.data.createdBy == request.auth.uid &&
                       resource.data.createdBy == request.auth.uid;
      allow delete: if request.auth != null && 
                       resource.data.createdBy == request.auth.uid;
    }
  }
}
```

**For Production (Multi-tenant):**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /hangOuts/{hangOutId} {
      // Require tenantId to match authenticated tenant
      allow read: if request.auth != null && 
                     resource.data.tenantId == request.auth.token.tenantId;
      
      allow create: if request.auth != null && 
                       request.resource.data.tenantId == request.auth.token.tenantId &&
                       request.resource.data.createdBy == request.auth.uid;
      
      allow update: if request.auth != null && 
                       resource.data.tenantId == request.auth.token.tenantId &&
                       resource.data.createdBy == request.auth.uid &&
                       request.resource.data.createdBy == request.auth.uid;
      
      allow delete: if request.auth != null && 
                       resource.data.tenantId == request.auth.token.tenantId &&
                       resource.data.createdBy == request.auth.uid;
    }
  }
}
```

**For Testing (Open Access - NOT for production):**

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

**⚠️ IMPORTANT: Server-Side Operations**

Your app uses server-side API routes for Firestore operations. This means:
- Security rules checking `request.auth != null` may not work as expected
- Server-side Firestore operations don't automatically have auth context
- **Solution:** Use open rules for development, or implement Firebase Admin SDK for production

**Recommended for Development:**
Use the open rules above to test functionality, then implement proper security later.

### 3. Indexes

Firestore may require composite indexes for certain queries. If you see an error like:

```
The query requires an index. You can create it here: [link]
```

1. Click the link in the error message
2. Or go to **Firestore Database > Indexes**
3. Create the suggested index

Common indexes needed:
- Collection: `hangOuts`
- Fields: `tenantId` (Ascending), `createdAt` (Descending)
- Fields: `tenantId` (Ascending), `tags` (Ascending), `createdAt` (Descending)

### 4. Environment Variables

Ensure these are set in `.env.local`:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBGsx8KKP1CS441SKsB_URjCpPcrBtL20k
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=spontaneous-travel-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=spontaneous-travel-app
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=spontaneous-travel-app.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MSG_SENDER_ID=599074564041
NEXT_PUBLIC_FIREBASE_APP_ID=1:599074564041:web:123c3b42a0f66297fe6a18
```

## Troubleshooting

### Error: "Permission denied"
- Check Firestore security rules
- Ensure user is authenticated
- Verify rules allow writes to `events` collection

### Error: "Firestore database not initialized"
- Check Firebase config in `.env.local`
- Verify all environment variables are set
- Restart the dev server after changing `.env.local`

### Error: "Missing required index"
- Create the suggested index from the error link
- Or modify queries to avoid composite queries

### Error: "tenantId is required"
- Ensure API key is provided in request
- Check that API key is valid in tenant registry
- Verify `getTenantId()` returns a valid tenantId

## Testing

After setup, test by creating an event:

1. Make sure you're logged in
2. Click "Create Hang Out"
3. Fill in the form
4. Check the browser console for any errors
5. Check Firestore Console to see if the document was created

## Collection Structure

The `events` collection will have documents like:

```json
{
  "title": "Event Title",
  "description": "Event Description",
  "tags": ["tag1", "tag2"],
  "location": {
    "lat": 40.7128,
    "lng": -74.0060
  },
  "createdBy": "user-uid",
  "tenantId": "tenant-1",
  "consentGiven": true,
  "createdAt": Timestamp
}
```

