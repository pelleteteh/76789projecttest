# Phase 2: Backend Blockchain Integration

Backend setup for on-chain challenge management on Base Testnet Sepolia.

## Overview

Phase 2 creates the backend infrastructure to:
1. Connect to deployed smart contracts via ethers.js
2. Manage blockchain transactions and state
3. Sign challenge resolutions with admin authority
4. Integrate blockchain operations with the admin dashboard

## Architecture

```
┌─────────────────────────────────────────────────┐
│         Admin Dashboard (/admin)                │
│    - View pending challenges                    │
│    - Sign and submit resolutions                │
│    - Monitor on-chain transactions             │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│     API Routes (challenges-blockchain.ts)       │
│    - POST /resolve-onchain                      │
│    - POST /batch-resolve-onchain                │
│    - GET /pending                               │
│    - GET /blockchain/signing-stats              │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│      Blockchain Module (server/blockchain/)     │
│    - client.ts: ethers.js setup                │
│    - helpers.ts: Contract interactions         │
│    - signing.ts: Admin signatures              │
│    - init.ts: Startup initialization           │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│    Base Testnet Sepolia Smart Contracts        │
│    - BantahPoints.sol (ERC-20)                 │
│    - ChallengeFactory.sol (Main logic)         │
│    - PointsEscrow.sol (Escrow)                 │
└─────────────────────────────────────────────────┘
```

## Files Created

### 1. **server/blockchain/client.ts** (280 lines)
Blockchain client setup with ethers.js.

**Key Components:**
- `BlockchainClient` class - Manages provider, signers, contracts
- `initBlockchainClient()` - Initialize from config
- `getBlockchainClient()` - Get singleton instance

**Usage:**
```typescript
import { getBlockchainClient } from './blockchain/client';

const client = getBlockchainClient();
const provider = client.getProvider();
const adminSigner = client.getAdminSigner();
const challenge = await client.challengeFactoryContract.getChallenge(1);
```

### 2. **server/blockchain/helpers.ts** (320 lines)
High-level contract interaction helpers.

**Functions:**
- `getChallenge(id)` - Fetch challenge details
- `createAdminChallenge()` - Create betting pool
- `createP2PChallenge()` - Create user-to-user challenge
- `joinAdminChallenge()` - Join betting pool
- `acceptP2PChallenge()` - Accept P2P challenge
- `claimPayout()` - Claim winnings
- `getUserPointsBalance()` - Check points
- `getTokenBalance()` - Check token balance
- `getChallengeParticipants()` - Get users in challenge
- `estimateGasForChallenge()` - Estimate gas costs

**Usage:**
```typescript
import { getChallenge, createAdminChallenge } from './blockchain/helpers';

const challenge = await getChallenge(1);
const result = await createAdminChallenge('1', USDC_ADDRESS, 'ipfs://hash', userSigner);
```

### 3. **server/blockchain/signing.ts** (230 lines)
Admin cryptographic signing for challenge resolutions.

**Functions:**
- `signChallengeResolution()` - Sign with admin private key
- `verifyChallengeSignature()` - Verify signature is from admin
- `resolveChallengeOnChain()` - Sign + submit to blockchain
- `batchSignChallenges()` - Sign multiple challenges
- `getSigningStats()` - Get signing infrastructure status

**Usage:**
```typescript
import { resolveChallengeOnChain } from './blockchain/signing';

const result = await resolveChallengeOnChain({
  challengeId: 1,
  winner: '0x...',
  pointsAwarded: 100
});
// Returns: { transactionHash, blockNumber, gasUsed, status }
```

### 4. **server/blockchain/init.ts** (80 lines)
Server startup initialization.

**Usage in server/index.ts:**
```typescript
import { initializeBlockchain } from './blockchain/init';

// On startup:
await initializeBlockchain();
```

### 5. **server/blockchain/index.ts** (40 lines)
Module exports and public API.

**Exports all blockchain functions for easy importing:**
```typescript
import {
  getBlockchainClient,
  getChallenge,
  signChallengeResolution,
  initializeBlockchain
} from './blockchain';
```

### 6. **server/routes/challenges-blockchain.ts** (250 lines)
API endpoints for admin dashboard.

**Endpoints:**
- `POST /api/admin/challenges/resolve-onchain` - Resolve single challenge
- `POST /api/admin/challenges/batch-resolve-onchain` - Batch resolve
- `GET /api/admin/challenges/pending` - Get pending resolutions
- `GET /api/admin/blockchain/signing-stats` - Get status
- `POST /api/admin/challenges/verify-signature` - Test signature

## Setup Instructions

### Step 1: Deploy Smart Contracts
Complete Phase 1 deployment and get contract addresses.

```bash
cd contracts
npx ts-node deploy.ts
# Save addresses to .env
```

### Step 2: Update Environment Variables
Add to `.env` (from Phase 1 deployment):
```env
VITE_BASE_TESTNET_RPC=https://sepolia.base.org
VITE_CHAIN_ID=84532

# Contracts
VITE_POINTS_CONTRACT_ADDRESS=0x...
VITE_CHALLENGE_FACTORY_ADDRESS=0x...
VITE_POINTS_ESCROW_ADDRESS=0x...

# Tokens
VITE_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b3566dA8860
VITE_USDT_ADDRESS=0x3c499c542cEF5E3811e1192ce70d8cC7d307B653

# Admin signing
ADMIN_PRIVATE_KEY=0x...
ADMIN_ADDRESS=0x...
```

### Step 3: Register Blockchain Routes
In `server/index.ts`:

```typescript
import { initializeBlockchain } from './blockchain/init';
import challengeBlockchainRoutes from './routes/challenges-blockchain';

app.use('/api/admin', challengeBlockchainRoutes);

// On startup:
await initializeBlockchain();
```

### Step 4: Update TypeScript Config
Ensure ethers.js types are available:
```bash
npm install ethers @types/ethers
```

### Step 5: Database Schema Updates
Add blockchain fields to challenges table (see Phase 3).

## API Usage Examples

### Resolve a Challenge

```bash
curl -X POST http://localhost:3000/api/admin/challenges/resolve-onchain \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "challengeId": 1,
    "winner": "0x742d35Cc6634C0532925a3b844Bc859F1b60C1A0",
    "pointsAwarded": 100
  }'

# Response:
{
  "success": true,
  "message": "Challenge resolved on-chain",
  "challengeId": 1,
  "winner": "0x742d...",
  "pointsAwarded": 100,
  "transactionHash": "0x1234...",
  "blockNumber": 5678910,
  "gasUsed": "150000"
}
```

### Batch Resolve

```bash
curl -X POST http://localhost:3000/api/admin/challenges/batch-resolve-onchain \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "challenges": [
      {
        "challengeId": 1,
        "winner": "0x742d35Cc6634C0532925a3b844Bc859F1b60C1A0",
        "pointsAwarded": 100
      },
      {
        "challengeId": 2,
        "winner": "0x123456789...",
        "pointsAwarded": 75
      }
    ]
  }'

# Response:
{
  "total": 2,
  "successful": 2,
  "failed": 0,
  "results": [...]
}
```

### Get Pending Challenges

```bash
curl http://localhost:3000/api/admin/challenges/pending \
  -H "Authorization: Bearer <admin_token>"

# Response: Array of challenges awaiting resolution
```

## Admin Dashboard Integration

The admin panel `/admin/challenges/disputes` already has:
- ✅ Pending challenges display
- ✅ Resolution UI with decision buttons
- ✅ Notes/comments system

**To enable blockchain:**

1. Update `handleResolve()` in `AdminChallengeDisputes.tsx`:
```typescript
const handleResolve = async (
  dispute: DisputedChallenge,
  decision: 'challenger_won' | 'challenged_won' | 'refund'
) => {
  // Get wallet address for winner
  const winner = decision === 'challenger_won' 
    ? dispute.challengerUser.walletAddress
    : dispute.challengedUser.walletAddress;

  // Call blockchain endpoint
  const response = await adminApiRequest(
    '/api/admin/challenges/resolve-onchain',
    {
      method: 'POST',
      body: JSON.stringify({
        challengeId: dispute.id,
        winner,
        pointsAwarded: 100 // Calculate based on stake
      })
    }
  );

  if (response.success) {
    toast({ title: '✅ Resolved on-chain', description: response.transactionHash });
  }
};
```

2. Add signing status badge:
```typescript
const { data: signingStats } = useQuery({
  queryKey: ['/api/admin/blockchain/signing-stats'],
  queryFn: async () => adminApiRequest('/api/admin/blockchain/signing-stats')
});

// Display in header
<Badge className="bg-green-600">
  🔗 On-Chain Signing Active
</Badge>
```

## Testing

### 1. Test Blockchain Connection
```typescript
import { getBlockchainClient } from './blockchain/client';

const client = getBlockchainClient();
const networkInfo = await client.getNetworkInfo();
console.log(networkInfo);
// Output: { network: 'baseSepoliaTestnet', chainId: 84532, ... }
```

### 2. Test Signing
```typescript
import { signChallengeResolution, verifyChallengeSignature } from './blockchain/signing';

const sig = await signChallengeResolution({
  challengeId: 1,
  winner: '0x...',
  pointsAwarded: 100
});

const valid = await verifyChallengeSignature({ ... }, sig.signature);
console.log(valid.isValid); // true
```

### 3. Test Contract Interaction
```typescript
import { getChallenge } from './blockchain/helpers';

const challenge = await getChallenge(1);
console.log(challenge);
// Output: { id: 1, type: 'ADMIN', status: 'ACTIVE', ... }
```

## Security Considerations

### Private Key Management
- ✅ ADMIN_PRIVATE_KEY should never be in git
- ✅ Use environment variables or secure vaults
- ✅ Rotate keys periodically
- ✅ Consider using AWS Secrets Manager or HashiCorp Vault in production

### Signature Validation
- ✅ All signatures verified on-chain before accepting
- ✅ Message hash includes challengeId (prevents replay)
- ✅ Admin address verified against expected value
- ✅ Timestamp included (implement expiry in Phase 3)

### Transaction Safety
- ✅ ReentrancyGuard protects contracts
- ✅ All state updates in correct order
- ✅ Failed transactions don't update database
- ✅ Errors logged for audit trail

## Troubleshooting

**"Blockchain client not initialized"**
- Ensure `initializeBlockchain()` called on startup
- Check all env variables are set
- Verify contract addresses are correct

**"Failed to connect to blockchain"**
- Check RPC endpoint is accessible
- Verify Base Testnet Sepolia is online
- Check firewall/network settings

**"Invalid admin signature"**
- Ensure ADMIN_PRIVATE_KEY is correct
- Verify admin address matches signer
- Check no extra spaces in environment variables

**"Insufficient balance for gas"**
- Get testnet ETH from faucet
- Check admin address receives funds
- Wait for transaction confirmation

## Next Phase

**Phase 3: Database Schema Updates**
- Add blockchain fields to challenges table
- Create blockchain_transactions table
- Add points_ledger table
- Setup transaction indexing

See `Phase 3: Database Migrations` for details.
