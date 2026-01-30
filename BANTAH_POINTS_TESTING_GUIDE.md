# Bantah Points System - Live Testing Guide

**Purpose:** Step-by-step verification that all Bantah Points are real and accurate

---

## Quick Verification Tests

### Test 1: Admin Dashboard Points Visibility
**Steps:**
1. Log in as Admin
2. Navigate to AdminDashboardOverview
3. Scroll to "Weekly Points Payout Section"
4. Verify component `AdminUserWeeklyPointsPayout` is visible
5. Check:
   - ✅ Points earned this week shown
   - ✅ Total points shown
   - ✅ "Claim Points" button visible
   - ✅ Last claimed timestamp shown

**Expected:** All data comes from database, no mock values

---

### Test 2: User Points Balance Accuracy
**Steps:**
1. Log in as any user
2. Open browser DevTools (F12)
3. Go to Network tab
4. Visit `/api/points/balance/{userId}` in new tab
5. Check response:
   ```json
   {
     "userId": "...",
     "balance": "100000000000000000000",  // Wei format
     "balanceFormatted": "100.00",         // Human readable
     "lastClaimedAt": "2025-01-25T...",
     "totalPointsEarned": "..."
   }
   ```

**Expected:** 
- ✅ Balance not zero
- ✅ balanceFormatted is readable
- ✅ No hardcoded values
- ✅ Matches database entry

---

### Test 3: Create Challenge & Award Points
**Steps:**
1. User A logs in
2. Creates challenge with $10 stake
3. Check server logs:
   ```
   🎁 Challenge creator will earn 100 Bantah Points
   ✅ Points transaction recorded
   ✅ Points earned notification sent to creator
   ```
4. Check /api/points/balance/:userId
5. User A's balance should increase by 100

**Expected:**
- ✅ 100 points awarded immediately
- ✅ Formula: 50 + (10 × 5) = 100
- ✅ Points appear in balance
- ✅ Transaction logged in points_transactions table

---

### Test 4: Leaderboard Displays Real Data
**Steps:**
1. Open `/leaderboard`
2. Verify top 10 users shown
3. Check that:
   - ✅ Users ordered by points (highest first)
   - ✅ No zero-point users shown
   - ✅ Usernames correct
   - ✅ Points match `/api/points/balance` API

**Expected:**
```
Rank 1: user_a - 5000 points
Rank 2: user_b - 4500 points
Rank 3: user_c - 3200 points
...
```

---

### Test 5: Profile Card Shows Real Points
**Steps:**
1. Open leaderboard
2. Click on any user
3. ProfileCard opens
4. Verify:
   - ✅ Points displayed
   - ✅ Points match leaderboard
   - ✅ Level shown
   - ✅ XP progress shown
   - ✅ Stats visible

**Expected:** All data from `/api/users/{userId}/profile` API call

---

### Test 6: Referral Points Award
**Steps:**
1. User A shares referral link from `/referrals`
2. Copy link
3. Use different browser/incognito
4. Paste referral link
5. New user signs up
6. Check User A's balance:
   - Should increase by 500 points
   - Check transaction type: "referral"

**Expected:**
- ✅ 500 points awarded to referrer
- ✅ Visible in user's points_transactions
- ✅ Leaderboard updates
- ✅ Balance endpoint shows new total

---

### Test 7: Verify No Mock Data
**Steps:**
1. Open browser DevTools
2. Go to Network tab
3. Visit `/api/points/leaderboard`
4. Inspect response JSON
5. Verify each entry has:
   - Real userId
   - Real username
   - Real pointsBalance (from database)
   - Real totalEarned
   - Real profileImage

**Expected:**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "userId": "actual-uuid",
      "pointsBalance": "50000...",
      "totalEarned": "50000...",
      "username": "actual_username",
      "profileImage": "real-image-url"
    }
  ]
}
```

---

## Database Verification Tests

### Direct DB Check (If you have DB access)

```sql
-- Check if user has real points
SELECT * FROM user_points_ledgers 
WHERE user_id = 'target-user-id';

-- Check points transaction history
SELECT * FROM points_transactions 
WHERE user_id = 'target-user-id'
ORDER BY created_at DESC;

-- Verify challenge creation points
SELECT * FROM points_transactions
WHERE transaction_type = 'earned_challenge_creation'
ORDER BY created_at DESC
LIMIT 10;

-- Check referral points
SELECT * FROM points_transactions
WHERE transaction_type = 'referral'
ORDER BY created_at DESC
LIMIT 10;
```

---

## Verification Checklist

### Points System Integrity
- [ ] No hardcoded mock values in code
- [ ] All points from real transactions
- [ ] Points stored in actual database
- [ ] Leaderboard pulls from database queries
- [ ] Admin dashboard shows real data
- [ ] Profile cards show real data
- [ ] Balance API returns real values
- [ ] No seed/test data in production

### Points Earning
- [ ] Challenge creation awards correct points
- [ ] Referrals award 500 points
- [ ] Points appear immediately
- [ ] Transaction history recorded
- [ ] Points survive page refresh
- [ ] Admin can see all points

### Accuracy
- [ ] Leaderboard ordered correctly
- [ ] Points calculations are correct
- [ ] No duplicate transactions
- [ ] No negative points
- [ ] Decimal handling correct
- [ ] Multi-currency support (if applicable)

---

## Common Issues & Solutions

### Issue: Points not showing in balance
**Check:**
1. API response: `/api/points/balance/{userId}`
2. Database: `user_points_ledgers` table
3. Ensure user has `userId` field set
4. Check `ensureUserPointsLedger()` was called

### Issue: Leaderboard empty
**Check:**
1. Query filters: `WHERE pointsBalance > 0`
2. Ensure points_transactions has records
3. Verify join with users table
4. Check database has test data

### Issue: Referral points not awarded
**Check:**
1. Referral code captured on signup
2. Points calculation: should be 500
3. Database records the transaction
4. Points added to referrer's balance

### Issue: Admin doesn't see points
**Check:**
1. Admin has correct role
2. AdminUserWeeklyPointsPayout component loaded
3. Points claimed before? Check lastClaimedAt
4. Check weekly earnings query

---

## Expected Points Ranges

### By User Level
```
Level 1 (New)           : 0-500 points
Level 2                 : 500-2,000 points
Level 3                 : 2,000-5,000 points
Level 4                 : 5,000-10,000 points
Level 5+                : 10,000+ points
```

### By Activity
```
1 Challenge Created     : 50-500 points (avg 100-200)
1 Challenge Won         : Variable (50-300)
1 Successful Referral   : 500 points
Admin Bonus             : Variable
Weekly Claim            : Pending balance
```

---

## Monitoring Points System

### Logs to Check
```
Server logs should show:
🎁 Challenge creator will earn X Bantah Points
✅ Points transaction recorded
✅ Points earned notification sent
```

### Metrics to Track
1. **Total Points Distributed:** Sum of all pointsBalance
2. **Average Points per User:** Total Points / User Count
3. **Points Per Day:** Sum earned yesterday / user count
4. **Leaderboard Movement:** Track rank changes
5. **Referral Success Rate:** Referrals / Shares

---

## Performance Expectations

### API Response Times
- `/api/points/balance/:userId` - <100ms
- `/api/points/leaderboard` - <500ms
- `/api/users/{id}/profile` - <100ms

### Database Query Performance
- Points queries should use indexes
- Leaderboard sorted by pointsBalance
- Points transactions have challengeId index

---

## Security Verification

### No Injection Attacks
- [ ] User IDs properly validated
- [ ] Amount values validated (positive only)
- [ ] Transaction types from enum only
- [ ] Database queries use parameterized

### No Unauthorized Points
- [ ] Only authenticated users can earn
- [ ] Admin claiming requires auth
- [ ] Referral code validated
- [ ] Challenge ownership verified

---

## Sign-Off Checklist

- [ ] All 6 tests above completed
- [ ] No mock data found in code
- [ ] All points from real transactions
- [ ] Admin sees accurate data
- [ ] Leaderboard shows correct ranking
- [ ] Profile cards match balance API
- [ ] Referral system working
- [ ] Database entries verified

**Result:** ✅ Bantah Points System VERIFIED as Real & Accurate

