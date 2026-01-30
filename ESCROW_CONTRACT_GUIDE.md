# Escrow Contract - Check Stakes Guide

## Contract Address (Base Sepolia)
```
0xcc457aA3A7516bC817C6Cd0fB5B78e21aDc69390
```

## How to Check Stakes on BaseScan

### 1. **View All Stakes for a Challenge**

**Contract Function:** `getChallengeStakes(uint256 challengeId)`

Go to: https://basescan.org/address/0xcc457aA3A7516bC817C6Cd0fB5B78e21aDc69390#readContract

Look for **"getChallengeStakes"** → Input challengeId → Read

Returns array of stakes:
```
[
  {
    token: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 (USDC),
    amount: 1000000 (1 USDC),
    lockedAt: 1706390400,
    challengeId: 123,
    released: false
  },
  {
    token: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 (USDC),
    amount: 1000000 (1 USDC),
    lockedAt: 1706390401,
    challengeId: 123,
    released: false
  }
]
```

**What to look for:**
- ✅ **token** = USDC/ETH address
- ✅ **amount** = Stake in wei (divide by 1e6 for USDC, 1e18 for ETH)
- ✅ **released** = false (still locked), or true (released to winner)

---

### 2. **View Participants in Challenge**

**Contract Function:** `getChallengeParticipants(uint256 challengeId)`

Go to: BaseScan → Contract → Read Contract → "getChallengeParticipants"

Input challengeId → Read

Returns:
```
[
  0x2f250c04...ee3e72033  (Challenger/Creator)
  0x741Bc715...1b00fa958  (Opponent who accepted)
]
```

**Matches with stakes:**
- Participant[0] → Stake[0] (Creator's stake)
- Participant[1] → Stake[1] (Opponent's stake)

---

### 3. **Check Total Locked Amount Per User**

**Contract Function:** `getTotalLockedByToken(address user, address token)`

Go to: BaseScan → Contract → Read Contract → "getTotalLockedByToken"

Input:
- user: `0x2f250c04...ee3e72033`
- token: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` (USDC)

Returns: `5000000` (5 USDC locked by this user across all challenges)

---

## Contract Structure

### LockedStake Struct
```solidity
struct LockedStake {
    address token;           // ERC20 token address (address(0) for ETH)
    uint256 amount;          // Amount in wei
    uint256 lockedAt;        // When locked (timestamp)
    uint256 challengeId;     // Which challenge
    bool released;           // Is it released/claimed?
}
```

### Key Mappings

```solidity
// Stakes for each challenge
mapping(uint256 => LockedStake[]) public challengeStakes;
// Example: challengeStakes[123] = [stake1, stake2]

// All participants in a challenge
mapping(uint256 => address[]) public challengeParticipants;
// Example: challengeParticipants[123] = [0x123..., 0x456...]

// Total locked by user per token
mapping(address => mapping(address => uint256)) public totalLockedByToken;
// Example: totalLockedByToken[0x123...][0xUSDC] = 1000000
```

---

## Reading Stakes - Step by Step

### Example Challenge: ID 123

**Step 1:** Get participants
```
getChallengeParticipants(123)
→ [0x2f250c04...ee3e72033, 0x741Bc715...1b00fa958]
```

**Step 2:** Get stakes
```
getChallengeStakes(123)
→ [
    {token: USDC, amount: 1000000, released: false},
    {token: USDC, amount: 1000000, released: false}
  ]
```

**Step 3:** Match them
```
Challenger: 0x2f250c04...ee3e72033
  → Stake: 1 USDC
  → Locked: Yes (released=false)

Opponent: 0x741Bc715...1b00fa958
  → Stake: 1 USDC
  → Locked: Yes (released=false)

Total in Escrow: 2 USDC
```

---

## On BaseScan - Transactions Tab

### View All "Create P2P Chall" Transactions

Go to: https://basescan.org/address/0xcc457aA3A7516bC817C6Cd0fB5B78e21aDc69390#txs

You'll see:
```
Txn Hash                                    Method              Block   From              Amount
0x6b0e6cdf...a5ce3f8                       Create P2P Chall    36918875  0x2f250c...     0.00003139 ETH
0xd714aec9...8821d1                        Create P2P Chall    36917466  0x2f250c...     0.000015 ETH
0x71382b58...b764304                       Create P2P Chall    36917429  0x741Bc7...     0.0007 ETH
```

**Amount column** = User's stake transferred to escrow

---

## Key Points

### Creator's Stake
- Transferred when creator accepts challenge
- Amount shown in transaction: The stake in ETH/USDC
- Gas fee: Separate, tiny amount (~0.00000040 ETH on testnet)

### Opponent's Stake
- Transferred when opponent accepts challenge  
- Triggers `lockStake()` function
- Amount matches creator's stake

### Escrow Status
- **Before acceptance:** Only 1 stake in escrow (creator's)
- **After acceptance:** Both stakes in escrow
- **On resolution:** Stakes transferred from escrow to winner

---

## Contract Functions Summary

| Function | Input | Output | Purpose |
|----------|-------|--------|---------|
| `lockStake()` | user, token, amount, challengeId | - | Lock stake in escrow |
| `getChallengeStakes()` | challengeId | LockedStake[] | See all stakes for challenge |
| `getChallengeParticipants()` | challengeId | address[] | See who's in challenge |
| `getTotalLockedByToken()` | user, token | uint256 | Total locked by user |
| `releaseStakes()` | challengeId, users[] | - | Release if challenge cancelled |
| `transferStake()` | from, to, token, amount, challengeId | - | Move stake from loser to winner |

