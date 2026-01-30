# System Architecture - Visual Overview

## Phase 4 Complete Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                                  │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ React Application (Privy Web3 Integration)                      │   │
│  │                                                                  │   │
│  │ ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐  │   │
│  │ │  Challenges    │  │  Leaderboard   │  │  Wallet Connect  │  │   │
│  │ │  Component     │  │  Component     │  │  Component       │  │   │
│  │ └────────────────┘  └────────────────┘  └──────────────────┘  │   │
│  │                                                                  │   │
│  │ ┌─────────────────────────────────────────────────────────┐   │   │
│  │ │            Privy Web3 Authentication                    │   │   │
│  │ │         (Wallet Connection & Signing)                  │   │   │
│  │ └─────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                               ↓ HTTP/JSON
┌─────────────────────────────────────────────────────────────────────────┐
│                     REST API LAYER (Phase 4)                            │
│                      27 Endpoints Across 4 Files                        │
│                                                                          │
│  ┌──────────────────────┐  ┌──────────────────────┐                    │
│  │ api-challenges.ts    │  │ api-payouts.ts       │                    │
│  │ ─────────────────    │  │ ─────────────────    │                    │
│  │ • /create-admin      │  │ • /claim             │                    │
│  │ • /create-p2p        │  │ • /status            │                    │
│  │ • /:id/join          │  │ • /user/:userId      │                    │
│  │ • /:id/accept        │  │ • /batch-claim       │                    │
│  │ • GET /:id           │  │                      │                    │
│  │ • GET /              │  │                      │                    │
│  │ • GET /user/:userId  │  │                      │                    │
│  └──────────────────────┘  └──────────────────────┘                    │
│                                                                          │
│  ┌──────────────────────┐  ┌──────────────────────┐                    │
│  │ api-points.ts        │  │ api-admin-resolve.ts │                    │
│  │ ─────────────────    │  │ ──────────────────   │                    │
│  │ • /balance           │  │ • /resolve           │                    │
│  │ • /transfer          │  │ • /batch-resolve     │                    │
│  │ • /leaderboard       │  │ • /pending           │                    │
│  │ • /history           │  │ • /by-status         │                    │
│  │ • /statistics        │  │ • /signing-stats     │                    │
│  │ • /connect-wallet    │  │ • /verify-resolution │                    │
│  │ • /wallets           │  │ • /:id/history       │                    │
│  │ • /set-primary       │  │                      │                    │
│  └──────────────────────┘  └──────────────────────┘                    │
│                                                                          │
│             ↓ Request routing, validation, auth checks ↓               │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────┐          │
│  │         Authentication & Authorization Middleware         │          │
│  │  • Privy token verification                               │          │
│  │  • Admin token verification                               │          │
│  │  • User permission checks                                 │          │
│  └──────────────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                   BLOCKCHAIN SERVICE LAYER (Phase 2)                    │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────┐          │
│  │              Blockchain Client (ethers.js v6)             │          │
│  │ • RPC connection to Base Testnet Sepolia                 │          │
│  │ • Contract instance management (singleton)               │          │
│  └──────────────────────────────────────────────────────────┘          │
│                               ↓                                         │
│  ┌──────────────────────────────────────────────────────────┐          │
│  │              Blockchain Helpers                           │          │
│  │ • createAdminChallenge()                                  │          │
│  │ • createP2PChallenge()                                    │          │
│  │ • joinAdminChallenge()                                    │          │
│  │ • acceptP2PChallenge()                                    │          │
│  │ • claimPayout()                                           │          │
│  │ • resolveChallenge()                                      │          │
│  │ • getUserPointsBalance()                                  │          │
│  │ • approveToken()                                          │          │
│  └──────────────────────────────────────────────────────────┘          │
│                               ↓                                         │
│  ┌──────────────────────────────────────────────────────────┐          │
│  │              Admin Signing Service                        │          │
│  │ • signChallengeResolution()    (ECDSA)                   │          │
│  │ • verifyChallengeSignature()   (On-chain)                │          │
│  │ • batchSignChallenges()        (Efficient)               │          │
│  └──────────────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                  DATABASE LAYER (Phase 3)                               │
│                    PostgreSQL + Drizzle ORM                             │
│                                                                          │
│  ┌────────────────────────────────────────────────────────┐            │
│  │              Database Utility Functions                │            │
│  │  • recordPointsTransaction()                           │            │
│  │  • createEscrowRecord()                                │            │
│  │  • recordContractDeployment()                          │            │
│  │  • addUserWallet()                                     │            │
│  │  • updateChallengeStatus()                             │            │
│  │  • 20+ more utility functions                          │            │
│  └────────────────────────────────────────────────────────┘            │
│                               ↓                                         │
│  ┌────────────────────────────────────────────────────────┐            │
│  │              Database Schema (7 tables)                │            │
│  │                                                        │            │
│  │  • user_points_ledgers       (balance tracking)       │            │
│  │  • points_transactions       (points history)         │            │
│  │  • blockchain_transactions   (tx log)                 │            │
│  │  • challenge_escrow_records  (escrow tracking)        │            │
│  │  • contract_deployments      (contract addresses)     │            │
│  │  • admin_signatures_log      (admin actions)          │            │
│  │  • user_wallet_addresses     (wallet management)      │            │
│  │                                                        │            │
│  │  Enhanced Table:                                       │            │
│  │  • challenges (+ 20 blockchain fields)                │            │
│  │                                                        │            │
│  │  Indexes:        25+                                   │            │
│  │  Views:          3 (leaderboard, stats, history)      │            │
│  │  Procedures:     2 (batch operations)                 │            │
│  └────────────────────────────────────────────────────────┘            │
│                               ↓                                         │
│  ┌────────────────────────────────────────────────────────┐            │
│  │         State Management & Audit Trail                 │            │
│  │  • Transaction hashes logged                           │            │
│  │  • Block numbers recorded                              │            │
│  │  • Admin actions timestamped                           │            │
│  │  • All changes queryable                               │            │
│  └────────────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────────┐
│              SMART CONTRACTS LAYER (Phase 1)                            │
│           Base Testnet Sepolia (Chain ID: 84532)                        │
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐     │
│  │ BantahPoints     │  │ ChallengeFactory │  │ PointsEscrow     │     │
│  │ ─────────────    │  │ ────────────────  │  │ ────────────────  │     │
│  │ • ERC-20 Token   │  │ • Challenge logic │  │ • Escrow manage  │     │
│  │ • 1M supply      │  │ • Settlement      │  │ • Lock/release   │     │
│  │ • 18 decimals    │  │ • Payouts         │  │ • Transfers      │     │
│  │ • Award/burn     │  │ • Admin signing   │  │                  │     │
│  │                  │  │ • 0.1% fee        │  │                  │     │
│  │                  │  │                   │  │                  │     │
│  │ ┌──────────────┐ │  │ ┌──────────────┐ │  │ ┌──────────────┐ │     │
│  │ │   USDC Tokens│ │  │ │   Admin Sig  │ │  │ │   Escrow State│ │     │
│  │ │ (approved by │ │  │ │  (ECDSA)    │ │  │ │  (Atomic)     │ │     │
│  │ │   users)     │ │  │ │             │ │  │ │               │ │     │
│  │ └──────────────┘ │  │ └──────────────┘ │  │ └──────────────┘ │     │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘     │
│                                                                          │
│  Features:                                                              │
│  • Trustless escrow (atomic settlement)                                │
│  • Admin authority (ECDSA signatures)                                  │
│  • Platform fee collection (0.1%)                                      │
│  • Points economy (ERC-20 tradeable)                                   │
│  • Replay attack prevention                                            │
│  • Gas sponsorship (Paymaster)                                         │
└─────────────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    USER WALLETS & TOKENS                                │
│                                                                          │
│  • USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b3566dA8860                   │
│  • USDT: 0x3c499c542cEF5E3811e1192ce70d8cC7d307B653                   │
│  • Paymaster: Gas sponsorship (users don't pay)                        │
│  • User Wallets: Connected via Privy Web3                              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Create Challenge

```
User submits form
        ↓
Frontend: POST /api/challenges/create-admin
        ↓
Backend: Validate input (auth, amounts, tokens)
        ↓
Database: Record in challenges table (pending)
        ↓
Blockchain: Call createAdminChallenge()
        ↓
Database: Update blockchain_transactions table
        ↓
Response: Challenge ID + transaction hash
        ↓
Frontend: Show success, update UI
```

---

## Data Flow: Claim Payout

```
Winner calls claim
        ↓
Frontend: POST /api/payouts/:challengeId/claim
        ↓
Backend: Verify winner status
        ↓
Database: Check escrow record
        ↓
Blockchain: Call claimPayout() on smart contract
        ↓
Database: Log transaction, mark as claimed
        ↓
Response: Success + transaction hash
        ↓
Frontend: Show confirmation
```

---

## Data Flow: Admin Resolution

```
Admin reviews challenge
        ↓
Admin submits resolution
        ↓
Frontend: POST /api/admin/challenges/resolve
        ↓
Backend: Verify admin token
        ↓
Signing: Admin signs resolution (ECDSA)
        ↓
Blockchain: Call resolveChallenge() with signature
        ↓
Smart Contract: Verify signature on-chain
        ↓
Database: Award points, log resolution
        ↓
Response: Success + transaction hash
        ↓
Frontend: Update challenge status
```

---

## Technology Stack

```
Layer               Technology          Version    Purpose
─────────────────────────────────────────────────────────────────
Frontend            React + TypeScript   Latest     UI/UX
                    Privy Web3          Latest     Wallet connection
                    
REST API            Express.js          4.x        Web framework
                    TypeScript          5.x        Type safety
                    Node.js             18+        Runtime
                    
Blockchain          ethers.js           v6         Contract interaction
                    Solidity            0.8.x      Smart contracts
                    Base Testnet        Sepolia    Test network
                    
Database            PostgreSQL          14+        Data persistence
                    Drizzle ORM         Latest     Type-safe queries
                    
Dev Tools           Hardhat             Latest     Contract development
                    Vitest              Latest     Testing
                    TypeScript          5.x        Type checking
```

---

## Security Model

```
┌──────────────────────────────────────────────────┐
│           SECURITY LAYERS                         │
├──────────────────────────────────────────────────┤
│                                                   │
│ Layer 1: Authentication                          │
│  • Privy Web3 wallet login                       │
│  • JWT token verification                        │
│  • Admin token separate from user token          │
│                                                   │
│ Layer 2: Authorization                           │
│  • User can only access own resources            │
│  • Admin required for resolution                 │
│  • Ownership checks on all operations            │
│                                                   │
│ Layer 3: Input Validation                        │
│  • All inputs validated on backend               │
│  • Type checking with TypeScript                 │
│  • Zod schemas for request validation            │
│                                                   │
│ Layer 4: Blockchain Verification                 │
│  • Admin signatures verified on-chain (ECDSA)    │
│  • Transaction receipts verified                 │
│  • Replay attack prevention (nonce)              │
│                                                   │
│ Layer 5: Database Constraints                    │
│  • Foreign key relationships                     │
│  • Not null constraints                          │
│  • Check constraints                             │
│  • Unique constraints on addresses               │
│                                                   │
│ Layer 6: Escrow Mechanism                        │
│  • Funds locked until resolution                 │
│  • Prevents double-spending                      │
│  • Atomic operations on-chain                    │
│                                                   │
│ Layer 7: Audit Trail                             │
│  • All actions logged with timestamps            │
│  • Transaction hashes recorded                   │
│  • Admin actions tracked                         │
│  • Complete history queryable                    │
│                                                   │
└──────────────────────────────────────────────────┘
```

---

## Integration Checklist

- [ ] Phase 1: Smart Contracts deployed
- [ ] Phase 2: Blockchain client running
- [ ] Phase 3: Database migrations applied
- [ ] Phase 4: Routes registered in server/index.ts
- [ ] Frontend: Components updated
- [ ] Testing: All endpoints verified
- [ ] Security: Audit passed
- [ ] Deployment: Live on production

---

Generated: January 17, 2026
