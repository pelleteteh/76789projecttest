## ✅ Multi-Chain Integration Checklist

This checklist helps you integrate the multi-chain system into your existing Bantah platform.

### 🔧 Phase 1: Backend Setup (Contracts)

- [ ] Review `contracts/hardhat.config.cjs` - already configured for 3 chains
- [ ] Review `contracts/deploy-multichain.ts` - deployment script ready
- [ ] Ensure contracts compiled: `cd contracts && npx hardhat compile`
- [ ] Get testnet ETH on all 3 networks from faucets
- [ ] Deploy to all chains: `npx ts-node deploy-multichain.ts all`
- [ ] Save contract addresses from `.env.base-sepolia`, `.env.polygon-amoy`, `.env.arbitrum-sepolia`

### 🎨 Phase 2: Client Configuration (Configuration)

- [ ] Review `client/src/config/chains.ts` - already created with all 3 chains
  - Contains: RPC URLs, block explorers, contract addresses, token addresses
  - Supports environment variable overrides per chain

- [ ] Copy chain variables to `.env.local`:
  ```bash
  # Copy from template
  cp .env.multichain.template temp-vars.txt
  
  # Extract and add to .env.local:
  VITE_BASE_POINTS_CONTRACT_ADDRESS=0x...
  VITE_BASE_CHALLENGE_FACTORY_ADDRESS=0x...
  VITE_POLYGON_POINTS_CONTRACT_ADDRESS=0x...
  # ... etc for all chains
  ```

### 🪝 Phase 3: State Management (Zustand Hook)

- [ ] Review `client/src/hooks/useChain.ts` - Zustand store ready
  - `useChain()` - Global chain state with localStorage persistence
  - `useCurrentChain()` - Get current chain config
  - `useChainSwitch()` - Switch chains and list supported chains

- [ ] No additional installation needed (zustand already in dependencies)

- [ ] Test in component:
  ```typescript
  import { useCurrentChain } from '@/hooks/useChain';
  const chain = useCurrentChain();
  console.log(`Current chain: ${chain.name}`);
  ```

### 🧩 Phase 4: UI Components (Chain Switcher)

- [ ] Review `client/src/components/ChainSwitcher.tsx` - Components ready
  - `<ChainSwitcher />` - Full chain selector with network status
  - `<ChainSwitcherCompact />` - Minimal version for navbar
  - `<NetworkStatusBadge />` - Just show current network name

- [ ] Add to your layout/navbar:
  ```typescript
  import { ChainSwitcher } from '@/components/ChainSwitcher';
  
  export function Navbar() {
    return (
      <nav>
        <Logo />
        <Nav items={...} />
        <ChainSwitcher />  {/* Add here */}
        <UserMenu />
      </nav>
    );
  }
  ```

- [ ] Or use compact version for tight spaces:
  ```typescript
  import { ChainSwitcherCompact } from '@/components/ChainSwitcher';
  
  <ChainSwitcherCompact />
  ```

### 🔗 Phase 5: Challenge Hook Integration

- [ ] Review `client/src/hooks/useBlockchainChallenge.ts` - Already supports multi-chain
  - Already has `CHAIN_CONFIGS` for all 3 networks
  - Already has `switchChain()` function
  - Contract addresses pulled from `CHAIN_CONFIGS` based on `currentChainId`
  - Transactions sent to correct RPC based on current chain

- [ ] Verify hook integration:
  ```typescript
  import { useBlockchainChallenge } from '@/hooks/useBlockchainChallenge';
  
  const {
    createP2PChallenge,
    acceptP2PChallenge,
    switchChain,
  } = useBlockchainChallenge();
  
  // Hook automatically uses current chain from useChain store
  ```

### 📝 Phase 6: Environment Variables

- [ ] Update `.env.local` with all 3 chain configurations:
  ```env
  # Base Sepolia (from deploy)
  VITE_BASE_POINTS_CONTRACT_ADDRESS=0x...
  VITE_BASE_CHALLENGE_FACTORY_ADDRESS=0x...
  VITE_BASE_CHALLENGE_ESCROW_ADDRESS=0x...
  VITE_BASE_POINTS_ESCROW_ADDRESS=0x...
  
  # Polygon Amoy (from deploy)
  VITE_POLYGON_POINTS_CONTRACT_ADDRESS=0x...
  VITE_POLYGON_CHALLENGE_FACTORY_ADDRESS=0x...
  VITE_POLYGON_CHALLENGE_ESCROW_ADDRESS=0x...
  VITE_POLYGON_POINTS_ESCROW_ADDRESS=0x...
  
  # Arbitrum Sepolia (from deploy)
  VITE_ARBITRUM_POINTS_CONTRACT_ADDRESS=0x...
  VITE_ARBITRUM_CHALLENGE_FACTORY_ADDRESS=0x...
  VITE_ARBITRUM_CHALLENGE_ESCROW_ADDRESS=0x...
  VITE_ARBITRUM_POINTS_ESCROW_ADDRESS=0x...
  ```

- [ ] Verify chain RPC variables (optional, default values in chains.ts):
  ```env
  VITE_BASE_SEPOLIA_RPC=https://sepolia.base.org
  VITE_POLYGON_AMOY_RPC=https://rpc-amoy.polygon.technology
  VITE_ARBITRUM_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc
  ```

### 🚀 Phase 7: Testing

- [ ] Start dev server:
  ```bash
  npm run dev
  ```

- [ ] Hard refresh browser (Ctrl+Shift+R) to load new environment

- [ ] Test on Base Sepolia (default):
  - [ ] Create ETH challenge
  - [ ] Create USDC challenge
  - [ ] Verify transactions on Basescan

- [ ] Test chain switching:
  - [ ] Click on ChainSwitcher in UI
  - [ ] Select Polygon Amoy
  - [ ] Verify contract address changed in console logs
  - [ ] Create USDT challenge
  - [ ] Verify transaction on Polygonscan

- [ ] Test on Arbitrum Sepolia:
  - [ ] Switch to Arbitrum Sepolia
  - [ ] Create ETH challenge
  - [ ] Verify transaction on Arbiscan

- [ ] Test persistence:
  - [ ] Switch to Polygon Amoy
  - [ ] Refresh page
  - [ ] Verify still on Polygon Amoy (localStorage persistence works)

### 🐛 Phase 8: Debugging

- [ ] Open browser console (F12)
- [ ] Look for chain switching logs:
  ```
  📍 Network: Base Sepolia (Chain ID: 84532)
  📋 Contract address: 0x...
  💳 Awaiting user to sign transaction...
  ```

- [ ] Check environment variables loaded:
  ```javascript
  // In browser console:
  console.log(import.meta.env.VITE_BASE_CHALLENGE_FACTORY_ADDRESS);
  console.log(import.meta.env.VITE_POLYGON_CHALLENGE_FACTORY_ADDRESS);
  ```

- [ ] If old contract address still used:
  - [ ] Kill dev server: `pkill -9 "npm run dev"`
  - [ ] Restart: `npm run dev`
  - [ ] Hard refresh browser (Ctrl+Shift+R)

### 📊 Phase 9: Monitoring

- [ ] Add chain info to user dashboard:
  ```typescript
  import { useCurrentChain } from '@/hooks/useChain';
  
  export function Dashboard() {
    const chain = useCurrentChain();
    return (
      <div>
        <p>Current Network: {chain.name}</p>
        <p>Chain ID: {chain.id}</p>
        <p>Explorer: {chain.blockExplorer}</p>
      </div>
    );
  }
  ```

- [ ] Add network indicator to challenge details:
  ```typescript
  <div>
    <p>Created on {chain.name}</p>
    <p>
      View on{' '}
      <a href={`${chain.blockExplorer}/tx/${txHash}`}>
        {chain.blockExplorer.split('/')[2]}
      </a>
    </p>
  </div>
  ```

### 🔄 Phase 10: Maintenance

- [ ] Update contract addresses when deploying to mainnet:
  - [ ] Update `VITE_BASE_POINTS_CONTRACT_ADDRESS` for Base Mainnet
  - [ ] Update `VITE_POLYGON_POINTS_CONTRACT_ADDRESS` for Polygon Mainnet
  - [ ] Update `VITE_ARBITRUM_POINTS_CONTRACT_ADDRESS` for Arbitrum Mainnet

- [ ] Update token addresses if using different tokens:
  - [ ] USDC addresses per network
  - [ ] USDT addresses per network

- [ ] Monitor deployment:
  - [ ] Track which chain users prefer
  - [ ] Monitor gas costs per chain
  - [ ] Adjust marketing based on network adoption

### 📚 Phase 11: Documentation

- [ ] Read `MULTICHAIN_DEPLOYMENT_GUIDE.md` - Complete deployment guide
- [ ] Read `MULTICHAIN_SETUP_SUMMARY.md` - Quick reference card
- [ ] Review `client/src/config/chains.ts` - Configuration structure
- [ ] Review `client/src/hooks/useChain.ts` - State management API
- [ ] Review `client/src/components/ChainSwitcher.tsx` - UI component usage

### 🎯 Phase 12: Final Verification

- [ ] All 3 chains listed in chain switcher UI
- [ ] Chain switching updates contract addresses
- [ ] Challenge creation works on all 3 networks
- [ ] Transactions appear on correct block explorers
- [ ] User's chain preference persists after page refresh
- [ ] All tests pass: `npm test` (if tests exist)
- [ ] No TypeScript errors: `npm run check`
- [ ] Ready for QA testing

### 🚀 Go Live Preparation

- [ ] Test with MetaMask connected to all 3 networks
- [ ] Test with other wallets (Coinbase, WalletConnect, etc.)
- [ ] Create user documentation for network switching
- [ ] Brief customer support on how networks work
- [ ] Monitor mainnet faucets (if available)
- [ ] Set up cross-chain bridge info (optional)
- [ ] Create blog post about multi-chain support
- [ ] Ready to announce multi-chain support!

---

## Quick Command Reference

```bash
# Setup & Deployment
cd contracts
npx hardhat compile                     # Compile all contracts
npx ts-node deploy-multichain.ts all    # Deploy to all 3 chains
npx ts-node deploy-multichain.ts base-sepolia    # Deploy to Base only

# Environment
cp .env.multichain.template .env.multichain-vars  # Copy template
# Edit .env.local with contract addresses

# Development
cd ..
npm run dev                             # Start dev server
# Ctrl+Shift+R in browser               # Hard refresh to load new env

# Testing
npm run test:e2e                        # Run end-to-end tests
npm run check                           # TypeScript check
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Undefined contract address" | Check `.env.local` has all 3 chain addresses |
| Chain switcher not showing | Import and add `<ChainSwitcher />` to layout |
| Old contract address used | Dev server restart + browser hard refresh |
| "Network not supported" | Check chain ID in `CHAIN_CONFIG` in `chains.ts` |
| Transaction fails after switching | Ensure admin wallet has gas on target chain |
| LocalStorage not persisting chain | Check browser allows localStorage (not private mode) |

---

✅ **Integration Complete!** Your platform now supports 3 blockchains and users can switch between them seamlessly.
