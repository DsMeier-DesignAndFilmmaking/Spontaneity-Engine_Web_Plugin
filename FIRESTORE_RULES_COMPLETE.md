# Complete Firestore Security Rules

## ⚠️ Syntax Error Fix

The error "Unexpected 'match'" usually means:
- Missing outer structure (`service cloud.firestore { ... }`)
- Missing closing braces
- Incorrect comment syntax

## ✅ Complete Rules Structure

### Option 1: Open Rules (Development - Recommended for Now)

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

### Option 2: Authenticated Users Only (Your Current Attempt - Fixed)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Events collection - authenticated users can read all events, create their own, and delete their own
    match /events/{eventId} {
      allow read: if request.auth != null; // Any authenticated user can read events
      allow create: if request.auth != null && request.auth.uid == request.resource.data.createdBy; // Can only create events with their own UID
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.createdBy; // Can only modify their own events
    }
  }
}
```

### Option 3: More Secure (With Tenant Support)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /events/{eventId} {
      // Allow read if authenticated
      allow read: if request.auth != null;
      
      // Allow create if authenticated and userId matches
      allow create: if request.auth != null 
        && request.auth.uid == request.resource.data.createdBy;
      
      // Allow update/delete only if user owns the event
      allow update, delete: if request.auth != null 
        && resource.data.createdBy == request.auth.uid;
    }
  }
}
```

## Common Syntax Issues

1. **Missing outer structure:**
   ```javascript
   // ❌ WRONG - Missing service wrapper
   match /events/{eventId} {
     allow read: if true;
   }
   
   // ✅ CORRECT
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /events/{eventId} {
         allow read: if true;
       }
     }
   }
   ```

2. **Missing closing braces:**
   - Each `match` block needs a closing `}`
   - The `service cloud.firestore` block needs a closing `}`
   - The `match /databases/{database}/documents` block needs a closing `}`

3. **Comment syntax:**
   - Use `//` for single-line comments
   - Comments must be on their own line or at the end of a line

## Step-by-Step Fix

1. **Copy the complete rules** (Option 1 for development, Option 2 for auth-based)
2. **In Firebase Console:**
   - Go to Firestore Database > Rules
   - Select ALL existing rules (Cmd+A / Ctrl+A)
   - Delete
   - Paste the complete rules structure
3. **Click "Publish"**
4. **Check for syntax errors** - Firebase will highlight any issues before publishing

## Which Rules Should You Use?

### For Development (Now):
**Use Option 1** - Open rules (`if true`)
- Works immediately
- No auth context needed
- Your API routes still validate API keys and users

### For Production (Later):
**Use Option 2 or 3** - Auth-based rules
- Requires Firebase Admin SDK OR
- Requires passing auth tokens from client to server

## Testing

After updating rules, test:

```javascript
// In browser console
fetch('/api/test-firestore', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ testData: true })
})
  .then(r => r.json())
  .then(console.log);
```

Expected result with Option 1:
```json
{
  "success": true,
  "message": "Test write successful",
  "documentId": "..."
}
```

