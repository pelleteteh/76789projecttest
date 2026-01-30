# Multi-Chain Deployment Guide

This guide explains how to deploy Bantah On-Chain Challenges to multiple blockchain networks: **Base Sepolia**, **Polygon Amoy**, and **Arbitrum Sepolia**.

## 🌍 Supported Networks

| Network | Chain ID | RPC URL | Block Explorer |
|---------|----------|---------|-----------------|
| **Base Sepolia** | 84532 | https://sepolia.base.org | https://sepolia.basescan.org |
| **Polygon Amoy** | 80002 | https://rpc-amoy.polygon.technology | https://amoy.polygonscan.com |
| **Arbitrum Sepolia** | 421614 | https://sepolia-rollup.arbitrum.io/rpc | https://sepolia.arbiscan.io |

## 📋 Prerequisites

1. **Hardhat Setup**: Contracts already configured in `hardhat.config.cjs`
2. **Admin Wallet**: Private key with test ETH on all 3 networks
3. **Environment Variables**: Copy `.env.multichain.template` to relevant vars in `.env.local`
4. **Compiled Contracts**: Run `npx hardhat compile` first

## 🚀 Deployment Process

### Step 1: Compile Contracts

```bash
cd contracts
npx hardhat compile
```

### Step 2: Setup Environment Variables

Copy the multi-chain template to `.env.local`:

```bash
cp .env.multichain.template .env.multichain-vars
```

Update `.env.local` with the variables from `.env.multichain-vars`, filling in contract addresses as they're deployed.

### Step 3: Ensure Admin Wallet Has Testnet Tokens

Get testnet ETH for all 3 networks:

- **Base Sepolia**: https://www.alchemy.com/faucets/base-sepolia
- **Polygon Amoy**: https://faucet.polygon.technology/
- **Arbitrum Sepolia**: https://faucet.arbitrum.io/

### Step 4: Deploy to All Chains

#### Deploy to All Chains at Once

```bash
cd contracts
npx ts-node deploy-multichain.ts all
```

#### Deploy to Specific Chain

```bash
# Base Sepolia
npx ts-node deploy-multichain.ts base-sepolia

# Polygon Amoy
npx ts-node deploy-multichain.ts polygon-amoy

# Arbitrum Sepolia
npx ts-node deploy-multichain.ts arbitrum-sepolia
```

### Step 5: Update Environment Variables

The deployment script generates `.env.base-sepolia`, `.env.polygon-amoy`, and `.env.arbitrum-sepolia` files.

Copy the contract addresses to `.env.local`:

```env
# Base Sepolia Contracts
VITE_BASE_POINTS_CONTRACT_ADDRESS="0x..."
VITE_BASE_CHALLENGE_FACTORY_ADDRESS="0x..."
VITE_BASE_CHALLENGE_ESCROW_ADDRESS="0x..."
VITE_BASE_POINTS_ESCROW_ADDRESS="0x..."

# Polygon Amoy Contracts
VITE_POLYGON_POINTS_CONTRACT_ADDRESS="0x..."
VITE_POLYGON_CHALLENGE_FACTORY_ADDRESS="0x..."
VITE_POLYGON_CHALLENGE_ESCROW_ADDRESS="0x..."
VITE_POLYGON_POINTS_ESCROW_ADDRESS="0x..."

# Arbitrum Sepolia Contracts
VITE_ARBITRUM_POINTS_CONTRACT_ADDRESS="0x..."
VITE_ARBITRUM_CHALLENGE_FACTORY_ADDRESS="0x..."
VITE_ARBITRUM_CHALLENGE_ESCROW_ADDRESS="0x..."
VITE_ARBITRUM_POINTS_ESCROW_ADDRESS="0x..."
```

## 🔌 Client-Side Chain Configuration

### Configuration Files

- **`/client/src/config/chains.ts`**: Centralized chain configuration with RPC URLs, contract addresses, and token mappings
- **`/client/src/hooks/useChain.ts`**: Global state management for current chain (with localStorage persistence)
- **`/client/src/components/ChainSwitcher.tsx`**: UI components for chain selection

### Using the Chain System

#### Get Current Chain Config

```typescript
import { useCurrentChain } from '@/hooks/useChain';

function MyComponent() {
  const chain = useCurrentChain();
  
  return <div>{chain.name} - {chain.blockExplorer}</div>;
}
```

#### Switch Chains

```typescript
import { useChainSwitch } from '@/hooks/useChain';

function ChainSelector() {
  const { switchChain, supportedChains } = useChainSwitch();
  
  const handleSwitch = (chainId) => {
    switchChain(chainId);
  };
  
  return (
    <select onChange={(e) => handleSwitch(Number(e.target.value))}>
      {supportedChains.map(chain => (
        <option key={chain.id} value={chain.id}>
          {chain.name}
        </option>
      ))}
    </select>
  );
}
```

#### Use Chain Switcher Component

```typescript
import { ChainSwitcher } from '@/components/ChainSwitcher';

function Navbar() {
  return (
    <nav>
      <ChainSwitcher />
    </nav>
  );
}
```

## 🎯 Smart Contract Deployment Details

### Deployment Order

Each chain deployment follows this order:

1. **BantahPoints** (ERC20 reward token)
2. **ChallengeEscrow** (Escrow contract for stakes)
3. **ChallengeFactory** (Main challenge orchestration)
4. **PointsEscrow** (Points distribution)
5. **Permissions Setup** (ChallengeFactory set as PointsManager)

### Contract Features

All contracts support:
- ✅ **Native ETH** payments (via `payable` functions)
- ✅ **ERC20 tokens** (USDT, USDC)
- ✅ **Same-currency payouts** (stakes returned in same token used)
- ✅ **Cross-chain compatible** (identical bytecode on all networks)

## 🔗 Cross-Chain Considerations

### Token Addresses

Token addresses vary per network. The `chains.ts` file includes correct addresses for each network:

```typescript
// Base Sepolia
USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b3566dA8860
USDT: 0x3c499c542cEF5E3811e1192ce70d8cC7d307B653

// Polygon Amoy
USDC: 0x41E94cB5eB3092Ec94a15db6B9123d1b2850b422
USDT: 0xB932d46b8e0f9ca6c1cA48E7da2Ca284bAAaC27A

// Arbitrum Sepolia
USDC: 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
USDT: 0xf66F95Dc9F28f82fAf3a3a1d25Ab4cF4c4b7298c
```

### Gas Costs

Approximate deployment costs per chain:

- **Base Sepolia**: ~0.05 ETH (low cost)
- **Polygon Amoy**: ~0.1 MATIC (~$0.01)
- **Arbitrum Sepolia**: ~0.03 ETH (low cost)

## 📊 Testing Multi-Chain Functionality

### 1. Test Chain Switching

```typescript
import { useChainSwitch } from '@/hooks/useChain';

function TestChainSwitch() {
  const { switchChain, supportedChains } = useChainSwitch();
  
  return (
    <div>
      {supportedChains.map(chain => (
        <button key={chain.id} onClick={() => switchChain(chain.id)}>
          Switch to {chain.name}
        </button>
      ))}
    </div>
  );
}
```

### 2. Test Challenge Creation on Each Chain

1. Open app and switch to Base Sepolia
2. Create ETH challenge → Verify transaction on Basescan
3. Switch to Polygon Amoy
4. Create USDC challenge → Verify transaction on Polygonscan
5. Switch to Arbitrum Sepolia
6. Create ETH challenge → Verify transaction on Arbiscan

### 3. Verify Contracts on Block Explorers

```bash
cd contracts

# Base Sepolia
npx hardhat verify --network base-sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>

# Polygon Amoy
npx hardhat verify --network polygon-amoy <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>

# Arbitrum Sepolia
npx hardhat verify --network arbitrum-sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

## 🆘 Troubleshooting

### "Invalid contract address" Error

**Problem**: Contract address not set in environment for current chain.

**Solution**: 
1. Check `.env.local` has `VITE_{CHAIN}_CHALLENGE_FACTORY_ADDRESS` set
2. Verify address is deployed on that chain
3. Check `chains.ts` for fallback values

### "Insufficient Balance" Error

**Problem**: Admin wallet doesn't have enough testnet tokens.

**Solution**: Get testnet tokens from faucets:
- Base: https://www.alchemy.com/faucets/base-sepolia
- Polygon: https://faucet.polygon.technology/
- Arbitrum: https://faucet.arbitrum.io/

### Chain Not Added to MetaMask

**Problem**: Wallet shows "network not recognized" on wallet_addEthereumChain.

**Solution**: The `useBlockchainChallenge.ts` hook automatically adds chains with correct RPC/explorer URLs.

### Transaction Fails on New Chain

**Problem**: Challenge creation fails after deploying to new chain.

**Solution**:
1. Verify contracts actually deployed (check block explorer)
2. Check contract addresses in `chains.ts`
3. Ensure admin has MATIC/ETH for gas
4. Hard refresh browser (Ctrl+Shift+R) to reload env vars

## 📝 Deployment Checklist

- [ ] Contracts compiled successfully
- [ ] Admin wallet has testnet tokens on all 3 networks
- [ ] Ran `npx ts-node deploy-multichain.ts all`
- [ ] Contract addresses copied to `.env.local`
- [ ] Dev server restarted with new env vars
- [ ] Browser hard refreshed (Ctrl+Shift+R)
- [ ] Chain switcher appears in UI
- [ ] Can switch between chains
- [ ] Can create challenges on each chain
- [ ] Transactions appear on block explorers
- [ ] Contract logic works across all networks

## 🔮 Next Steps

1. **Mainnet Deployment**: After testing thoroughly on testnets, deploy to:
   - Base Mainnet
   - Polygon Mainnet
   - Arbitrum Mainnet

2. **Token Bridges**: Consider cross-chain liquidity solutions

3. **User Education**: Document which network has cheapest gas for users

4. **Analytics**: Track which network users prefer and adjust accordingly

## 📚 Additional Resources

- [Base Docs](https://docs.base.org/)
- [Polygon Docs](https://polygon.technology/developers/)
- [Arbitrum Docs](https://docs.arbitrum.io/)
- [Hardhat Networks](https://hardhat.org/hardhat-runner/docs/config)
- [ethers.js Multi-Chain](https://docs.ethers.org/v6/getting-started/)

---

**Happy Multi-Chain Deploying! 🚀**
