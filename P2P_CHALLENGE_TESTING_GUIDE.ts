/**
 * P2P Challenge Testing Guide for Base Sepolia
 * 
 * This file documents how to test the complete P2P challenge flow
 * including blockchain transaction signing and acceptance
 */

// ===========================================================================
// 1. PRE-REQUISITES
// ===========================================================================

/*
✅ Requirements before testing:
- Two user accounts authenticated via Privy
- Both users need connected wallets (Privy embedded wallets)
- Both users need test USDC on Base Sepolia (from faucet)
- Contract addresses deployed on Base Sepolia:
  - POINTS: 0x569F91eAff17e80F8E6B8f68084818744C34d3eA
  - ESCROW: 0x37f6f71EfC2Ea3895E76513d4eC06C41554FD948
  - FACTORY: 0xEB38Cfd6a9Ad4D07b58A5596cadA567E37870e11
  - USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b3566dA8860
*/

// ===========================================================================
// 2. TEST FLOW: CREATE P2P CHALLENGE
// ===========================================================================

/*
Flow:
1. User A (Challenger) logs in ✓
2. Goes to /friends page
3. Searches for User B (Friend) 
4. Clicks "Challenge" button on Friend card
5. Challenge Modal Opens:
   - Fill in: Title, Description, Category, Amount, Due Date
6. Click "Challenge" button
7. Backend Flow:
   ✓ Stores challenge in DB with status="pending"
   ✓ Returns challengeId
8. Frontend Blockchain Flow:
   - Shows "Preparing blockchain transaction..."
   - Calls createP2PChallenge() hook
   - Privy wallet prompts for signature
   - User confirms transaction
   - Contract call: createP2PChallenge(opponentId, token, amount, points, metadataURI)
   - Event: ChallengeCreatedP2P emitted
   - Receipt captured: transactionHash, blockNumber
9. UI Feedback:
   ✓ Shows success toast with transaction hash
   ✓ Modal closes
   ✓ Challenge list refreshes
*/

// Expected Console Logs:
/*
🔗 Creating P2P challenge from 0x...
📝 Transaction details:
   Opponent: 0x...
   Stake: 100000000 wei
   Token: 0x833589...
   Points: 500
💳 Awaiting user to sign transaction...
⏳ Transaction submitted: 0xabc123...
✅ P2P challenge created on-chain!
   TX: 0xabc123...
   Block: 12345
*/

// ===========================================================================
// 3. TEST FLOW: ACCEPT P2P CHALLENGE
// ===========================================================================

/*
Flow:
1. User B (Opponent) logs in ✓
2. Views the pending challenge (appears in /challenges or notified)
3. Sees status badge: "Pending"
4. Clicks "Accept" button
5. AcceptChallengeModal Opens:
   - Shows: Challenger avatar, challenge title, category, stake amount
   - Shows: Challenge description
6. Click "Accept Challenge" button
7. Frontend Blockchain Flow:
   - Shows "Accepting Challenge, Preparing transaction..."
   - Calls acceptP2PChallenge() hook
   - Privy wallet prompts for signature
   - User confirms transaction
   - Contract call: acceptP2PChallenge(challengeId)
   - Event: ChallengeAcceptedP2P emitted
   - Both stakes now in escrow
   - Challenge status: ACTIVE
8. UI Feedback:
   ✓ Shows success: "✓ Accepted"
   ✓ Shows transaction hash
   ✓ Modal auto-closes after 2 seconds
   ✓ Challenge updates to "Active" status
*/

// Expected Console Logs:
/*
🔗 Accepting P2P challenge 123...
💳 Awaiting user to sign transaction...
⏳ Transaction submitted: 0xdef456...
✅ P2P challenge accepted on-chain!
   TX: 0xdef456...
*/

// ===========================================================================
// 4. ERROR HANDLING TESTS
// ===========================================================================

/*
Test Scenario: User Cancels Signature
- Click "Accept Challenge"
- In wallet popup, click "Cancel" or "Reject"
- Expected: 
  ✓ User sees error toast: "You cancelled the transaction"
  ✓ Modal stays open
  ✓ Can retry clicking "Accept Challenge" again
  ✓ No "Retrying" state shown (user rejection doesn't retry)

Test Scenario: Network Error During Submission
- Disable network or simulate network error
- Click "Accept Challenge"
- Expected:
  ✓ First attempt fails
  ✓ Shows "Retrying transaction..." with spinner
  ✓ Retries automatically (3 attempts total)
  ✓ Each retry waits 2 seconds
  ✓ If all fail: Error message shown
  ✓ Can manually retry by clicking button again

Test Scenario: Insufficient Gas
- Create challenge with very high amount
- User has insufficient ETH for gas
- Expected:
  ✓ Wallet shows "Insufficient balance for gas"
  ✓ Toast shows error about gas
  ✓ Can retry after topping up gas
*/

// ===========================================================================
// 5. STATE TRACKING TESTS
// ===========================================================================

/*
Database States:
- Challenge created: status="pending", adminCreated=false, onChainStatus="pending"
- Challenge accepted: status="active", onChainStatus="created"
- Challenge resolved: status="completed", onChainStatus="resolved"

UI Status Badges:
- ⏱️ Pending: Yellow badge "Pending" (waiting for opponent to accept)
- ⚡ Active: Blue badge "Active" (both parties have staked)
- ✓ Completed: Green badge "Completed" (resolved by admin)

Visible Changes:
✓ After User A creates: Appears in User B's notifications
✓ After User B accepts: Both see status change to "Active"
✓ Chat/messaging becomes available
✓ Countdown timer starts (if dueDate set)
*/

// ===========================================================================
// 6. BLOCKCHAIN VERIFICATION
// ===========================================================================

/*
To verify on Basescan (Sepolia):
1. Copy transaction hash from success message
2. Visit: https://sepolia.basescan.org/tx/{txHash}
3. Verify:
   ✓ Status: Success
   ✓ To: ChallengeFactory contract address
   ✓ Input Data contains function selector for createP2PChallenge or acceptP2PChallenge
   ✓ Events logged: ChallengeCreatedP2P or ChallengeAcceptedP2P

Contract Events to Look For:
- ChallengeCreatedP2P(challengeId, creator, participant, token, stakeAmount, pointsReward)
- ChallengeAcceptedP2P(challengeId, participant)
- StakeLocked(participant, token, amount, challengeId)
*/

// ===========================================================================
// 7. MONITORING & LOGS
// ===========================================================================

/*
Open Browser DevTools (F12):
- Console tab: Shows all blockchain operation logs
- Network tab: Monitor API calls to /api/challenges/create-p2p
- Application/Storage: Check localStorage for any cached states

Key Log Lines to Look For:
- "🔗 Creating P2P challenge from..." - Start of creation
- "💳 Awaiting user to sign transaction..." - Wallet popup should appear
- "✅ P2P challenge created on-chain!" - Transaction succeeded
- "🔄 Create P2P Challenge attempt N/3" - Retry in progress
- "❌ All 3 attempts failed" - Max retries exceeded

API Response Format:
POST /api/challenges/create-p2p
Response: {
  "success": true,
  "challengeId": 123,
  "title": "Who's better at crypto?",
  "opponent": "user-id-2",
  "stakeAmount": "100",
  "message": "Challenge created. User must sign transaction to activate."
}
*/

// ===========================================================================
// 8. QUICK TEST CHECKLIST
// ===========================================================================

/*
☐ User A can create P2P challenge to User B
☐ Challenge appears in DB immediately
☐ User A sees wallet popup to sign transaction
☐ Transaction succeeds on Base Sepolia
☐ User A sees success toast with TX hash
☐ User B receives notification
☐ User B can see "Accept" option on challenge
☐ User B can click "Accept Challenge"
☐ Accept modal shows correct challenge details
☐ User B sees wallet popup to accept
☐ User B's transaction succeeds
☐ Both see challenge status change to "Active"
☐ Challenge appears in both users' active challenges
☐ If User A cancels wallet: Graceful error, can retry
☐ If User A rejects: Error message shown
☐ If network fails: Auto-retry 3 times
☐ Stake amounts correctly converted to wei
☐ USDC token address correct (0x833589...)
*/

// ===========================================================================
// 9. DEBUGGING TIPS
// ===========================================================================

/*
If Challenge Creation Fails:
1. Check .env.local has correct contract addresses
2. Verify VITE_CHALLENGE_FACTORY_ADDRESS matches deployed contract
3. Check user wallet has USDC balance > stake amount
4. Verify opponent address is valid
5. Check browser console for specific error

If Wallet Won't Sign:
1. Ensure Privy is initialized (check PrivyProvider in App.tsx)
2. Verify getEthereumProvider() returns valid provider
3. Check if user has embedded wallet created (auto-creates on first login)
4. Try clearing browser cache and re-logging in

If Transaction Hangs:
1. Check Base Sepolia RPC is accessible
2. Verify gas prices aren't too high
3. Check if network has been switched (should be Sepolia)
4. Look for "Transaction dropped" in wallet - may need to resend

If Challenge Doesn't Appear:
1. Refresh page (Ctrl+Shift+R for hard refresh)
2. Check user B's notifications
3. Verify both users in same organization/friends
4. Check database directly: SELECT * FROM challenges WHERE id = X;
5. Verify API calls succeeded (check Network tab in DevTools)
*/

export const P2P_CHALLENGE_TESTING_GUIDE = "See comments above";
