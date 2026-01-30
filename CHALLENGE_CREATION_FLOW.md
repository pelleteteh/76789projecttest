# Complete Challenge Creation Flow

## Overview
When a user creates a challenge, the system performs an **off-chain smart contract interaction** followed by **off-chain database and points tracking**.

---

## Step-by-Step Flow

### 1. Frontend: User Submits Challenge Form
- User fills out: Title, Amount, Token (ETH/USDC/USDT), Challenge Type (open/direct), Side (YES/NO), Optional Description
- Form data stored in state: `createFormData`

### 2. Frontend: Client-Side Blockchain Interaction
**File:** `client/src/hooks/useBlockchainChallenge.ts`

```typescript
createP2PChallenge({
  opponentAddress,       // 0x0... for open, opponent wallet for direct
  stakeAmount,           // Wei value (e.g., 8000000000000 for 0.000008 ETH)
  paymentToken,          // 0x0... for ETH, USDC/USDT contract address for tokens
  pointsReward,          // "500" points
  metadataURI            // 'ipfs://...'
})
```

**What Happens:**
1. User signs transaction in wallet (MetaMask/Privy)
2. Contract: `ChallengeFactory.createP2PChallenge()` is called
3. Stake is transferred to `ChallengeEscrow` contract
4. **On-chain challenge is created** with unique ID
5. Transaction receipt obtained with:
   - `transactionHash`
   - `blockNumber`
   - `status: 'success'`

### 3. Frontend: Post-Transaction API Call
**File:** `client/src/pages/Challenges.tsx` (Challenges mutation)

**Authorization:**
```typescript
const token = await getAccessToken();  // Get Privy JWT token
headers: { 'Authorization': `Bearer ${token}` }
```

**Request to:** `POST /api/challenges/create-p2p`

**Data Sent:**
```json
{
  "title": "Challenge Title",
  "description": "Optional description",
  "opponentId": "did:privy:..." or "",
  "stakeAmount": "0.000008",  // Human-readable amount
  "paymentToken": "0x0000...", // ETH zero address or token address
  "dueDate": "2026-01-28T...",
  "metadataURI": "ipfs://...",
  "challengeType": "open" or "direct",
  "transactionHash": "0xabc123...",
  "side": "YES" or "NO",
  "coverImage": File or null
}
```

---

## Backend Processing

### 4. Backend: Authentication
**File:** `server/privyAuth.ts` (PrivyAuthMiddleware)

1. Extract `Authorization: Bearer <token>` header
2. Verify JWT signature with Privy
3. Extract `userId` from claims
4. Upsert user in database
5. Attach user to request: `req.user.id`

**Failure Case:** Returns `401 Unauthorized`

### 5. Backend: Create Challenge in Database
**File:** `server/routes/api-challenges.ts` → `POST /api/challenges/create-p2p`

**Input Validation:**
- ✅ userId extracted (from auth)
- ✅ stakeAmount parsed as `parseFloat()` (handles decimals like "0.000008")
- ✅ Detect token type:
  - ETH (18 decimals) if `paymentToken === '0x0000...'`
  - USDC/USDT (6 decimals) otherwise

**Points Calculation:**
```typescript
const stakeAmountUSD = parseFloat(stakeAmount);  // 0.000008
const creationPoints = Math.min(50 + (stakeAmountUSD * 5), 500);  // Min 50, Max 500
// For 0.000008: 50 + (0.000008 * 5) = 50.00004 ≈ 50 points
```

**Database Insert:**
```typescript
challenges.insert({
  title,
  description,
  category: 'p2p',
  amount: Math.floor(parseFloat(stakeAmount) * 2),
  status: transactionHash ? 'active' : 'pending',
  challenger: userId,
  challenged: opponentId || null,
  challengerSide: side,
  dueDate,
  paymentTokenAddress: paymentToken,
  stakeAmountWei: BigInt(ethers.parseUnits(stakeAmount, tokenDecimals)),
  creatorTransactionHash: transactionHash,
  pointsAwarded: creationPoints,
  coverImageUrl,
  onChainStatus: 'submitted'
})
```

**Result:** Challenge created with status `'active'`

### 6. Backend: Award Creation Points
**Function:** `recordPointsTransaction()`
**File:** `server/blockchain/db-utils.ts`

**What It Does:**
1. Create entry in `points_transactions` table:
   - userId
   - challengeId
   - transactionType: `'earned_challenge_creation'`
   - amount: `BigInt(creationPoints * 1e18)`
   - reason: `"Created p2p challenge: '${title}'"`
   - blockchainTxHash: `transactionHash`

2. Update `user_points_ledgers` table:
   - pointsBalance += creationPoints
   - lastClaimedAt: now

3. Calculate what user can claim next week

### 7. Backend: Send Notifications

#### 7a. Points Earned Notification (Creator)
**Function:** `notifyPointsEarnedCreation()`

Sends to creator:
```
"🎁 You earned 50 Bantah Points for creating a challenge!"
```

Channels: IN_APP, PUSH (Firebase)

#### 7b. Challenge Notification (Opponent - Direct Only)
**For Direct P2P Challenges:**

Sends to opponent:
```
"🎯 [Challenger Name] challenged you!"
"[Challenger Name] challenged you to: '[Title]'"
```

Channels: IN_APP, PUSH

#### 7c. Telegram Broadcast
Broadcasts to Telegram group (if enabled):
```
"New ${type} challenge created!
Title: [Title]
Creator: [Username]
Amount: [Stake] [Token]"
```

### 8. Backend: Return Response
```json
{
  "success": true,
  "challengeId": 12345,
  "title": "Challenge Title",
  "type": "open" or "p2p",
  "opponent": null or "opponent_id",
  "stakeAmount": "0.000008",
  "pointsAwarded": 50,
  "message": "Open challenge created. You earned 50 Bantah Points!"
}
```

---

## Frontend: Post-Success Actions

### 9. Frontend: Update UI
**Location:** `onSuccess` callback in mutation

1. ✅ Show success toast
2. ✅ **Invalidate query cache** for `/api/challenges`
   - Triggers refetch of `GET /api/challenges/public`
3. ✅ Close create dialog
4. ✅ Reset form data
5. ✅ Challenge appears in list immediately

### 10. User Sees Challenge in List
**Location:** `Challenges.tsx` → useQuery hooks challenge list
- Fetches from `GET /api/challenges/public`
- Filters for status: `'open'`, `'active'`, `'pending'`, `'completed'`
- Displays in challenge cards

---

## Points and Activities

### What Updates Automatically

1. **Wallet Page** (`WalletPage.tsx`)
   - Fetches `/api/points/balance/:userId`
   - Shows updated points balance
   - Shows "Points earned!" notification

2. **Leaderboard** (`Leaderboard.tsx`)
   - Fetches `/api/points/leaderboard`
   - User's rank updates (sorted by pointsBalance DESC)

3. **Activities/Feed**
   - Challenge creation logged in `points_transactions`
   - Can be displayed in user activity feed if implemented

4. **Notifications**
   - In-app: Shown in notification panel
   - Push: Sent to device (Firebase)
   - Both include creator earning points

---

## Potential Failure Points

| Step | Issue | Solution |
|------|-------|----------|
| 1 | User doesn't fill title | Form validation |
| 2 | Wallet not connected | Check `useAuth()` hook |
| 2 | User rejects tx | Show error toast, allow retry |
| 3 | Auth token expired | `getAccessToken()` refreshes automatically |
| 4 | Invalid JWT | Redirect to login |
| 5 | Stake amount parsing fails | Using `parseFloat()` now handles decimals |
| 5 | Token decimals wrong | Detect ETH (18) vs USDC/USDT (6) |
| 6 | Points DB error | Caught, doesn't fail challenge creation |
| 7 | Notification service down | Caught, doesn't fail challenge creation |
| 10 | Cache not invalidated | Check `queryClient.invalidateQueries()` |

---

## Verification Checklist

After creating a challenge:

- [ ] Transaction appears on BaseScan (✅ happens on-chain)
- [ ] Challenge appears in `/api/challenges/public` (check DB query)
- [ ] Challenge shows in UI list (cache invalidated)
- [ ] Creator's points increased (check `user_points_ledgers`)
- [ ] Points transaction logged (check `points_transactions`)
- [ ] Opponent receives notification (if direct - check in-app)
- [ ] Creator receives points notification (check in-app)
- [ ] Leaderboard rank updated (if earned points)

---

## Testing Command

```bash
# Check challenge in database
psql $DATABASE_URL -c "SELECT id, title, challenger, status, created_at FROM challenges ORDER BY created_at DESC LIMIT 1;"

# Check points awarded
psql $DATABASE_URL -c "SELECT user_id, amount, transaction_type FROM points_transactions WHERE user_id = 'did:privy:...' ORDER BY created_at DESC LIMIT 3;"

# Check user points balance
psql $DATABASE_URL -c "SELECT user_id, points_balance FROM user_points_ledgers WHERE user_id = 'did:privy:...';"
```
