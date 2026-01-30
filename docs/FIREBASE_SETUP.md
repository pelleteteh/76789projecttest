# Firebase Setup Guide for Push Notifications

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a new project"
3. Name it: `bantah-app`
4. Accept terms and create

## Step 2: Set Up Web App in Firebase

1. In Firebase Console, click gear icon → Project settings
2. Go to "Your apps" section
3. Click "Add app" → Web (</> icon)
4. Register app as `Bantah Web`
5. Copy the Firebase config (you'll see it on the next screen)

## Step 3: Generate Service Account Key

1. Go to "Service Accounts" tab in Project Settings
2. Click "Generate New Private Key"
3. This will download a JSON file with credentials
4. **Keep this file safe!** Never commit to git

## Step 4: Get Web Push VAPID Key

1. In Firebase Console, go to Cloud Messaging tab
2. Scroll to "Web configuration"
3. Click "Generate Key Pair" if not already done
4. Copy the "Server key" - this is your VAPID key

## Step 5: Environment Variables

Add to `.env.local`:

```bash
# Firebase Admin SDK (service account key as JSON string)
# Convert the downloaded JSON file to a single-line string
FIREBASE_ADMIN_CREDENTIALS='{"type":"service_account","project_id":"bantah-app",...}'

# Or if using a file:
FIREBASE_ADMIN_KEY_PATH=./firebase-service-account.json

# Client-side VAPID key for web push
VITE_FIREBASE_VAPID_KEY=your_server_key_here
```

### How to Format FIREBASE_ADMIN_CREDENTIALS

If you have `firebase-service-account.json`:

```bash
# Linux/Mac
export FIREBASE_ADMIN_CREDENTIALS=$(cat firebase-service-account.json | tr '\n' ' ')

# Or convert to single line:
cat firebase-service-account.json | jq -c . | pbcopy
```

Then paste the output into `.env.local`

## Step 6: Install Firebase Admin SDK

Already done if dependencies are installed:
```bash
npm install firebase-admin
```

## Step 7: Client-Side Setup

Add Firebase script to `client/public/index.html` or `client/index.html`:

```html
<!-- Firebase -->
<script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js"></script>

<script>
  // Initialize Firebase
  const firebaseConfig = {
    apiKey: "your_api_key",
    authDomain: "bantah-app.firebaseapp.com",
    projectId: "bantah-app",
    storageBucket: "bantah-app.appspot.com",
    messagingSenderId: "your_messaging_sender_id",
    appId: "your_app_id"
  };
  
  firebase.initializeApp(firebaseConfig);
</script>
```

## Step 8: Register Service Worker

The service worker `public/firebase-messaging-sw.js` will automatically handle background messages.

## Step 9: Initialize FCM on App Load

In your main app component (`client/src/App.tsx` or similar):

```typescript
import { initializeFCM } from './services/pushNotificationService';

export function App() {
  useEffect(() => {
    // Initialize Firebase Cloud Messaging when app loads
    initializeFCM();
  }, []);
  
  return (
    // ... app content
  );
}
```

## Step 10: Test Push Notifications

1. Build and run the app
2. Open browser console
3. Check for: `✅ FCM initialized, token saved`
4. Send a test notification from Firebase Console:
   - Cloud Messaging → Send your first message
   - Select your web app
   - Send test message to the FCM token shown in console

## Troubleshooting

### "Firebase not available"
- Make sure Firebase scripts are loaded in HTML
- Check browser console for 404 errors on Firebase JS files

### "FCM token is invalid"
- Token may have expired
- Clear browser cache/storage and reload
- Client should request new token automatically

### "No FCM token found"
- User hasn't granted notification permission
- Browser may block notifications by default
- Check browser notification settings

### Firebase Admin SDK not initializing
- Check `FIREBASE_ADMIN_CREDENTIALS` format (must be valid JSON)
- Verify credentials file has proper permissions
- Check Firebase project ID matches

## Monitoring

View notification metrics in Firebase Console:
1. Cloud Messaging section
2. Monitor "Deliveries" and "Impressions"
3. Check error logs for failed sends

## File Structure

```
.
├── server/
│   └── firebase/
│       └── admin.ts              # Firebase Admin SDK setup
├── client/
│   └── src/services/
│       └── pushNotificationService.ts  # Client-side FCM init
├── public/
│   └── firebase-messaging-sw.js  # Service worker for background messages
└── .env.local                    # Firebase credentials (git-ignored)
```

## References

- [Firebase Console](https://console.firebase.google.com)
- [Firebase Web Setup Guide](https://firebase.google.com/docs/cloud-messaging/js/client)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
