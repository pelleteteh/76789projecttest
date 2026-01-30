# 🧪 P2P Challenge + Friends + Firebase Notifications - Complete Testing Guide

## System Overview

Your platform now has:
- ✅ **P2P Challenges** - User-to-user challenges with blockchain signing
- ✅ **Friends System** - Friend requests, acceptance, management  
- ✅ **Dual Notifications** - Pusher (real-time) + Firebase (browser push)
- ✅ **12+ Notification Types** - Challenge, friends, points, bonuses, etc.

---

## Test Scenario: Complete User Journey

### **Setup: 2 Users Required**

```
User A: alice@test.com / password
User B: bob@test.com / password
```

---

## **TEST 1: Friend Request + Notification**

### **Step 1: User A sends friend request to User B**

**API Call:**
```bash
POST /api/friends/request
{
  "targetUserId": "bob-id"
}
```

**Expected Response:**
```json
{
  "success": true,
  "friendRequest": {
    "id": 1,
    "status": "pending",
    "createdAt": "2026-01-18T..."
  }
}
```

**Notification User B Should Receive:**
- **Pusher (Real-time)** if app open:
  ```
  Title: "👥 Alice wants to be your friend!"
  Body: "Alice sent you a friend request"
  ```
- **Firebase (Browser push)** if app closed:
  ```
  Browser notification on lock screen
  Tappable to open app
  ```

---

## **TEST 2: Accept Friend Request**

### **Step 2: User B accepts friend request**

**API Call:**
```bash
POST /api/friends/accept/1
```

**Expected Response:**
```json
{
  "success": true,
  "friendship": {
    "id": 1,
    "status": "accepted",
    "acceptedAt": "2026-01-18T..."
  }
}
```

**Notification User A Should Receive:**
```
Title: "✅ Bob accepted your friend request!"
Body: "Bob is now your friend"
```

---

## **TEST 3: Create P2P Challenge**

### **Step 3: User A creates P2P challenge for User B**

**Navigate to:** `/friends` or `/challenges`

**Form:**
```
Friend: Bob ✓
Title: "Predict Bitcoin Price"
Description: "Will Bitcoin hit $100K by end of month?"
Stake Amount: 50
Payment Token: USDC
```

**Expected Flow:**
1. Challenge stored in database immediately
2. Challenger signs transaction with Privy wallet
3. Transaction sent to Base Sepolia
4. Notification sent to User B

**Notification User B Should Receive:**
```
Pusher (Real-time):
  Title: "🎯 Alice challenged you!"
  Body: "Alice challenged you to: 'Predict Bitcoin Price'"

Firebase (Browser push):
  Same notification on lock screen
```

---

## **TEST 4: Accept Challenge**

### **Step 4: User B accepts challenge**

**Navigate to:** Challenge modal / `/challenges`

**Click:** "Accept Challenge" button

**Expected Flow:**
1. Modal appears
2. User B sees challenge details
3. User B signs with Privy wallet
4. Transaction sent to blockchain
5. Challenge status changes to "active"
6. Notification sent to User A

**Notification User A Should Receive:**
```
Title: "⚔️ Bob accepted your challenge!"
Body: "Bob accepted your challenge: 'Predict Bitcoin Price'"
```

---

## **TEST 5: Check Friends List**

### **Step 5: User A views friends**

**API Call:**
```bash
GET /api/friends
```

**Expected Response:**
```json
{
  "success": true,
  "friends": [
    {
      "id": "bob-id",
      "firstName": "Bob",
      "lastName": "Smith",
      "username": "bob_smith",
      "profileImageUrl": "...",
      "level": 5,
      "points": 1500
    }
  ],
  "count": 1
}
```

---

## **TEST 6: Check Leaderboard**

### **Step 6: View leaderboard rankings**

**API Call:**
```bash
GET /api/points/leaderboard
```

**Expected Response:**
```json
{
  "success": true,
  "leaderboard": [
    {
      "rank": 1,
      "userId": "alice-id",
      "firstName": "Alice",
      "points": 5000,
      "level": 10,
      "challengesWon": 25
    },
    {
      "rank": 2,
      "userId": "bob-id",
      "firstName": "Bob",
      "points": 3500,
      "level": 8,
      "challengesWon": 18
    }
  ],
  "totalUsers": 42,
  "lastUpdated": "2026-01-18T..."
}
```

---

## **Notification Testing Checklist**

### **When App is OPEN:**
- [ ] Friend request notification appears as toast/badge (Pusher)
- [ ] Notification disappears after 5 seconds
- [ ] Can click to accept/view friend

### **When App is CLOSED:**
- [ ] Browser push notification appears on lock screen
- [ ] Can tap notification to open app
- [ ] App opens to relevant screen (friend request modal, challenge details, etc.)

### **Notification Content:**
- [ ] Friend request: Shows requester name
- [ ] Challenge created: Shows challenge title
- [ ] Challenge accepted: Shows acceptor name
- [ ] Icon/emoji displayed correctly
- [ ] Sound/vibration on device

---

## **Database Verification**

### **Check Friends Table:**
```sql
SELECT * FROM friends WHERE status = 'accepted' LIMIT 5;
```

Expected: Friendship record with `status='accepted'` and `acceptedAt` timestamp

### **Check Notifications Table:**
```sql
SELECT * FROM notifications 
WHERE event IN ('friend.request', 'challenge.created', 'challenge.joined.friend')
ORDER BY created_at DESC LIMIT 10;
```

Expected: Multiple notification records with different events

### **Check User Wallet Addresses:**
```sql
SELECT * FROM user_wallet_addresses WHERE user_id = 'alice-id';
```

Expected: User's Privy wallet address with FCM token

---

## **Firebase Console Monitoring**

### **View Notification Metrics:**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select `bantah-app` project
3. Cloud Messaging → Reporting
4. Check:
   - Deliveries: How many notifications sent
   - Impressions: How many users saw them
   - Errors: Any failed sends

---

## **Debugging Issues**

### **If notifications not received when app CLOSED:**

1. **Check FCM token saved:**
   ```bash
   # Check browser console for:
   ✅ FCM initialized, token saved
   ```

2. **Check database:**
   ```sql
   SELECT fcm_token FROM users WHERE id = 'bob-id';
   ```
   Should show a token like: `c0i...xyz`

3. **Check Firebase credentials:**
   ```bash
   # Verify in .env.local:
   FIREBASE_ADMIN_KEY_PATH=./firebase-service-account.json
   VITE_FIREBASE_VAPID_KEY=BMHqf...
   ```

4. **Check browser notification permission:**
   - Site settings → Notifications → Allow

### **If Pusher notifications not working (app open):**

1. **Check WebSocket connection:**
   - Browser DevTools → Network → WS
   - Should show Pusher connection

2. **Check channel subscription:**
   - Console should show: `Subscribed to user-{userId}`

### **If challenge blockchain tx fails:**

1. **Check Privy wallet:**
   - User should have Base Sepolia testnet selected
   - User should have test USDC balance

2. **Check contract address:**
   ```
   VITE_CHALLENGE_FACTORY_ADDRESS=0xEB38...
   ```

---

## **Success Criteria**

All tests pass when:

✅ Friend request → notification received (both Pusher + Firebase)
✅ Friend accepted → notification received (both channels)
✅ P2P challenge created → opponent notified
✅ P2P challenge accepted → creator notified
✅ Friends list shows correct people
✅ Leaderboard ranks correct
✅ Notifications persist in database
✅ Firebase metrics show deliveries/impressions

---

## **Test Commands**

### **Start Dev Server:**
```bash
npm run dev
```

### **Check Server Logs:**
```bash
# Look for:
✅ Firebase Admin SDK initialized
✅ Notification sent: ... to user-id
✅ P2P challenge created in DB
📬 Notification sent to opponent
```

### **Simulate Challenge Creation:**
```bash
# Open browser to: http://localhost:5173/friends
# Select friend, fill form, click "Create Challenge"
# Sign with Privy wallet
# Check other user's app for notification
```

---

## **Expected Timeline**

| Step | Time | What Happens |
|------|------|---|
| 1 | 0s | User A fills challenge form |
| 2 | 5s | User A signs with Privy |
| 3 | 10s | Transaction sent to Base Sepolia |
| 4 | 15s | Block confirmed |
| 5 | 15-20s | Challenge stored in DB |
| 6 | 20-30s | Notification sent to User B |
| 7 | 21-31s | User B receives notification |
| 8 | Instant | If app open: toast appears |
| 9 | 1-10s | If app closed: browser push |

---

## **Success Examples**

### **Perfect Flow:**
```
Alice: Opens /friends
       Selects Bob
       Fills challenge form
       Signs with wallet
       ✅ Notification toast: "Challenge created"
       
Bob: Gets browser push notification
     Clicks notification
     App opens to challenge details
     Sees Alice's challenge
     ✅ Accepts challenge
     Signs with wallet
     
Alice: Gets real-time notification
       "Bob accepted your challenge!"
       Challenge status changes to ACTIVE
```

---

Ready to test? Start with **TEST 1: Friend Request!** 🚀

Questions? Check the console logs and Firebase Cloud Messaging dashboard.
