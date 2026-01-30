# Challenge Creation Testing Guide

## What Was Fixed

1. **✅ Auth Token Issue**
   - Frontend now calls `getAccessToken()` and sends `Authorization: Bearer <token>`
   - PrivyAuthMiddleware validates token and extracts userId

2. **✅ Stake Amount Parsing**
   - Changed backend from `parseInt()` to `parseFloat()`
   - Now handles decimal amounts like "0.000008 ETH"

3. **✅ Token Decimals**
   - Backend detects native ETH (18 decimals) vs USDC/USDT (6 decimals)
   - Correctly converts human-readable amounts to wei

4. **✅ Description Field**
   - Added description field to frontend form
   - Frontend sends description to backend

5. **✅ Error Logging**
   - Frontend now logs detailed API response and error info
   - Better debugging when API calls fail

---

## Test Steps

### 1. Start Fresh Server
```bash
pkill -f "npm run dev"
cd /workspaces/56yhggy6
npm run dev
```

Wait for:
```
✅ Server running on port 5000
✅ Blockchain initialized successfully
📋 Contract Addresses:
   Factory: 0xcc457aA3A7516bC817C6Cd0fB5B78e21aDc69390
   Escrow: 0x5838E60714f75d21f0f1E7f95a289Fd5ed3FD60d
```

### 2. Create Open Challenge
1. Go to `/challenges`
2. Click "Create Challenge"
3. Fill in:
   - **Title:** "Test Open Challenge"
   - **Description:** "Testing the full flow"
   - **Amount:** 0.000008 (small amount for testing)
   - **Token:** ETH
   - **Type:** Open
4. Click "Create"
5. **Sign in wallet** when prompted

### 3. Watch Browser Console
Look for these logs (in order):

```
📝 Creating ETH challenge:
   Amount: 0.000008 ETH
   Stake (wei): 8000000000000
   Decimals: 1000000000000000000

🔄 Create P2P Challenge attempt 1/3
💳 Awaiting user to sign transaction...
✅ Sending 8000000000000 wei as transaction value
⏳ Transaction submitted: 0x...
✅ P2P challenge created on-chain!
   TX: 0x...
   Block: 36862...

📡 API Response Status: 200 OK
🔐 Auth header sent: Yes
✅ Challenge created successfully: { challengeId: 123, ... }
```

### 4. Check Challenge in DB
```bash
psql $DATABASE_URL -c "
  SELECT id, title, challenger, status, created_at FROM challenges 
  ORDER BY created_at DESC LIMIT 3;
"
```

Expected: New challenge with status `'active'` and `created_at` = now

### 5. Check Points Awarded
```bash
# Replace 'YOUR_USER_ID' with the user's Privy ID
psql $DATABASE_URL -c "
  SELECT * FROM points_transactions 
  WHERE user_id = 'did:privy:YOUR_USER_ID' 
  ORDER BY created_at DESC LIMIT 5;
"
```

Expected: Entry with `transaction_type = 'earned_challenge_creation'` and `amount = 50000000000000000000` (50 * 1e18)

### 6. Check Challenge in List
```bash
# After creating, refresh the page or wait for auto-refetch
# The challenge should appear in the list
```

Expected: Challenge title appears in the challenge cards list

---

## What Happens Behind the Scenes

### If Everything Works ✅

1. **On-Chain:**
   - Challenge recorded in ChallengeFactory contract
   - Stake transferred to ChallengeEscrow
   - Transaction confirms in ~15 seconds on Base Sepolia

2. **Off-Chain:**
   - Challenge saved to database with `status: 'active'`
   - Points transaction recorded (50 points for creation)
   - User's points balance increased
   - Creator receives in-app notification

3. **Frontend:**
   - Query cache invalidated
   - Challenge list refetched
   - New challenge appears in UI
   - Toast shows: "Challenge Created! You earned 50 Bantah Points!"

### If It Fails ❌

Look for these error logs in browser console:

```
❌ API Response Status: 401 Unauthorized
   → Auth token missing or invalid
   → Check: User logged in? getAccessToken() works?

❌ API Response Status: 400
   → Missing required field
   → Check: stakeAmount, paymentToken, title sent?

❌ API Response Status: 500
   → Backend error
   → Check: Server logs for details
```

---

## Common Issues & Solutions

### Challenge on BaseScan but Not in App

**Problem:** Transaction succeeds on-chain but challenge doesn't show in list

**Checklist:**
1. Are you seeing the API call in Network tab?
   - Open DevTools → Network → Filter "create-p2p"
   - Should see `POST` request with status 200

2. Check browser console for:
   ```
   📡 API Response Status: 200 OK
   ✅ Challenge created successfully
   ```
   
3. If response is 401:
   - Auth token not being sent
   - Check: `🔐 Auth header sent: Yes`
   - If No: `getAccessToken()` might be failing

4. If response is 400:
   - Missing field in request
   - Check: `requestBody.append()` calls all present

5. If response is 500:
   - Server error - check server logs:
   ```bash
   npm run dev 2>&1 | grep -E "Error|failed|Failed"
   ```

### Points Not Awarded

**Problem:** Challenge created but no points earned

**Checklist:**
1. Check database:
   ```bash
   psql $DATABASE_URL -c "
     SELECT * FROM points_transactions 
     WHERE transaction_type = 'earned_challenge_creation' 
     LIMIT 5;"
   ```

2. If no results: Check server logs for points error
   ```
   console.warn('Failed to award creation points:', pointsError);
   ```

3. Points function has `.catch()` so it won't fail challenge creation
   - But should log the error

### Challenge Shows in BaseScan but Wrong Amount

**Problem:** Challenge shows on-chain with different stake than in database

**Why:** ETH has 18 decimals, USDC/USDT have 6
- Frontend converts: `0.000008 * 1e18 = 8000000000000` wei
- Backend converts back: `parseFloat("0.000008")` = 0.000008

The amounts should match (accounting for decimal conversion).

---

## Performance Expectations

| Action | Time |
|--------|------|
| User signs tx | ~5-10 sec |
| TX on-chain | ~15 sec (Base Sepolia) |
| API call | ~500ms |
| Query refetch | ~200ms |
| List updates | Immediate (within 100ms) |

Total end-to-end: ~20-30 seconds

---

## Next Steps if Issues Persist

1. **Capture Full Logs:**
   ```bash
   npm run dev > /tmp/server.log 2>&1 &
   # Create challenge
   cat /tmp/server.log | grep -A 20 "POST /api/challenges/create-p2p"
   ```

2. **Check Database Directly:**
   ```bash
   psql $DATABASE_URL
   > \dt  # List tables
   > SELECT * FROM challenges WHERE created_at > NOW() - INTERVAL '5 min' ORDER BY created_at DESC;
   > SELECT * FROM points_transactions WHERE created_at > NOW() - INTERVAL '5 min';
   ```

3. **Test API Directly:**
   ```bash
   curl -X POST http://localhost:5000/api/challenges/create-p2p \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"title": "Test", "stakeAmount": "1", "paymentToken": "0x0", ...}'
   ```

---

## Success Indicators

✅ **All Good if you see:**
- Challenge hash on BaseScan
- Challenge title in app list
- Points increased in wallet
- Notification received (in-app)
- Entry in `challenges` table
- Entry in `points_transactions` table
- Entry in `user_points_ledgers` updated
