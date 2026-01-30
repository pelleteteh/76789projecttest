# Database Schema Updates for P2P Challenge System

## Summary
Added all necessary database tables and columns to support the P2P blockchain challenge system with Privy wallet integration.

---

## Changes Made

### 1. ✅ Notifications Table - `challengeId` Column (Migration 0005)
**File:** `migrations/0005_add_challenge_id_to_notifications.sql`

Added column to link notifications to challenges:
```sql
ALTER TABLE notifications
ADD COLUMN challenge_id INTEGER;
CREATE INDEX idx_notifications_challenge_id ON notifications(challenge_id);
```

**Purpose:** Track which challenge a notification is about
- When user is challenged: Notification linked to challenge ID
- When user accepts: Notification linked to challenge ID
- Enables quick lookups: "Show all notifications for challenge X"

---

### 2. ✅ Challenges Table - Blockchain Fields (Migration 0006)
**File:** `migrations/0006_add_p2p_blockchain_fields.sql`

Added 8 new columns for P2P blockchain integration:

| Column | Type | Purpose |
|--------|------|---------|
| `payment_token_address` | VARCHAR | ERC20 token contract (USDC, USDT) |
| `stake_amount_wei` | BIGINT | Stake amount in smallest unit |
| `on_chain_status` | VARCHAR | pending, submitted, confirmed, failed, completed |
| `creator_transaction_hash` | VARCHAR | Hash of creator's blockchain tx |
| `acceptor_transaction_hash` | VARCHAR | Hash of acceptor's blockchain tx |
| `blockchain_challenge_id` | VARCHAR | ID from ChallengeFactory contract |
| `blockchain_created_at` | TIMESTAMP | When tx confirmed on-chain |
| `blockchain_accepted_at` | TIMESTAMP | When acceptor signed and confirmed |

**Indexes Created:**
- `idx_challenges_on_chain_status` - Fast status lookups
- `idx_challenges_blockchain_id` - Link to on-chain contract
- `idx_challenges_payment_token` - Filter by payment token

**Flow Example:**
1. User creates challenge → `on_chain_status = 'pending'`
2. User signs with Privy → `creator_transaction_hash` set
3. Tx confirmed → `on_chain_status = 'confirmed'`, `blockchain_created_at` set
4. Opponent accepts → `acceptor_transaction_hash` set
5. Opponent tx confirmed → `blockchain_accepted_at` set, status → 'active'

---

### 3. ✅ User Wallet Addresses Table (Migration 0007)
**File:** `migrations/0007_create_user_wallet_addresses.sql`

New table to store blockchain wallet addresses per user:

```sql
CREATE TABLE user_wallet_addresses (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  chain_id INTEGER DEFAULT 84532,           -- Base Sepolia
  wallet_address VARCHAR NOT NULL,
  wallet_type VARCHAR NOT NULL,             -- privy, metamask, etc.
  is_verified BOOLEAN DEFAULT FALSE,
  verification_tx_hash VARCHAR,
  
  -- Cached balances
  usdc_balance BIGINT DEFAULT 0,
  usdt_balance BIGINT DEFAULT 0,
  points_balance BIGINT DEFAULT 0,
  native_balance BIGINT DEFAULT 0,
  
  -- Primary wallet selection
  is_primary BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  connected_at TIMESTAMP DEFAULT NOW(),
  last_balance_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_user_wallet UNIQUE (user_id, chain_id, wallet_address)
);
```

**Indexes:**
- `idx_wallet_address` - Lookup wallet by address
- `idx_wallet_user_chain` - List wallets for user on chain
- `idx_wallet_is_primary` - Find primary wallet quickly

**Purpose:**
- Store Privy embedded wallet address for each user
- Cache balance data for quick UI display
- Support multiple wallets per user
- Track wallet type and verification status

---

## Database Tables Ready for P2P Challenges

### Complete Schema for P2P Flow:

```
users (existing)
├── id, email, firstName, lastName, etc.

challenges (updated)
├── id, challenger, challenged, title, description
├── status, amount (stake), category
├── payment_token_address ✅ NEW
├── stake_amount_wei ✅ NEW
├── on_chain_status ✅ NEW
├── creator_transaction_hash ✅ NEW
├── acceptor_transaction_hash ✅ NEW
├── blockchain_challenge_id ✅ NEW
├── blockchain_created_at ✅ NEW
├── blockchain_accepted_at ✅ NEW
└── created_at, completed_at

notifications (updated)
├── id, userId, title, message, type
├── challengeId ✅ NEW
├── data, channels, priority
└── created_at, read

user_wallet_addresses (new table) ✅
├── id, user_id, wallet_address, chain_id
├── wallet_type, is_verified, is_primary
├── usdc_balance, usdt_balance, points_balance, native_balance
└── connected_at, updated_at
```

---

## API Integration Points

### `/api/challenges/create-p2p`
Uses new fields:
- Stores `paymentTokenAddress` (USDC/USDT contract)
- Stores `stakeAmountWei` (user's stake in wei)
- Sets `on_chain_status = 'pending'`
- Sends notification with `challengeId`

### `/api/challenges/:id/accept`
Updates fields:
- Sets `acceptor_transaction_hash` after user signs
- Updates `on_chain_status = 'confirmed'`
- Sets `blockchain_accepted_at` timestamp
- Sends notification with `challengeId`

---

## Ready for Testing

✅ Schema updated
✅ Migrations applied to Supabase
✅ All blockchain tracking fields in place
✅ Wallet management table created
✅ Notification linking working
✅ Indexes created for performance

**Next Steps:**
1. Create P2P challenge on /friends page
2. Sign with Privy wallet
3. Verify transaction hash stored in DB
4. Check notification delivery
5. Accept challenge from opponent
6. Verify blockchain tracking fields updated
