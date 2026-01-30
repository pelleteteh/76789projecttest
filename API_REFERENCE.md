# Phase 4: Complete API Reference

Quick lookup guide for all 27 REST endpoints.

## Challenge Operations

### POST /api/challenges/create-admin
Create a betting pool challenge (admin creates, users join YES/NO)

**Headers:**
```
Authorization: Bearer <user_token>
Content-Type: application/json
```

**Body:**
```json
{
  "title": "Will ETH reach $2000?",
  "description": "Predict ethereum price movement",
  "category": "crypto",
  "stakeAmount": "1",
  "paymentToken": "0x833589fCD6eDb6E08f4c7C32D4f71b3566dA8860",
  "metadataURI": "ipfs://QmHash..."
}
```

**Response:**
```json
{
  "success": true,
  "challengeId": 123,
  "transactionHash": "0x1234...",
  "blockNumber": 5678910
}
```

---

### POST /api/challenges/create-p2p
Create a user-to-user challenge

**Headers:**
```
Authorization: Bearer <user_token>
Content-Type: application/json
```

**Body:**
```json
{
  "opponentId": "user456",
  "title": "Gaming Challenge",
  "description": "First to level 50",
  "stakeAmount": "2",
  "paymentToken": "0x833589fCD6eDb6E08f4c7C32D4f71b3566dA8860",
  "metadataURI": "ipfs://QmHash..."
}
```

**Response:**
```json
{
  "success": true,
  "challengeId": 124,
  "transactionHash": "0x5678...",
  "opponent": "user456"
}
```

---

### POST /api/challenges/:id/join
Join an admin challenge (vote YES or NO)

**Headers:**
```
Authorization: Bearer <user_token>
Content-Type: application/json
```

**Body:**
```json
{
  "side": true
}
```

**Response:**
```json
{
  "success": true,
  "challengeId": 123,
  "transactionHash": "0x9999...",
  "side": "YES"
}
```

---

### POST /api/challenges/:id/accept
Accept a P2P challenge

**Headers:**
```
Authorization: Bearer <user_token>
```

**Response:**
```json
{
  "success": true,
  "challengeId": 124,
  "transactionHash": "0xAAAA..."
}
```

---

### GET /api/challenges/:id
Get single challenge details

**Headers:**
```
Authorization: Bearer <user_token>
```

**Response:**
```json
{
  "id": 123,
  "title": "Will ETH reach $2000?",
  "status": "active",
  "onChainStatus": "active",
  "stakeAmount": "1",
  "participants": {
    "yes": ["user1", "user2", "user3"],
    "no": ["user4", "user5"],
    "totalParticipants": 5
  }
}
```

---

### GET /api/challenges
List all challenges with filters

**Headers:**
```
Authorization: Bearer <user_token>
```

**Query Parameters:**
```
?status=active&category=crypto&limit=20&offset=0
```

**Response:**
```json
{
  "challenges": [
    {
      "id": 123,
      "title": "Will ETH reach $2000?",
      "status": "active",
      "participants": 5,
      "stakeAmount": "1"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 0
  }
}
```

---

### GET /api/challenges/user/:userId
Get user's challenges

**Headers:**
```
Authorization: Bearer <user_token>
```

**Response:**
```json
{
  "created": [
    { "id": 123, "title": "...", "status": "active" }
  ],
  "joined": [
    { "id": 124, "title": "...", "status": "active" }
  ],
  "totalCreated": 5,
  "totalJoined": 12
}
```

---

## Payout Operations

### POST /api/payouts/:challengeId/claim
Claim payout (winner only)

**Headers:**
```
Authorization: Bearer <user_token>
```

**Response:**
```json
{
  "success": true,
  "challengeId": 123,
  "transactionHash": "0xCCCC...",
  "message": "Payout claimed successfully"
}
```

---

### GET /api/payouts/:challengeId/status
Get payout status

**Headers:**
```
Authorization: Bearer <user_token>
```

**Response:**
```json
{
  "challengeId": 123,
  "status": "resolved",
  "resolved": true,
  "winner": "user1",
  "stakeAmount": "1",
  "paymentToken": "0x833589...",
  "resolutionTxHash": "0xDDDD..."
}
```

---

### GET /api/payouts/user/:userId
Get user's payouts

**Headers:**
```
Authorization: Bearer <user_token>
```

**Response:**
```json
{
  "pending": [
    { "id": 123, "amount": "2", "resolvedDate": "2026-01-20" }
  ],
  "claimed": [
    { "id": 122, "amount": "1", "claimedDate": "2026-01-15" }
  ],
  "totalPending": "5",
  "totalClaimed": "10"
}
```

---

### POST /api/payouts/batch-claim
Batch claim multiple payouts

**Headers:**
```
Authorization: Bearer <user_token>
Content-Type: application/json
```

**Body:**
```json
{
  "challengeIds": [123, 124, 125]
}
```

**Response:**
```json
{
  "successful": 3,
  "failed": 0,
  "results": [
    { "challengeId": 123, "success": true, "transactionHash": "0x1111..." },
    { "challengeId": 124, "success": true, "transactionHash": "0x2222..." },
    { "challengeId": 125, "success": true, "transactionHash": "0x3333..." }
  ]
}
```

---

## Points & Leaderboard

### GET /api/points/balance/:userId
Get user's points balance

**Headers:**
```
Authorization: Bearer <user_token>
```

**Response:**
```json
{
  "userId": "user1",
  "balance": "1000000000000000000",
  "balanceFormatted": "1.00",
  "totalEarned": "5000000000000000000",
  "totalBurned": "4000000000000000000"
}
```

---

### POST /api/points/transfer
Transfer points to another user

**Headers:**
```
Authorization: Bearer <user_token>
Content-Type: application/json
```

**Body:**
```json
{
  "recipientId": "user2",
  "amount": "100"
}
```

**Response:**
```json
{
  "success": true,
  "from": "user1",
  "to": "user2",
  "amount": "100",
  "message": "Points transferred successfully"
}
```

---

### GET /api/points/leaderboard
Get global leaderboard (top users)

**Headers:**
```
Authorization: Bearer <user_token>
```

**Query Parameters:**
```
?limit=100&offset=0
```

**Response:**
```json
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
    }
  ],
  "pagination": {
    "total": 5000,
    "limit": 100,
    "offset": 0
  }
}
```

---

### GET /api/points/leaderboard/:userId
Get user's rank and stats

**Headers:**
```
Authorization: Bearer <user_token>
```

**Response:**
```json
{
  "userId": "user1",
  "username": "player1",
  "rank": 42,
  "pointsBalance": "1000000000000000000",
  "totalEarned": "5000000000000000000",
  "totalBurned": "4000000000000000000"
}
```

---

### GET /api/points/history/:userId
Get points transaction history

**Headers:**
```
Authorization: Bearer <user_token>
```

**Query Parameters:**
```
?limit=50&offset=0
```

**Response:**
```json
{
  "transactions": [
    {
      "id": 1,
      "type": "EARNED",
      "amount": "100",
      "reason": "Challenge won",
      "challengeId": 123,
      "timestamp": "2026-01-17T10:00:00Z"
    },
    {
      "id": 2,
      "type": "TRANSFERRED",
      "amount": "50",
      "to": "user2",
      "timestamp": "2026-01-16T15:30:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0
  }
}
```

---

### GET /api/points/statistics
Get global points statistics

**Headers:**
```
Authorization: Bearer <user_token>
```

**Response:**
```json
{
  "totalPoints": "1000000000000000000000",
  "totalUsers": 5000,
  "averagePointsPerUser": "200000000000000000",
  "medianPointsPerUser": "50000000000000000",
  "topUser": "user_top",
  "topUserPoints": "50000000000000000000"
}
```

---

### POST /api/points/connect-wallet
Connect blockchain wallet to user account

**Headers:**
```
Authorization: Bearer <user_token>
Content-Type: application/json
```

**Body:**
```json
{
  "walletAddress": "0x1234567890123456789012345678901234567890"
}
```

**Response:**
```json
{
  "success": true,
  "walletId": 1,
  "walletAddress": "0x1234..."
}
```

---

### GET /api/points/wallets
Get user's connected wallets

**Headers:**
```
Authorization: Bearer <user_token>
```

**Response:**
```json
{
  "wallets": [
    {
      "id": 1,
      "walletAddress": "0x1234...",
      "isPrimary": true,
      "connectedAt": "2026-01-15T08:00:00Z"
    },
    {
      "id": 2,
      "walletAddress": "0x5678...",
      "isPrimary": false,
      "connectedAt": "2026-01-16T12:00:00Z"
    }
  ]
}
```

---

### POST /api/points/set-primary-wallet/:walletId
Set primary wallet for payouts

**Headers:**
```
Authorization: Bearer <user_token>
```

**Response:**
```json
{
  "success": true,
  "walletId": 2,
  "walletAddress": "0x5678..."
}
```

---

## Admin Resolution

### POST /api/admin/challenges/resolve
Resolve a challenge (admin only)

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Body:**
```json
{
  "challengeId": 123,
  "winner": "user1",
  "pointsAwarded": 100,
  "reason": "Correct prediction"
}
```

**Response:**
```json
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

---

### POST /api/admin/challenges/batch-resolve
Batch resolve multiple challenges (admin only)

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Body:**
```json
{
  "challenges": [
    { "challengeId": 123, "winner": "user1", "pointsAwarded": 100 },
    { "challengeId": 124, "winner": "user2", "pointsAwarded": 75 }
  ]
}
```

**Response:**
```json
{
  "total": 2,
  "successful": 2,
  "failed": 0,
  "results": [
    { "challengeId": 123, "success": true, "transactionHash": "0xFFFF..." },
    { "challengeId": 124, "success": true, "transactionHash": "0x0000..." }
  ]
}
```

---

### GET /api/admin/challenges/pending
Get all pending challenges (admin only)

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "pending": 5,
  "challenges": [
    {
      "id": 123,
      "title": "Will ETH reach $2000?",
      "status": "active",
      "onChainStatus": "active",
      "createdAt": "2026-01-17T10:00:00Z"
    }
  ]
}
```

---

### GET /api/admin/challenges/by-status/:status
Get challenges by status (admin only)

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Query Parameters:**
```
?status=active&limit=50
```

**Response:**
```json
{
  "status": "active",
  "challenges": [
    { "id": 123, "title": "...", "status": "active" },
    { "id": 124, "title": "...", "status": "active" }
  ],
  "pagination": {
    "total": 150,
    "limit": 50
  }
}
```

---

### GET /api/admin/blockchain/signing-stats
Get admin signing statistics (admin only)

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "totalSigned": 1000,
  "totalBatchSigned": 50,
  "averageBatchSize": 5,
  "lastSignature": "2026-01-17T10:30:00Z",
  "gasSavingsFromBatching": "1500000"
}
```

---

### POST /api/admin/challenges/verify-resolution
Verify a resolution signature (admin only, for testing)

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Body:**
```json
{
  "challengeId": 123,
  "winner": "user1",
  "signature": "0x..."
}
```

**Response:**
```json
{
  "valid": true,
  "signer": "0x...",
  "message": "Signature is valid"
}
```

---

### GET /api/admin/challenges/:id/resolution-history
Get resolution history/audit trail (admin only)

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "challengeId": 123,
  "resolutions": [
    {
      "id": 1,
      "winner": "user1",
      "pointsAwarded": 100,
      "transactionHash": "0xEEEE...",
      "timestamp": "2026-01-17T10:30:00Z",
      "reason": "Correct prediction"
    }
  ]
}
```

---

## Error Responses

All endpoints return standard error format:

```json
{
  "error": "Error message",
  "message": "Detailed error description"
}
```

### Common Error Codes

- **400 Bad Request** - Invalid input parameters
- **401 Unauthorized** - Missing or invalid authentication token
- **403 Forbidden** - User lacks permission (not owner, not admin)
- **404 Not Found** - Resource not found
- **500 Internal Server Error** - Server error (check logs)

### Example Error Response

```json
{
  "error": "Insufficient balance",
  "message": "User does not have enough points to transfer"
}
```

---

## Authentication

### User Token
From Privy Web3 authentication. Include in header:
```
Authorization: Bearer <user_token>
```

### Admin Token
Verified on backend. Include in header:
```
Authorization: Bearer <admin_token>
```

---

## Rate Limits

Recommended (implement as needed):
- User endpoints: 100 req/min
- Admin endpoints: 50 req/min
- Public endpoints: 1000 req/min

---

## Status Codes

- `success: true` - Operation successful
- `success: false` - Operation failed (check error field)

---

**Total Endpoints: 27**
**Documentation: Complete**
**Status: Ready for Integration**
