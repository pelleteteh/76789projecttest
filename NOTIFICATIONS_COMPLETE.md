# Bantah Notifications System - Complete Flow

## 📬 Notifications Triggered by Challenge Events

### 1. **Challenge Creation (Open Challenge)**
**Trigger:** User creates an open challenge  
**Recipient:** Challenge Creator  
**Notification Type:** Both In-App + Push  
**Message:** 
- Title: ✅ Challenge Posted!
- Body: "Your challenge is now live! Wait for others to see it and accept your challenge."

**Points Notification:**
- Title: 🎁 Bantah Points Earned!
- Body: "You earned {creationPoints} Bantah Points for creating "{challengeTitle}""
- Status: ✅ Implemented in `notifyPointsEarnedCreation()`

---

### 2. **Challenge Creation (Direct P2P)**
**Trigger:** User creates a direct P2P challenge (with specific opponent)  
**Recipient:** Challenged User (opponent)  
**Notification Type:** Both In-App + Push  
**Message:**
- Title: 🎯 {ChallengerName} challenged you!
- Body: "{ChallengerName} challenged you to: "{title}""

**Creator Points Notification:**
- Title: 🎁 Bantah Points Earned!
- Body: "You earned {creationPoints} Bantah Points for creating "{challengeTitle}""

---

### 3. **Challenge Joined (Admin Challenge)**
**Trigger:** User joins an admin/open challenge by choosing YES or NO side  
**Recipient:** 
- Joining User (gets points notification)
- Challenge Creator (gets notified someone joined) ✅ TO IMPLEMENT

**Notification for Joiner:**
- Title: 🎉 Participation Points Earned!
- Body: "You earned {participationPoints} Bantah Points for joining "{challengeTitle}""

---

### 4. **Open Challenge Accepted**
**Trigger:** Someone accepts a user's open challenge  
**Recipient:** Challenge Creator  
**Notification Type:** Both In-App + Push (HIGH priority)  
**Message:**
- Title: ⚔️ Challenge Accepted!
- Body: "{AcceptorName} accepted your challenge! The battle begins now."

---

### 5. **Direct P2P Challenge Accepted**
**Trigger:** Challenged user accepts the direct P2P challenge  
**Recipient:** Challenger (creator)  
**Notification Type:** Both In-App + Push  
**Message:**
- Title: ⚔️ {AcceptorName} accepted your challenge!
- Body: "{AcceptorName} accepted your challenge: "{title}""

---

### 6. **Challenge Won (Implemented)**
**Trigger:** Challenge is resolved and user wins  
**Recipient:** Winning User  
**Notification Type:** Both In-App + Push (HIGH priority)  
**Message:**
- Title: 🏆 You Won!
- Body: "Congratulations! You won the challenge "{challengeTitle}" and earned {pointsAwarded} Bantah Points!"

**Also receives points notification via `notifyPointsEarnedWin()`:**
- Title: 🏆 Challenge Won! Points Awarded
- Body: "You earned {points} Bantah Points for winning "{challengeTitle}"" + {prize}

---

### 7. **Challenge Lost (Implemented)**
**Trigger:** Challenge is resolved and user loses  
**Recipient:** Losing User  
**Notification Type:** In-App only  
**Message:**
- Title: 😞 Challenge Lost
- Body: "You lost the challenge "{challengeTitle}" against {WinnerName}. Better luck next time!"

---

### 8. **Challenge Expiry Reminder (Implemented)**
**Trigger:** Background job runs every 30 minutes, sends reminders 1 hour before challenge expires  
**Recipient:** Both Challenger and Challenged user (if direct P2P)  
**Notification Type:** Both In-App + Push (HIGH priority)  
**Message:**
- Title: ⏰ Challenge Expiring Soon!
- Body: "Your challenge "{title}" expires in {timeMessage}. Submit your result now!"

---

## 🔧 Implementation Status

### ✅ COMPLETED
- [x] Challenge Creation - Open Challenge notification to creator
- [x] Challenge Creation - Direct P2P notification to opponent
- [x] Challenge Creation - Points earned notification to creator
- [x] Challenge Joined - Participation points notification to joiner
- [x] Challenge Joined - Notification to creator when someone joins their challenge
- [x] Open Challenge Accepted - Notification to creator
- [x] Direct P2P Challenge Accepted - Notification to creator
- [x] Challenge Won - Victory notification with points (HIGH priority)
- [x] Challenge Lost - Loss notification
- [x] Challenge Expiry Reminder - 1 hour before due date (background job every 30 mins)

### ⏳ IN PROGRESS / TO IMPLEMENT
- [ ] Challenge Reminder - Custom snooze options
- [ ] Challenge Statistics - Notification when milestone reached
- [ ] Leaderboard Position Change - When user moves up/down in rankings

---

## 📊 Points System Integration

All notifications are tied to the points system:
- **Creation Points:** 50 + (stakeAmount × 5), MAX 500
- **Participation Points:** 10 + (stakeAmount × 4), MAX 500
- **Win Points:** 100 + (stakeAmount × 10), MAX 1000

**Points Flow:**
1. Challenge created → Points recorded in `points_transactions` table
2. Notification sent via `notificationService.send()` with `POINTS_EARNED` event
3. User sees in-app notification + push notification
4. Points reflected in `/api/points/balance` endpoint
5. User wallet shows updated balance on Profile page

---

## 🔍 Debugging Points Notifications

### Server Logs to Check:
```
✅ Points transaction recorded: {...}
✅ Points earned notification sent to creator
```

### Frontend Logs:
```
useNotifications.ts:48 Pusher notifications initialized for user: did:privy:...
```

### Database Verification:
```sql
-- Check if points were recorded
SELECT * FROM points_transactions 
WHERE user_id = 'USER_ID' 
ORDER BY created_at DESC LIMIT 5;

-- Check notification in database
SELECT * FROM notifications 
WHERE user_id = 'USER_ID' 
ORDER BY created_at DESC LIMIT 5;
```

---

## 🚀 Next Steps

1. **Test Notifications**
   - Create open challenge → Should see "Challenge Posted!" + "Points Earned!" notifications
   - Have another user join → Creator should be notified

2. **Monitor Logs**
   - Check server: `npm run dev` output
   - Check browser console: `F12 → Console tab`

3. **Verify Points**
   - Profile page should show updated Bantah Points balance
   - `/api/points/balance` endpoint should reflect points

4. **Implement Missing Notifications**
   - Add notification to creator when someone joins their challenge
   - Add win/loss notifications after challenge resolution
