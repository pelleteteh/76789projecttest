# Phase 3: Database Migrations & Blockchain Integration

Database schema updates to support on-chain challenge settlement and points management.

## Overview

Phase 3 adds blockchain-aware database tables and modifies existing tables to track:
- On-chain challenge metadata (contract addresses, transaction hashes)
- User points ledgers and transactions
- Blockchain transaction history
- Escrow records
- Wallet addresses
- Admin signatures

## Architecture

```
┌──────────────────────────────────────────────┐
│     Existing Bantah Database                 │
│  - users, challenges, events, etc.          │
└────────────────┬─────────────────────────────┘
                 │ (Enhanced with blockchain fields)
                 ▼
┌──────────────────────────────────────────────┐
│   Blockchain Tables (Phase 3)                │
│  - user_points_ledgers                       │
│  - points_transactions                       │
│  - blockchain_transactions                   │
│  - challenge_escrow_records                  │
│  - contract_deployments                      │
│  - admin_signatures_log                      │
│  - user_wallet_addresses                     │
└────────────────┬─────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────┐
│   Database Utilities (db-utils.ts)           │
│  - Points ledger management                  │
│  - Transaction logging                       │
│  - Escrow operations                         │
│  - Wallet management                         │
│  - Analytics & reporting                     │
└──────────────────────────────────────────────┘
```

## Files Created

### 1. **shared/schema-blockchain.ts** (450 lines)
Drizzle ORM schema definitions for all blockchain-related tables.

**Tables Defined:**
- `userPointsLedgers` - Points balance tracking per user
- `pointsTransactions` - All points movements logged
- `blockchainTransactions` - Complete blockchain interaction history
- `challengeEscrowRecords` - USDC/USDT escrow tracking
- `contractDeployments` - Deployed contract registry
- `adminSignaturesLog` - Audit trail of admin signatures
- `userWalletAddresses` - User wallet address management

**Includes:**
- Full TypeScript types
- Zod validation schemas
- Drizzle relationships
- Database constraints & indexes

### 2. **migrations/phase3-blockchain.sql** (350+ lines)
Complete SQL migration file with:
- ✅ Alter `challenges` table with blockchain fields
- ✅ Create 7 new tables
- ✅ Add 25+ indexes for performance
- ✅ Create 3 helpful views
- ✅ Create 2 stored procedures

### 3. **server/blockchain/db-utils.ts** (400 lines)
Helper functions for database operations.

**Functions:**

**Points Management:**
- `ensureUserPointsLedger()` - Create/get user points record
- `recordPointsTransaction()` - Log points movement
- `updateUserPointsBalance()` - Recalculate balance from transactions
- `getUserPointsBalance()` - Get current balance

**Blockchain Logging:**
- `logBlockchainTransaction()` - Record tx to database
- `updateBlockchainTransactionStatus()` - Update tx status
- `getRecentBlockchainTransactions()` - Query recent txs

**Escrow:**
- `createEscrowRecord()` - Lock funds in escrow
- `updateEscrowStatus()` - Release/claim funds
- `getUserActiveEscrows()` - Get user's active escrows

**Contracts:**
- `recordContractDeployment()` - Log deployment
- `getContractByName()` - Get deployed contract address
- `getDeployedContracts()` - List all deployments

**Wallets:**
- `addUserWallet()` - Register wallet for user
- `getUserWallets()` - Get user's wallets
- `getUserPrimaryWallet()` - Get primary wallet
- `setPrimaryWallet()` - Mark wallet as primary
- `updateWalletBalances()` - Sync wallet balances

**Analytics:**
- `getPointsStatistics()` - Platform points overview
- `getBlockchainTransactionStats()` - TX statistics
- `getUserPointsTransactionHistory()` - User TX log

## Schema Changes

### Existing `challenges` Table - New Fields

```sql
-- Blockchain settlement
blockchain_chain_id INT
blockchain_contract_address VARCHAR
blockchain_creation_tx_hash VARCHAR UNIQUE
blockchain_resolution_tx_hash VARCHAR
blockchain_payout_tx_hash VARCHAR
blockchain_settlement_tx_hash VARCHAR
blockchain_block_number INT
blockchain_settlement_block_number INT

-- Token & amount
payment_token_address VARCHAR  -- 0x833589... for USDC
stake_amount_wei BIGINT        -- Actual wei amount
points_awarded INT
points_multiplier DECIMAL(3,2)

-- Resolution & status
admin_signature TEXT           -- Signed resolution
on_chain_status VARCHAR        -- pending/active/resolved/claimed
on_chain_resolved BOOLEAN
resolution_timestamp TIMESTAMP
on_chain_metadata JSONB

-- Indexes:
idx_challenges_blockchain_status
idx_challenges_payment_token
idx_challenges_chain_id
```

### New Tables

1. **user_points_ledgers**
   - Tracks total points balance per user
   - Derived from points_transactions
   - Fast queries for leaderboard

2. **points_transactions**
   - Immutable log of all points movements
   - Types: earned_challenge, burned_usage, locked_escrow, etc.
   - Indexed by user, challenge, type, timestamp

3. **blockchain_transactions**
   - Complete history of all on-chain operations
   - Includes gas usage, status, errors
   - Linked to challenges and users

4. **challenge_escrow_records**
   - Tracks USDC/USDT locked in contracts
   - Status: locked → released → claimed
   - Includes side (YES/NO) and token type

5. **contract_deployments**
   - Registry of deployed contracts
   - Version tracking
   - ABI hashes for verification

6. **admin_signatures_log**
   - Audit trail of all admin signatures
   - Challenge ID, signer, message hash, signature
   - Verification status

7. **user_wallet_addresses**
   - Maps users to blockchain wallets
   - Supports multiple wallets per user
   - Cached balances (USDC, USDT, BPTS, ETH)

## Setup Instructions

### Step 1: Backup Database
```bash
# Create backup before migration
pg_dump bantah_db > backup_before_phase3.sql
```

### Step 2: Run Migration
```bash
# Method 1: Via psql
psql -U postgres -d bantah < migrations/phase3-blockchain.sql

# Method 2: Via Drizzle (recommended)
npm run db:migrate
```

### Step 3: Verify Migration
```bash
# Check new tables exist
psql -U postgres -d bantah -c "\dt user_points_ledgers"

# Check views
psql -U postgres -d bantah -c "SELECT * FROM v_challenges_pending_resolution LIMIT 1;"

# Check functions
psql -U postgres -d bantah -c "\df update_user_points_balance"
```

### Step 4: Initialize User Data
```typescript
import { db } from '@/server/db';
import { ensureUserPointsLedger } from '@/server/blockchain/db-utils';

// For each existing user:
const users = await db.select().from(users);
for (const user of users) {
  await ensureUserPointsLedger(user.id);
}
```

## Database Utilities Usage

### Points Management

```typescript
import { 
  recordPointsTransaction, 
  getUserPointsBalance,
  updateUserPointsBalance 
} from '@/server/blockchain/db-utils';

// Award points to challenge winner
await recordPointsTransaction({
  userId: winner,
  challengeId: 123,
  transactionType: 'earned_challenge',
  amount: 100n,
  reason: 'Won challenge',
  blockchainTxHash: '0x123...',
});

// Check balance
const balance = await getUserPointsBalance(userId);
console.log(`User has ${balance} points`);
```

### Escrow Management

```typescript
import { 
  createEscrowRecord, 
  updateEscrowStatus,
  getUserActiveEscrows 
} from '@/server/blockchain/db-utils';

// Lock USDC in escrow
const escrow = await createEscrowRecord({
  challengeId: 123,
  userId: userA,
  tokenAddress: USDC_ADDRESS,
  amountEscrowed: 1000000n, // 1 USDC in wei
  status: 'locked',
  side: 'YES',
});

// Later, claim payout
await updateEscrowStatus(escrow.id, 'claimed', txHash);
```

### Wallet Management

```typescript
import { 
  addUserWallet, 
  getUserPrimaryWallet,
  updateWalletBalances 
} from '@/server/blockchain/db-utils';

// User connects wallet
const wallet = await addUserWallet({
  userId: 'user123',
  walletAddress: '0x742d35Cc...',
  walletType: 'privy',
  chainId: 84532,
  isPrimary: true,
});

// Update cached balances
await updateWalletBalances(wallet.id, {
  usdcBalance: 5000000n,
  pointsBalance: 1000n,
});
```

### Transaction Logging

```typescript
import { 
  logBlockchainTransaction, 
  updateBlockchainTransactionStatus 
} from '@/server/blockchain/db-utils';

// Log transaction submission
const tx = await logBlockchainTransaction({
  chainId: 84532,
  transactionHash: '0x1234...',
  transactionType: 'challenge_resolve',
  contractAddress: CHALLENGE_FACTORY_ADDRESS,
  fromAddress: ADMIN_ADDRESS,
  status: 'pending',
  challengeId: 123,
});

// Update when confirmed
await updateBlockchainTransactionStatus(
  '0x1234...',
  'success',
  { blockNumber: 5678910 }
);
```

## Database Views

### `v_challenges_pending_resolution`
Query challenges awaiting admin resolution with participant counts.

```sql
SELECT * FROM v_challenges_pending_resolution;
-- Columns: id, title, status, on_chain_status, challenger, challenged, 
--          yes_participants, no_participants, created_at
```

### `v_user_points_summary`
Get leaderboard-ready user points data.

```sql
SELECT * FROM v_user_points_summary ORDER BY current_points DESC;
-- Columns: user_id, username, current_points, total_earned, 
--          total_burned, locked_points, transaction_count, last_updated_at
```

### `v_blockchain_tx_summary`
Summary of blockchain transaction statistics.

```sql
SELECT * FROM v_blockchain_tx_summary;
-- Columns: chain_id, transaction_type, status, tx_count, 
--          total_gas, total_value, last_transaction
```

## Stored Procedures

### `update_user_points_balance(user_id)`
Recalculate user points from transaction history.

```sql
SELECT update_user_points_balance('user123');
-- Updates points_balance, total_earned, total_burned
```

### `ensure_user_points_ledger(user_id)`
Create points ledger if it doesn't exist.

```sql
SELECT ensure_user_points_ledger('user123');
```

## Integration with Phase 2

Phase 3 database utilities integrate with Phase 2 blockchain code:

```typescript
// In server/blockchain/signing.ts:
import { 
  recordPointsTransaction,
  logBlockchainTransaction,
  logAdminSignature 
} from './db-utils';

export async function resolveChallengeOnChain(challenge) {
  // Sign resolution
  const sig = await signChallengeResolution(challenge);
  
  // Log signature
  await logAdminSignature({
    challengeId: challenge.challengeId,
    adminAddress: getAdminAddress(),
    signature: sig.signature,
    ...
  });

  // Submit to blockchain
  const tx = await submitResolution(...);

  // Log blockchain transaction
  await logBlockchainTransaction({
    transactionHash: tx.transactionHash,
    transactionType: 'challenge_resolve',
    ...
  });

  // Award points
  await recordPointsTransaction({
    userId: challenge.winner,
    transactionType: 'earned_challenge',
    amount: challenge.pointsAwarded,
    blockchainTxHash: tx.transactionHash,
  });
}
```

## Performance Optimization

### Indexes
All tables have strategic indexes on:
- User IDs (for user lookups)
- Transaction types (for filtering)
- Status fields (for pending queries)
- Timestamps (for recent data)
- Blockchain hashes (for verification)

### Views
Pre-computed views for common queries:
- Leaderboard data (v_user_points_summary)
- Pending resolutions (v_challenges_pending_resolution)
- TX statistics (v_blockchain_tx_summary)

### Stored Procedures
Common operations optimized at database level:
- Point balance recalculation
- User ledger initialization

## Monitoring & Auditing

### View Recent Transactions
```sql
SELECT * FROM blockchain_transactions 
WHERE status = 'failed' 
ORDER BY created_at DESC 
LIMIT 10;
```

### Check Escrow Amounts
```sql
SELECT 
  user_id,
  token_address,
  SUM(amount_escrowed - amount_released) as active_escrow
FROM challenge_escrow_records
WHERE status = 'locked'
GROUP BY user_id, token_address;
```

### Leaderboard Query
```sql
SELECT 
  username,
  current_points as points,
  total_earned,
  total_burned,
  transaction_count as challenges_won
FROM v_user_points_summary
ORDER BY current_points DESC
LIMIT 100;
```

### Admin Signature Audit Trail
```sql
SELECT 
  a.challenge_id,
  a.admin_address,
  a.winner,
  a.is_verified,
  a.signed_at
FROM admin_signatures_log a
WHERE a.signed_at > NOW() - INTERVAL '24 hours'
ORDER BY a.signed_at DESC;
```

## Troubleshooting

**"ERROR: relation "user_points_ledgers" does not exist"**
- Ensure migration was run: `psql -U postgres -d bantah < migrations/phase3-blockchain.sql`
- Check migration completed without errors

**"Foreign key violation in points_transactions"**
- Ensure user exists in users table first
- Call `ensureUserPointsLedger()` before recording transactions

**Slow leaderboard queries**
- Make sure `idx_user_points_balance` index exists
- Consider materialized views for very large datasets

**Points not updating**
- Check `update_user_points_balance()` is called after each transaction
- Verify transaction_type values match expected types

## Next Phase: Phase 4 - API Routes

Phase 4 will implement:
- REST endpoints for blockchain operations
- Challenge creation/joining
- Payout claims
- Leaderboard queries
- Points transfers

See Phase 4 documentation for details.

## Backup & Recovery

### Backup Strategy
```bash
# Daily backup
pg_dump bantah_db -F custom -f backup_$(date +%Y%m%d).dump

# Keep last 30 days
find ./backups -name "backup_*.dump" -mtime +30 -delete
```

### Recovery
```bash
# Restore from backup
pg_restore -d bantah backup_20260117.dump
```

## Data Migration Tips

### Populate Historical Data
If migrating from off-chain to on-chain:

```typescript
// Map old challenge data to blockchain schema
import { challenges as oldChallenges } from '@/shared/schema';

const dbChallenges = await db.select().from(oldChallenges);
for (const challenge of dbChallenges) {
  if (challenge.result) {
    // Determine winner
    const winner = challenge.result === 'challenger_won' 
      ? challenge.challenger 
      : challenge.challenged;

    // Award points retroactively
    await recordPointsTransaction({
      userId: winner,
      challengeId: challenge.id,
      transactionType: 'earned_challenge',
      amount: BigInt(challenge.amount || 0),
      reason: 'Migrated from off-chain',
    });
  }
}
```

## Database Maintenance

### Regular Tasks
```sql
-- Analyze tables for query optimization
ANALYZE user_points_ledgers;
ANALYZE blockchain_transactions;

-- Reindex if needed
REINDEX TABLE blockchain_transactions;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE tablename LIKE '%blockchain%' OR tablename LIKE '%points%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Complete!

Phase 3 database schema is ready. Next steps:
1. Run migration: `psql -U postgres -d bantah < migrations/phase3-blockchain.sql`
2. Initialize user data: Call `ensureUserPointsLedger()` for all users
3. Test with Phase 2 blockchain operations
4. Proceed to Phase 4: API Routes
