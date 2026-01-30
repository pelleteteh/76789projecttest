# Challenge Creation System - Verification Checklist

Use this checklist to verify each component is working correctly.

---

## Prerequisites

- [ ] Server running: `npm run dev`
- [ ] Database connected: `psql $DATABASE_URL -c "SELECT 1"`
- [ ] User logged in with Privy
- [ ] Wallet connected to Base Sepolia testnet
- [ ] Have at least 0.001 ETH in wallet for gas

---

## Component 1: Blockchain (On-Chain)

**Tests if:** Smart contract can create challenges on-chain

```bash
# After creating a challenge, get the transaction hash from browser console
# Then check BaseScan

curl "https://sepolia-api.basescan.org/api?module=proxy&action=eth_getTransactionByHash&txhash=0xYOUR_TX_HASH&apikey=YourApiKey"
```

**Checklist:**
- [ ] Transaction appears on BaseScan
- [ ] Method shows "Create P2P Chall..." (truncated)
- [ ] From address = your wallet
- [ ] To address = 0xcc457aA3... (ChallengeFactory)
- [ ] Amount = your stake (in ETH)
- [ ] Status = Success (green checkmark)

**If Fails:** Blockchain/wallet issue, not API issue

---

## Component 2: Frontend (Browser)

**Tests if:** Frontend is correctly making the API call

Open Browser DevTools → Console and look for:

```
🔐 About to call /api/challenges/create-p2p
   Token received: [Yes/No]
   ✓ Authorization header will be sent
```

**Checklist:**
- [ ] `Token received: Yes` (if No, user not logged in)
- [ ] Authorization header logged
- [ ] `Sending request body with:` shows title, stakeAmount, paymentToken, transactionHash
- [ ] `📡 API Response Status: 200 OK` appears

**If Fails:** Check browser console for errors, see [DEBUG_GUIDE.md](DEBUG_GUIDE.md)

---

## Component 3: API (Backend)

**Tests if:** Backend API endpoint is being called and processing request

Check server logs for:

```bash
grep "POST /api/challenges/create-p2p" /tmp/full-server.log
```

Should show:
```
📨 POST /api/challenges/create-p2p
✓ Auth successful - userId: did:privy:...
✓ Request received with:
  - title: [Title]
  - stakeAmount: [Amount]
  - paymentToken: [Token]
  - transactionHash: [TX Hash]
```

**Checklist:**
- [ ] `POST /api/challenges/create-p2p` appears in logs
- [ ] `Auth successful` message (if not, auth middleware failed)
- [ ] `Request received with:` shows all fields
- [ ] No `❌ Error` message

**If Fails:** Authentication or request parsing issue

---

## Component 4: Database (Insert)

**Tests if:** Challenge is being saved to database

Check server logs for:
```bash
grep "Challenge created in DB\|✅✅✅ SUCCESS" /tmp/full-server.log
```

Should show:
```
✅ p2p challenge created in DB: 12345
✅ Points awarded and notification sent to creator
✅✅✅ SUCCESS - Sending response to frontend
   challengeId: 12345
   title: [Title]
   pointsAwarded: 50
```

**Also verify in database:**
```bash
psql $DATABASE_URL -c "SELECT id, title, status FROM challenges ORDER BY created_at DESC LIMIT 1;"
```

**Checklist:**
- [ ] Server logs show "Challenge created in DB: [ID]"
- [ ] Server logs show "SUCCESS - Sending response"
- [ ] Database query returns 1 row
- [ ] Challenge title matches what you entered
- [ ] Status = "active" (or "open", "pending")

**If Fails:** Database connection or insert issue

---

## Component 5: Points Awarding

**Tests if:** Creator points are being awarded

Check server logs for:
```bash
grep "Bantah Points\|Points awarded" /tmp/full-server.log | tail -5
```

Should show:
```
🎁 Challenge creator will earn 50 Bantah Points
✅ Points awarded and notification sent to creator
```

**Also verify in database:**
```bash
psql $DATABASE_URL -c "SELECT user_id, transaction_type, amount FROM points_transactions WHERE transaction_type = 'earned_challenge_creation' ORDER BY created_at DESC LIMIT 1;"
```

**Checklist:**
- [ ] Server logs show "Challenge creator will earn X Bantah Points"
- [ ] Points calculation looks correct (50 + (amount * 5), MAX 500)
- [ ] Points transaction appears in database
- [ ] transaction_type = "earned_challenge_creation"
- [ ] amount = points * 1e18 (in wei)

**If Fails:** Points calculation or database issue

---

## Component 6: Notifications

**Tests if:** Notifications are being sent

Check server logs for:
```bash
grep "Notification\|notif" /tmp/full-server.log | tail -10
```

Should show:
```
📬 Notification sent to opponent [ID]
```
or
```
📢 Open challenge created - available for anyone to join
```

**Also check in-app:**
- [ ] Notification panel shows points earned notification
- [ ] For direct P2P: Opponent receives challenge notification

**If Fails:** Notification service issue (non-critical, doesn't block challenge creation)

---

## Component 7: API List Endpoint

**Tests if:** API returns the challenge in the list

```bash
curl http://localhost:5000/api/challenges/public | jq '.[] | select(.title | contains("Your Title"))'
```

Should return:
```json
{
  "id": 12345,
  "title": "Your Title",
  "status": "active",
  "challenger": "did:privy:...",
  ...
}
```

**Checklist:**
- [ ] API endpoint responds with 200 OK
- [ ] Challenge appears in the array
- [ ] Status is "active", "open", "pending", or "completed"
- [ ] Challenger is your user ID
- [ ] Title matches what you entered

**If Fails:** Database query or API response issue

---

## Component 8: Frontend Display

**Tests if:** Challenge shows in the UI

1. Refresh the Challenges page (F5)
2. Look for your challenge in the list

**Checklist:**
- [ ] Challenge card appears
- [ ] Title matches
- [ ] Type shows "Open" or "P2P"
- [ ] Amount shows correctly
- [ ] Can click on it to see details

**If Fails:** Frontend query or caching issue

---

## Full Test Scenario

Follow these steps in order:

1. **Start Server**
   ```bash
   npm run dev 2>&1 | tee /tmp/test.log &
   ```

2. **Create Challenge**
   - Open http://localhost:5173/challenges
   - Click "Create Challenge"
   - Enter title, amount, select type
   - Sign wallet tx
   - Wait for confirmation

3. **Verify Each Component**
   - ✅ Check browser console for logs
   - ✅ Check server logs for API call
   - ✅ Query database for challenge
   - ✅ Query API endpoint for list
   - ✅ Check UI shows challenge

4. **If Any Step Fails**
   - Identify which component failed
   - Check corresponding section above
   - See [DEBUG_GUIDE.md](DEBUG_GUIDE.md) for detailed debugging

---

## Quick Diagnostic Commands

```bash
# Everything at once
echo "=== BROWSER ===" && \
echo "Check console for: Token received: Yes, 📡 API Response Status: 200 OK, ✅ Challenge created" && \
echo "" && \
echo "=== SERVER ===" && \
tail -50 /tmp/full-server.log | grep -E "POST /api/challenges/create-p2p|Auth|Challenge created|❌" && \
echo "" && \
echo "=== DATABASE ===" && \
psql $DATABASE_URL -c "SELECT COUNT(*) FROM challenges WHERE status IN ('active','open','pending','completed');" && \
echo "" && \
echo "=== API ===" && \
curl -s http://localhost:5000/api/challenges/debug/status | jq '.publicCount' && \
echo "public challenges in API"
```

---

## Success Indicators

✅ **Everything Working if you see:**
- Browser: `✅ Challenge created successfully`
- Server: `✅✅✅ SUCCESS - Sending response`
- Database: New row with status 'active'
- API: `publicCount` increased
- UI: Challenge shows in list

❌ **Something Failed if:**
- Browser: No success log, or error message shown
- Server: `❌ FAILED TO CREATE` or `Error`
- Database: No new row, or status is not 'active'/'open'/'pending'/'completed'
- API: `publicCount` unchanged
- UI: Challenge doesn't show after refresh

---

## Need Help?

1. Check [DEBUG_GUIDE.md](DEBUG_GUIDE.md) for detailed debugging
2. Run all diagnostic commands above
3. Identify which component fails
4. Share that component's output with the team

Each component's output will tell us exactly where the issue is!
