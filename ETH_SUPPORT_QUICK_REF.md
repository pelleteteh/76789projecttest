# Quick Reference: ETH Support Changes

## Smart Contract Changes

### ChallengeFactory.sol

**Before:**
```solidity
function createP2PChallenge(
    address participant,
    address paymentToken,
    uint256 stakeAmount,
    uint256 pointsReward,
    string calldata metadataURI
) external nonReentrant returns (uint256)
```

**After:**
```solidity
function createP2PChallenge(
    address participant,
    address paymentToken,
    uint256 stakeAmount,
    uint256 pointsReward,
    string calldata metadataURI
) external payable nonReentrant returns (uint256)
```

**Logic Added:**
```solidity
if (paymentToken == address(0)) {
    require(msg.value == stakeAmount, "ETH amount mismatch");
} else {
    require(msg.value == 0, "Do not send ETH for ERC20");
    IERC20(paymentToken).safeTransferFrom(msg.sender, address(stakeEscrow), stakeAmount);
}
```

---

### ChallengeEscrow.sol

**lockStake() Changes:**
```solidity
// Before: require(token != address(0), "Invalid token");
// After: Removed - now accepts address(0) for ETH

if (token != address(0)) {
    IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
}
// ETH is already at contract via msg.value
```

**transferStake() Changes:**
```solidity
// Before: IERC20(token).safeTransfer(to, amount);
// After:
if (token == address(0)) {
    (bool success, ) = payable(to).call{value: amount}("");
    require(success, "ETH transfer failed");
} else {
    IERC20(token).safeTransfer(to, amount);
}
```

---

## Client Code Changes

### Token Addresses (Challenges.tsx)

```typescript
// Before
const TOKEN_ADDRESSES: Record<'USDT' | 'USDC', string> = {
  'USDT': '0x9eba...',
  'USDC': '0x036c...',
};

// After
const TOKEN_ADDRESSES: Record<'ETH' | 'USDT' | 'USDC', string> = {
  'ETH': '0x0000000000000000000000000000000000000000',
  'USDT': '0x9eba...',
  'USDC': '0x036c...',
};
```

### Transaction Sending (useBlockchainChallenge.ts)

```typescript
// Before
const tx = await contract.createP2PChallenge(...params);

// After
const isNativeETH = checksummedToken === '0x0000000000000000000000000000000000000000';

if (isNativeETH) {
  tx = await contract.createP2PChallenge(...params, { value: stakeWei });
} else {
  tx = await contract.createP2PChallenge(...params);
}
```

### Approval Flow (useBlockchainChallenge.ts)

```typescript
// Before - Always checked ERC20 allowance
const tokenContract = new ethers.Contract(params.paymentToken, ERC20_ABI, signer);
const allowance = await tokenContract.allowance(userAddress, FACTORY_ADDRESS);

// After - Only for non-ETH
if (params.paymentToken !== '0x0000000000000000000000000000000000000000') {
  const tokenContract = new ethers.Contract(params.paymentToken, ERC20_ABI, signer);
  const allowance = await tokenContract.allowance(userAddress, FACTORY_ADDRESS);
  // ... approval logic
}
```

---

## Function Signatures

### Create Challenge

```solidity
// ETH Challenge
createP2PChallenge(
  address(0),                              // opponent
  0x0000000000000000000000000000000000000000, // paymentToken = ETH
  100000000000000000,                      // stakeAmount = 0.1 ETH
  50,                                      // pointsReward
  "ipfs://metadata"                        // metadataURI
)
{ value: 100000000000000000 }              // ETH amount

// USDT Challenge
createP2PChallenge(
  address(0),                              // opponent
  0x9eba6af5f65ecb20e65c0c9e0b5cdbbbe9c5c00c0, // paymentToken = USDT
  100000000,                               // stakeAmount = 100 USDT
  50,                                      // pointsReward
  "ipfs://metadata"                        // metadataURI
)
// No { value: ... }
```

### Accept Challenge

```solidity
// ETH Challenge
acceptP2PChallenge(challengeId)
{ value: 100000000000000000 }              // ETH amount

// USDT Challenge
acceptP2PChallenge(challengeId)
// No { value: ... }
```

---

## Files Modified

1. `/contracts/src/ChallengeFactory.sol`
   - `createP2PChallenge()` - Added `payable`, ETH handling
   - `acceptP2PChallenge()` - Added `payable`, ETH handling
   - `withdrawPlatformFees()` - Updated for ETH transfers
   - Added `receive()` function

2. `/contracts/src/ChallengeEscrow.sol`
   - `lockStake()` - Removed ETH restriction
   - `transferStake()` - Added ETH transfer logic
   - Added `receive()` function

3. `/client/src/pages/Challenges.tsx`
   - Restored `'ETH'` to `TOKEN_ADDRESSES`

4. `/client/src/hooks/useBlockchainChallenge.ts`
   - `createP2PChallenge()` - Added ETH value parameter logic
   - `acceptP2PChallenge()` - Added ETH value parameter logic
   - Conditional ERC20 approval (only for non-ETH)

---

## Testing Commands

### Check Contract Compilation
```bash
cd /workspaces/udpabn474gvbewetyh/contracts
npx hardhat compile
```

### Deploy Contracts
```bash
export ADMIN_PRIVATE_KEY=<your_key>
npx ts-node deploy.ts
```

### Verify on Basescan
Visit: `https://sepolia.basescan.org/address/<FACTORY_ADDRESS>`

---

## Environment Variables to Update

After deployment, update `.env`:

```
VITE_CHALLENGE_FACTORY_ADDRESS=<new_deployed_address>
VITE_CHALLENGE_ESCROW_ADDRESS=<new_deployed_address>
VITE_POINTS_CONTRACT_ADDRESS=<new_deployed_address>
VITE_POINTS_ESCROW_ADDRESS=<new_deployed_address>
```

---

## Backward Compatibility

✅ All changes are backward compatible:
- Existing ERC20 challenges work unchanged
- Only new ETH challenges use the new payable functions
- No breaking changes to existing contract storage

---

## Gas Considerations

- **ETH transfers**: ~21,000 gas per transfer (vs ~65,000 for ERC20)
- **Platform fees**: Now accumulate in both ETH and ERC20 separately
- **Withdrawal cost**: Lower for ETH (direct transfer) vs ERC20 approval

---

**Created**: January 26, 2026
**Status**: Ready for deployment
**Network**: Base Sepolia (Chain ID: 84532)
