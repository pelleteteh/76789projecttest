# 🔔 Push Notification System Architecture

## Current Implementation

The platform uses a **dual-channel notification system**:

### 1. **Real-Time In-App Notifications** ✅ (Active)
- **Service**: **Pusher** (Real-time WebSocket service)
- **Purpose**: Live notifications within the app while user is browsing
- **Configuration**:
  ```
  PUSHER_APP_ID="1553294"
  PUSHER_CLUSTER="mt1"
  PUSHER_KEY="decd2cca5e39cf0cbcd4"
  PUSHER_SECRET="1dd966e56c465ea285d9"
  ```
- **How it works**:
  - Notification Service creates a Pusher channel per user: `user-{userId}`
  - Sends events via: `pusher.trigger(channelName, 'notification', {...})`
  - Client listens to Pusher channel and receives notifications instantly
  - **Best for**: Real-time updates (challenge invites, match found, etc.)

### 2. **Browser Push Notifications** ⏳ (Scaffolded)
- **Service**: **Firebase Cloud Messaging (FCM)**
- **Purpose**: Push notifications when browser is closed/minimized
- **Configuration**:
  - Service Worker: `public/firebase-messaging-sw.js`
  - Client: `client/src/services/pushNotificationService.ts`
  - Requires: `VITE_FIREBASE_VAPID_KEY` in `.env.local`
- **Status**: Framework in place but NOT fully implemented
  - FCM token storage table exists: `users.fcmToken`
  - Service worker handles background messages
  - Backend still needs: **TODO - integrate with Firebase Cloud Messaging or OneSignal**

### 3. **Database Storage** ✅ (Active)
- **Table**: `notifications` (PostgreSQL)
- **Storage**: All notifications saved to DB before sending
- **Features**:
  - Rate limiting (5 per user per minute)
  - Event cooldowns (e.g., 5-min cooldown on CHALLENGE_CREATED)
  - Priority filtering (MEDIUM vs HIGH priority notifications)
  - Read/unread status tracking

---

## Notification Events (9 Core Events)

```typescript
CHALLENGE_CREATED           // Someone challenged you
CHALLENGE_STARTING_SOON     // Challenge starts in X minutes
CHALLENGE_ENDING_SOON       // Challenge ends in X minutes
CHALLENGE_JOINED_FRIEND     // Friend accepted your challenge
IMBALANCE_DETECTED          // Unusual activity detected
BONUS_ACTIVATED             // Bonus activated on challenge
BONUS_EXPIRING              // Bonus expiring soon
MATCH_FOUND                 // Match found in queue
SYSTEM_JOINED               // System event (e.g., new user)
```

---

## Use Cases Coverage

| Notification Type | Event | Channels | Priority | Status |
|---|---|---|---|---|
| 🎯 Friend challenged you | CHALLENGE_CREATED | IN_APP + PUSH | MEDIUM | ✅ Ready |
| ⚔️ Friend accepted challenge | CHALLENGE_JOINED_FRIEND | IN_APP + PUSH | MEDIUM | ✅ Ready |
| 🏆 You won challenge | BONUS_ACTIVATED | IN_APP + PUSH | HIGH | ✅ Ready |
| 🆕 New challenge listed | SYSTEM_JOINED | IN_APP | MEDIUM | ✅ Ready |
| ⏰ Challenge starting soon | CHALLENGE_STARTING_SOON | IN_APP + PUSH | HIGH | ✅ Ready |
| 🎁 Bonus expiring | BONUS_EXPIRING | IN_APP + PUSH | MEDIUM | ✅ Ready |
| ⚠️ Match found in queue | MATCH_FOUND | IN_APP + PUSH | HIGH | ✅ Ready |

---

## Architecture Diagram

```
User Action (e.g., Create Challenge)
            ↓
    API Endpoint Receives Request
            ↓
    NotificationService.send({
      userId,
      event,
      title,
      body,
      channels: [IN_APP, PUSH],
      priority: MEDIUM
    })
            ↓
    ┌───────┴───────┐
    ↓               ↓
SaveToDatabase    RateLimitCheck
(notifications)   (5/min per user)
    ↓               ↓
    └───────┬───────┘
            ↓
    ┌───────┴───────────┐
    ↓                   ↓
sendInApp           sendPush
(Pusher)            (Firebase)
    ↓                   ↓
Channel:            Background
user-{userId}       Message
    ↓                   ↓
Client receives    FCM Token
instantly via       Send to device
WebSocket
```

---

## Client-Side Integration

### For IN_APP (Pusher) - Already Working
```typescript
import Pusher from 'pusher-js';

const pusher = new Pusher('decd2cca5e39cf0cbcd4', {
  cluster: 'mt1',
});

const channel = pusher.subscribe(`user-${userId}`);
channel.bind('notification', (data) => {
  // Show notification toast/badge
  console.log('New notification:', data.title);
});
```

### For PUSH (Firebase) - Needs Environment Setup
```typescript
// In pushNotificationService.ts
export async function initializeFCM() {
  const messaging = firebase.messaging();
  
  // Get FCM token
  const token = await messaging.getToken({
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
  });
  
  // Save token to server at users.fcmToken
  await saveFCMToken(token);
  
  // Listen to foreground messages
  messaging.onMessage((payload) => {
    new Notification(payload.notification.title);
  });
}
```

---

## What Needs to be Done (To Fully Enable Push)

1. **Get Firebase Credentials**
   - Go to: [Firebase Console](https://console.firebase.google.com)
   - Create project or use existing
   - Generate VAPID key for web notifications
   
2. **Update `.env.local`**
   ```
   VITE_FIREBASE_VAPID_KEY=your_vapid_key_here
   ```

3. **Implement Backend Push Sending**
   - In `server/notificationService.ts` line 274 (`sendPush` method)
   - Replace TODO with actual Firebase Admin SDK call:
   ```typescript
   private async sendPush(payload: NotificationPayload): Promise<void> {
     // Get user's FCM token from database
     const user = await db.select().from(users)
       .where(eq(users.id, payload.userId));
     
     if (!user[0]?.fcmToken) return; // No token, skip
     
     // Send via Firebase Admin SDK
     await admin.messaging().send({
       token: user[0].fcmToken,
       notification: {
         title: payload.title,
         body: payload.body,
       },
       data: payload.data,
     });
   }
   ```

4. **Initialize FCM on App Load**
   - In `client/src/App.tsx` or layout:
   ```typescript
   useEffect(() => {
     initializeFCM();
   }, []);
   ```

---

## Current P2P Challenge Notifications ✅

For the new P2P challenge system, notifications are already wired:

- **Challenge Created**: User A creates challenge → User B gets notification via Pusher (IN_APP)
- **Challenge Accepted**: User B accepts challenge → User A gets notification via Pusher (IN_APP)
- **Database Logged**: All notifications stored in `notifications` table with `challenge_id` reference

**Ready to test!** Push notifications (Firebase) can be added after testing real-time in-app notifications.

---

## Summary

| Component | Status | Used For |
|---|---|---|
| **Pusher** | ✅ Fully Implemented | Real-time IN_APP notifications (WebSocket) |
| **Firebase FCM** | ⏳ Scaffolded | Browser push notifications (background) |
| **Database (notifications table)** | ✅ Ready | Persistence & history |
| **Rate Limiting** | ✅ Active | Spam prevention (5/min per user) |
| **P2P Challenge Notifications** | ✅ Ready | Working with Pusher + DB |
| **Client SDK** | ✅ Ready | Receives Pusher events |
