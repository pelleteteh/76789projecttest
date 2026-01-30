# ETH Support Upgrade - Smart Contracts & Client

## Summary of Changes

The smart contracts and client code have been updated to support native ETH as a payment token for all challenge types (open, direct, and group). Users can now stake ETH and receive payouts in the same currency they used to create the challenge.

### Key Updates

#### 1. **ChallengeFactory.sol** (`/contracts/src/ChallengeFactory.sol`)

**Function Changes:**
- `createP2PChallenge()` - Now `payable`, accepts ETH via `msg.value`
  - If `paymentToken == address(0)`: Expects `msg.value == stakeAmount`
  - If `paymentToken != address(0)`: Uses ERC20 transfer, requires `msg.value == 0`
  
- `acceptP2PChallenge()` - Now `payable`, accepts ETH via `msg.value`
  - Same logic as create: validates ETH/ERC20 matching

- `withdrawPlatformFees()` - Updated to handle both ETH and ERC20
  - ETH: Uses `call{value: amount}("")`
  - ERC20: Uses standard `safeTransfer()`

- Added `receive() external payable {}` to accept incoming ETH

#### 2. **ChallengeEscrow.sol** (`/contracts/src/ChallengeEscrow.sol`)

**Function Changes:**
- `lockStake()` - Now handles both ETH and ERC20
  - Removed requirement that `token != address(0)`
  - Only transfers ERC20 if `token != address(0)`
  - ETH is already at contract via ChallengeFactory's payable function

- `transferStake()` - Updated to handle ETH transfers
  - Uses `call{value: amount}("")` for ETH (address(0))
  - Uses `safeTransfer()` for ERC20 tokens

- Added `receive() external payable {}` to accept incoming ETH

**Documentation:**
- Updated comments to reflect ETH support throughout

#### 3. **Client Code** (`/client/src/`)

**File: `pages/Challenges.tsx`**
- Restored ETH to `TOKEN_ADDRESSES` mapping
- Uses `0x0000000000000000000000000000000000000000` for native ETH

**File: `hooks/useBlockchainChallenge.ts`**
- `createP2PChallenge()` function:
  - Added logic to detect if `paymentToken` is ETH (zero address)
  - If ETH: Sends transaction with `{ value: stakeWei }`
  - If ERC20: Sends transaction without value, includes ERC20 approval flow
  
- `acceptP2PChallenge()` function:
  - Same ETH vs ERC20 detection logic
  - Only ERC20 requires approval check

---

## Deployment Instructions

### Prerequisites
```bash
cd /workspaces/udpabn474gvbewetyh/contracts
npm install  # Install dependencies if not already done
```

### Step 1: Compile Contracts

```bash
cd /workspaces/udpabn474gvbewetyh/contracts
npx hardhat compile
```

**Expected Output:**
```
Compiling 23 files with 0.8.20
Compilation successful
```

### Step 2: Deploy to Base Sepolia

```bash
export ADMIN_PRIVATE_KEY=<your_private_key>
npx ts-node deploy.ts
```

**What this does:**
1. Deploys `BantahPoints` token
2. Deploys `ChallengeEscrow` contract
3. Deploys `ChallengeFactory` contract (updated with ETH support)
4. Deploys `PointsEscrow` contract
5. Sets up permissions between contracts
6. Generates `.env.base-sepolia` with all contract addresses

**Output Example:**
```
✅ Deployment Complete!

📄 Contract Addresses:
   BantahPoints: 0x...
   ChallengeFactory: 0x...
   ChallengeEscrow: 0x...
   PointsEscrow: 0x...

📝 Environment variables saved to .env.base-sepolia
```

### Step 3: Update Environment Variables

Copy the new contract addresses from `.env.base-sepolia` to your `.env` file:

```bash
# From deployment output
VITE_CHALLENGE_FACTORY_ADDRESS=<new_factory_address>
VITE_CHALLENGE_ESCROW_ADDRESS=<new_escrow_address>
VITE_POINTS_CONTRACT_ADDRESS=<points_address>
VITE_POINTS_ESCROW_ADDRESS=<points_escrow_address>
```

### Step 4: Verify Deployment on Basescan

Visit: `https://sepolia.basescan.org/address/<VITE_CHALLENGE_FACTORY_ADDRESS>`

Verify:
- Contract source code is visible
- Functions match the updated ABI (payable functions)

---

## Challenge Creation Flow (Updated)

### Creating a P2P Challenge with ETH

```javascript
// Client code will:
1. Detect payment token is address(0) (ETH)
2. Calculate stake amount in wei (e.g., 0.1 ETH = 100000000000000000 wei)
3. Send transaction with { value: stakeWei }
4. Contract receives ETH and stores in escrow

const tx = await contract.createP2PChallenge(
  opponentAddress,      // address
  '0x0000...0000',      // paymentToken = ETH (zero address)
  '100000000000000000', // stakeAmount = 0.1 ETH in wei
  '50',                 // pointsReward
  'ipfs://...',         // metadataURI
  { value: '100000000000000000' } // Send ETH
);
```

### Creating a P2P Challenge with USDT

```javascript
// Client code will:
1. Detect payment token is not address(0) (USDT)
2. Check and request ERC20 approval if needed
3. Send transaction WITHOUT value parameter
4. Contract transfers USDT from user to escrow

const tx = await contract.createP2PChallenge(
  opponentAddress,
  '0x9eba...c00c0',    // paymentToken = USDT
  '100000000',         // stakeAmount = 100 USDT (in wei)
  '50',                // pointsReward
  'ipfs://...'         // metadataURI
  // No { value: ... } for ERC20
);
```

### Accepting a Challenge (Same Logic)

```javascript
// ETH challenge - send value
const tx = await contract.acceptP2PChallenge(
  challengeId,
  { value: stakeAmount } // If created with ETH
);

// ERC20 challenge - no value
const tx = await contract.acceptP2PChallenge(challengeId); // If created with USDT/USDC
```

---

## Testing Checklist

After deployment:

- [ ] Can create ETH challenge (0.01 ETH stakes)
- [ ] Can create USDT challenge (100 USDT stakes)
- [ ] Can create USDC challenge (100 USDC stakes)
- [ ] Can accept ETH challenge
- [ ] Can accept USDT challenge
- [ ] Can accept USDC challenge
- [ ] Payout is in correct currency (ETH challenges pay out in ETH)
- [ ] Platform fees accumulate correctly
- [ ] Admin can withdraw platform fees (both ETH and ERC20)

---

## Key Implementation Details

### ETH Detection
```javascript
const isNativeETH = paymentToken === '0x0000000000000000000000000000000000000000';
```

### ETH vs ERC20 in Contract
- **ETH**: `address(0)` → No ERC20 calls, just store `msg.value`
- **ERC20**: Non-zero address → Call `safeTransferFrom()`, then `lockStake()`

### Platform Fee Handling
```solidity
// For ETH
(bool success, ) = payable(recipient).call{value: amount}("");

// For ERC20
IERC20(token).safeTransfer(recipient, amount);
```

---

## Rollback Plan (if needed)

If issues arise:

1. Keep old contract addresses
2. Deploy new contracts with original code
3. Update `.env` with old contract addresses
4. Switch back in client code

The new contracts are backward compatible with existing challenges, so you can deploy alongside old contracts temporarily.

---

## Contract Addresses (After Deployment)

Update your `.env` file with these values from deployment output:

```
VITE_CHALLENGE_FACTORY_ADDRESS=<deployed_address>
VITE_CHALLENGE_ESCROW_ADDRESS=<deployed_address>
VITE_POINTS_CONTRACT_ADDRESS=<deployed_address>
VITE_POINTS_ESCROW_ADDRESS=<deployed_address>
```

---

## Next Steps

1. **Compile**: `npx hardhat compile`
2. **Deploy**: `ADMIN_PRIVATE_KEY=<key> npx ts-node deploy.ts`
3. **Verify**: Check Basescan for deployed contracts
4. **Test**: Create challenges with ETH and ERC20
5. **Monitor**: Watch gas costs and platform fee accumulation

---

**Last Updated**: January 26, 2026
**Contract Version**: 2.0 (ETH Support)
**Network**: Base Sepolia Testnet (Chain ID: 84532)
