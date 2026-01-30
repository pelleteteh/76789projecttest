# Phase 4: API Routes - REST Endpoints

Complete REST API for blockchain-integrated challenge system with on-chain settlement.

## Overview

Phase 4 creates REST endpoints to:
1. Create and join challenges
2. Claim payouts
3. Manage points & leaderboard
4. Admin resolution with cryptographic signatures
5. Wallet management

## API Architecture

```
┌─────────────────────────────────────────────────┐
│         REST API Endpoints (Phase 4)            │
├─────────────────────────────────────────────────┤
│ Challenge Operations                            │
│  - POST   /api/challenges/create-admin          │
│  - POST   /api/challenges/create-p2p            │
│  - POST   /api/challenges/:id/join              │
│  - POST   /api/challenges/:id/accept            │
│  - GET    /api/challenges/:id                   │
│  - GET    /api/challenges                       │
│                                                 │
│ Payouts                                         │
│  - POST   /api/payouts/:challengeId/claim       │
│  - GET    /api/payouts/:challengeId/status      │
│  - POST   /api/payouts/batch-claim              │
│                                                 │
│ Points & Leaderboard                            │
│  - GET    /api/points/balance/:userId           │
│  - POST   /api/points/transfer                  │
│  - GET    /api/points/leaderboard               │
│  - GET    /api/points/history/:userId           │
│                                                 │
│ Admin Resolution                                │
│  - POST   /api/admin/challenges/resolve         │
│  - POST   /api/admin/challenges/batch-resolve   │
│  - GET    /api/admin/challenges/pending         │
│                                                 │
│ Wallets                                         │
│  - POST   /api/points/connect-wallet            │
│  - GET    /api/points/wallets                   │
│  - POST   /api/points/set-primary-wallet/:id    │
└─────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────┐
│    Blockchain Service Layer (Phase 2)           │
│  - helpers.ts (contract interactions)           │
│  - signing.ts (admin signatures)                │
│  - client.ts (ethers.js setup)                  │
└─────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────┐
│    Database Layer (Phase 3)                     │
│  - db-utils.ts (database operations)            │
│  - schema-blockchain.ts (tables & types)        │
└─────────────────────────────────────────────────┘
```

## Files Created

### 1. **server/routes/api-challenges.ts** (300 lines)
Challenge creation and joining endpoints.

**Endpoints:**
- `POST /api/challenges/create-admin` - Create betting pool
- `POST /api/challenges/create-p2p` - Create user-to-user challenge
- `POST /api/challenges/:id/join` - Join admin challenge
- `POST /api/challenges/:id/accept` - Accept P2P challenge
- `GET /api/challenges/:id` - Get challenge details
- `GET /api/challenges` - List challenges (with filters)
- `GET /api/challenges/user/:userId` - Get user's challenges

### 2. **server/routes/api-payouts.ts** (200 lines)
Payout claim endpoints.

**Endpoints:**
- `POST /api/payouts/:challengeId/claim` - Claim winnings
- `GET /api/payouts/:challengeId/status` - Get payout status
- `GET /api/payouts/user/:userId` - Get user's payouts
- `POST /api/payouts/batch-claim` - Claim multiple payouts

### 3. **server/routes/api-points.ts** (350 lines)
Points and leaderboard endpoints.

**Endpoints:**
- `GET /api/points/balance/:userId` - Get points balance
- `POST /api/points/transfer` - Transfer points
- `GET /api/points/leaderboard` - Global leaderboard
- `GET /api/points/leaderboard/:userId` - User rank & stats
- `GET /api/points/history/:userId` - Points transaction history
- `GET /api/points/statistics` - Global statistics
- `POST /api/points/connect-wallet` - Connect blockchain wallet
- `GET /api/points/wallets` - Get user's wallets
- `POST /api/points/set-primary-wallet/:walletId` - Set primary wallet

### 4. **server/routes/api-admin-resolve.ts** (250 lines)
Admin challenge resolution endpoints.

**Endpoints:**
- `POST /api/admin/challenges/resolve` - Resolve single challenge
- `POST /api/admin/challenges/batch-resolve` - Batch resolve
- `GET /api/admin/challenges/pending` - Get pending challenges
- `GET /api/admin/challenges/by-status/:status` - Filter by status
- `GET /api/admin/blockchain/signing-stats` - Get signing status
- `POST /api/admin/challenges/verify-resolution` - Verify signature
- `GET /api/admin/challenges/:id/resolution-history` - Get history

## API Endpoints Reference

### Challenge Creation

**Create Admin Challenge (Betting Pool)**
```http
POST /api/challenges/create-admin
Content-Type: application/json
Authorization: Bearer <user_token>

{
  "title": "Will ETH go above $2000?",
  "description": "Predict Ethereum price movement",
  "category": "crypto",
  "stakeAmount": "1",
  "paymentToken": "0x833589fCD6eDb6E08f4c7C32D4f71b3566dA8860",
  "metadataURI": "ipfs://QmHash..."
}

Response: 200 OK
{
  "success": true,
  "challengeId": 123,
  "transactionHash": "0x1234...",
  "blockNumber": 5678910,
  "title": "Will ETH go above $2000?"
}
```

**Create P2P Challenge**
```http
POST /api/challenges/create-p2p
Content-Type: application/json
Authorization: Bearer <user_token>

{
  "opponentId": "user456",
  "title": "Gaming Challenge",
  "description": "First to reach level 50",
  "stakeAmount": "2",
  "paymentToken": "0x833589fCD6eDb6E08f4c7C32D4f71b3566dA8860",
  "metadataURI": "ipfs://QmHash..."
}

Response: 200 OK
{
  "success": true,
  "challengeId": 124,
  "transactionHash": "0x5678...",
  "opponent": "user456",
  "stakeAmount": "2"
}
```

### Joining Challenges

**Join Admin Challenge**
```http
POST /api/challenges/123/join
Content-Type: application/json
Authorization: Bearer <user_token>

{
  "side": true
}

Response: 200 OK
{
  "success": true,
  "challengeId": 123,
  "transactionHash": "0x9999...",
  "side": "YES"
}
```

**Accept P2P Challenge**
```http
POST /api/challenges/124/accept
Authorization: Bearer <user_token>

Response: 200 OK
{
  "success": true,
  "challengeId": 124,
  "transactionHash": "0xAAAA..."
}
```

### Challenge Queries

**Get Challenge Details**
```http
GET /api/challenges/123
Authorization: Bearer <user_token>

Response: 200 OK
{
  "id": 123,
  "title": "Will ETH go above $2000?",
  "status": "active",
  "onChainStatus": "active",
  "stakeAmountWei": "1000000",
  "paymentToken": "0x833589...",
  "onChainData": {
    "id": 123,
    "type": "ADMIN",
    "status": "ACTIVE",
    "stakeAmount": "1000000",
    "winner": null,
    "createdAt": "2026-01-17T10:00:00Z"
  },
  "participants": {
    "yes": ["user1", "user2", "user3"],
    "no": ["user4", "user5"],
    "totalParticipants": 5
  }
}
```

### Payouts

**Claim Payout**
```http
POST /api/payouts/123/claim
Authorization: Bearer <user_token>

Response: 200 OK
{
  "success": true,
  "challengeId": 123,
  "transactionHash": "0xCCCC...",
  "message": "Payout claimed successfully"
}
```

**Get Payout Status**
```http
GET /api/payouts/123/status
Authorization: Bearer <user_token>

Response: 200 OK
{
  "challengeId": 123,
  "status": "resolved",
  "resolved": true,
  "winner": "user1",
  "stakeAmount": "1000000",
  "paymentToken": "0x833589...",
  "resolutionTxHash": "0xDDDD...",
  "payoutTxHash": null
}
```

**Batch Claim Payouts**
```http
POST /api/payouts/batch-claim
Content-Type: application/json
Authorization: Bearer <user_token>

{
  "challengeIds": [123, 124, 125]
}

Response: 200 OK
{
  "successful": 3,
  "failed": 0,
  "results": [
    {
      "challengeId": 123,
      "success": true,
      "transactionHash": "0x1111..."
    },
    ...
  ]
}
```

### Points & Leaderboard

**Get Points Balance**
```http
GET /api/points/balance/user1
Authorization: Bearer <user_token>

Response: 200 OK
{
  "userId": "user1",
  "balance": "1000000000000000000",
  "balanceFormatted": "1.00",
  "totalPointsEarned": "5000000000000000000",
  "totalPointsBurned": "4000000000000000000"
}
```

**Global Leaderboard**
```http
GET /api/points/leaderboard?limit=100&offset=0
Authorization: Bearer <user_token>

Response: 200 OK
{
  "leaderboard": [
    {
      "rank": 1,
      "userId": "user_top",
      "username": "champion",
      "pointsBalance": "50000000000000000000",
      "totalEarned": "100000000000000000000"
    },
    {
      "rank": 2,
      "userId": "user2",
      "username": "runner_up",
      "pointsBalance": "30000000000000000000",
      "totalEarned": "60000000000000000000"
    },
    ...
  ],
  "pagination": {
    "limit": 100,
    "offset": 0,
    "total": 5000
  }
}
```

**User Rank**
```http
GET /api/points/leaderboard/user1
Authorization: Bearer <user_token>

Response: 200 OK
{
  "userId": "user1",
  "username": "player1",
  "rank": 42,
  "pointsBalance": "1000000000000000000",
  "totalEarned": "5000000000000000000",
  "totalBurned": "4000000000000000000"
}
```

**Transfer Points**
```http
POST /api/points/transfer
Content-Type: application/json
Authorization: Bearer <user_token>

{
  "recipientId": "user2",
  "amount": "100"
}

Response: 200 OK
{
  "success": true,
  "from": "user1",
  "to": "user2",
  "amount": "100",
  "message": "Points transferred successfully"
}
```

### Admin Resolution

**Resolve Challenge**
```http
POST /api/admin/challenges/resolve
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "challengeId": 123,
  "winner": "user1",
  "pointsAwarded": 100,
  "reason": "Correct prediction"
}

Response: 200 OK
{
  "success": true,
  "challengeId": 123,
  "winner": "user1",
  "pointsAwarded": 100,
  "transactionHash": "0xEEEE...",
  "blockNumber": 5678999,
  "gasUsed": "150000"
}
```

**Batch Resolve Challenges**
```http
POST /api/admin/challenges/batch-resolve
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "challenges": [
    {
      "challengeId": 123,
      "winner": "user1",
      "pointsAwarded": 100
    },
    {
      "challengeId": 124,
      "winner": "user2",
      "pointsAwarded": 75
    }
  ]
}

Response: 200 OK
{
  "total": 2,
  "successful": 2,
  "failed": 0,
  "results": [
    {
      "challengeId": 123,
      "success": true,
      "transactionHash": "0xFFFF..."
    },
    ...
  ]
}
```

**Get Pending Challenges**
```http
GET /api/admin/challenges/pending
Authorization: Bearer <admin_token>

Response: 200 OK
{
  "pending": 5,
  "challenges": [
    {
      "id": 123,
      "title": "Will ETH go above $2000?",
      "status": "active",
      "onChainStatus": "active",
      "createdAt": "2026-01-17T10:00:00Z"
    },
    ...
  ]
}
```

## Setup Instructions

### Step 1: Register Routes in server/index.ts

```typescript
import apiChallengesRouter from './routes/api-challenges';
import apiPayoutsRouter from './routes/api-payouts';
import apiPointsRouter from './routes/api-points';
import apiAdminResolveRouter from './routes/api-admin-resolve';

// Mount routes
app.use('/api/challenges', apiChallengesRouter);
app.use('/api/payouts', apiPayoutsRouter);
app.use('/api/points', apiPointsRouter);
app.use('/api/admin/challenges', apiAdminResolveRouter);
```

### Step 2: Ensure Database is Migrated

```bash
# Run Phase 3 migrations
npm run db:migrate
```

### Step 3: Test Endpoints

```bash
# Create admin challenge
curl -X POST http://localhost:3000/api/challenges/create-admin \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Test Challenge",
    "stakeAmount": "1",
    "paymentToken": "0x833589fCD6eDb6E08f4c7C32D4f71b3566dA8860",
    "metadataURI": "ipfs://test"
  }'

# Get leaderboard
curl http://localhost:3000/api/points/leaderboard

# Get admin pending challenges
curl -X GET http://localhost:3000/api/admin/challenges/pending \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Error Handling

All endpoints return standard error responses:

```json
{
  "error": "Error message",
  "message": "Detailed error description"
}
```

Common HTTP status codes:
- `200 OK` - Success
- `400 Bad Request` - Missing/invalid parameters
- `401 Unauthorized` - Missing authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

## Authentication

- **User endpoints**: Require `Authorization: Bearer <user_token>` header
- **Admin endpoints**: Require valid admin token verified by `verifyAdminToken` middleware
- **Public endpoints**: Some read-only endpoints (leaderboard, status) don't require auth

## Rate Limiting

Recommended rate limits:
- User endpoints: 100 req/min per user
- Admin endpoints: 50 req/min per admin
- Public endpoints: 1000 req/min per IP

## Security Considerations

✅ **Transaction Verification**
- All blockchain operations verified on-chain before accepting claims
- Admin signatures validated cryptographically
- Points awarded logged with transaction hashes

✅ **Input Validation**
- All inputs validated before submission
- Token addresses whitelist (USDC/USDT only)
- Amounts validated against user balances

✅ **Authorization**
- User can only claim their own payouts
- Only admins can resolve challenges
- Only winners can claim payouts

## Performance Optimization

### Indexes
All queries use database indexes:
- Challenge lookups by ID
- User points lookups
- Leaderboard queries
- Transaction history

### Caching
Consider caching:
- Leaderboard (updated hourly)
- User balance (updated on transaction)
- Challenge details (cache invalidated on updates)

### Batch Operations
Use batch endpoints for:
- Multiple claim payouts
- Batch challenge resolution
- Large data exports

## Monitoring & Logging

All endpoints log important events:
- Challenge creation/joining
- Payout claims
- Points transfers
- Admin resolutions
- Errors and failures

Check logs for:
```bash
grep "Challenge created" logs/server.log
grep "Payout claimed" logs/server.log
grep "Admin resolved" logs/server.log
```

## Integration with Frontend

Frontend example using the leaderboard endpoint:

```typescript
// Get global leaderboard
const response = await fetch('/api/points/leaderboard?limit=100');
const { leaderboard } = await response.json();

// Render leaderboard
leaderboard.forEach((entry, index) => {
  console.log(`${entry.rank}. ${entry.username}: ${entry.pointsBalance} BPTS`);
});

// Get user's rank
const userRankResponse = await fetch(`/api/points/leaderboard/${userId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { rank, pointsBalance } = await userRankResponse.json();
console.log(`Your rank: ${rank}, Points: ${pointsBalance}`);

// Create challenge
const createResponse = await fetch('/api/challenges/create-admin', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    title: 'My Challenge',
    stakeAmount: '1',
    paymentToken: USDC_ADDRESS,
    metadataURI: 'ipfs://...'
  })
});
const { challengeId } = await createResponse.json();

// Join challenge
const joinResponse = await fetch(`/api/challenges/${challengeId}/join`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ side: true }) // YES side
});
```

## Next Steps

✅ Phases 1-4 Complete:
- Phase 1: Smart Contracts ✅
- Phase 2: Blockchain Backend ✅
- Phase 3: Database Schema ✅
- Phase 4: REST API ✅

🎯 Future Phases (Optional):
- Phase 5: Frontend Integration
- Phase 6: Real-time Updates (WebSockets)
- Phase 7: Analytics & Reporting
- Phase 8: Advanced Features (DAO voting, staking, etc.)

## Complete!

All REST API endpoints are ready for frontend integration. Start Phase 5 for frontend updates or deploy to production!
