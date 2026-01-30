# ⚡ Multi-Chain Deployment Quick Start

## 🎯 Goal
Deploy Bantah contracts to 3 networks and enable users to switch between them.

## ⏱️ Time Estimate
- Setup: 5 minutes
- Deployment: 20 minutes
- Testing: 15 minutes
- **Total: 40 minutes**

---

## 📋 Pre-Deployment Checklist

- [ ] Have testnet ETH/tokens on all 3 networks
  - [ ] Base Sepolia ETH: https://www.alchemy.com/faucets/base-sepolia
  - [ ] Polygon MATIC: https://faucet.polygon.technology/
  - [ ] Arbitrum ETH: https://faucet.arbitrum.io/

- [ ] Node.js 20+ installed
- [ ] `.env.local` has `ADMIN_PRIVATE_KEY` set
- [ ] Contracts compiled: `npx hardhat compile` (already done)

---

## 🚀 Deployment in 3 Commands

### Command 1: Compile Contracts
```bash
cd contracts
npx hardhat compile
```
✅ Takes ~1 minute
✅ Shows "Compiled 27 Solidity files successfully"

### Command 2: Deploy to All 3 Networks
```bash
npx ts-node deploy-multichain.ts all
```
✅ Takes ~20 minutes total
✅ Deploys sequentially to Base → Polygon → Arbitrum

**Output:** Creates 3 files:
- `.env.base-sepolia`
- `.env.polygon-amoy`
- `.env.arbitrum-sepolia`

### Command 3: Update Environment & Restart

**Copy contract addresses to `.env.local`:**

From `.env.base-sepolia`, copy these lines to `.env.local`:
```env
VITE_BASE_POINTS_CONTRACT_ADDRESS=0x...
VITE_BASE_CHALLENGE_FACTORY_ADDRESS=0x...
VITE_BASE_CHALLENGE_ESCROW_ADDRESS=0x...
VITE_BASE_POINTS_ESCROW_ADDRESS=0x...
```

From `.env.polygon-amoy`, copy:
```env
VITE_POLYGON_POINTS_CONTRACT_ADDRESS=0x...
VITE_POLYGON_CHALLENGE_FACTORY_ADDRESS=0x...
VITE_POLYGON_CHALLENGE_ESCROW_ADDRESS=0x...
VITE_POLYGON_POINTS_ESCROW_ADDRESS=0x...
```

From `.env.arbitrum-sepolia`, copy:
```env
VITE_ARBITRUM_POINTS_CONTRACT_ADDRESS=0x...
VITE_ARBITRUM_CHALLENGE_FACTORY_ADDRESS=0x...
VITE_ARBITRUM_CHALLENGE_ESCROW_ADDRESS=0x...
VITE_ARBITRUM_POINTS_ESCROW_ADDRESS=0x...
```

**Restart server:**
```bash
# Kill old dev server
pkill -9 "npm run dev"

# Start fresh
npm run dev
```

**Hard refresh browser:**
- Windows/Linux: `Ctrl+Shift+R`
- Mac: `Cmd+Shift+R`

---

## ✅ Testing in 5 Steps

### Test 1: See Chain Switcher
- [ ] Open app
- [ ] Look for "ChainSwitcher" component in navbar/layout
- [ ] Should show "Base Sepolia" by default

### Test 2: Create Challenge on Base
- [ ] Create ETH challenge with small amount (0.0001 ETH)
- [ ] Sign transaction
- [ ] Should see success message
- [ ] Check: https://sepolia.basescan.org (search tx hash)

### Test 3: Switch to Polygon
- [ ] Click ChainSwitcher dropdown
- [ ] Select "Polygon Amoy"
- [ ] Should see "Polygon Amoy" now selected
- [ ] Console should show different contract address

### Test 4: Create Challenge on Polygon
- [ ] Create USDC challenge with small amount
- [ ] Sign transaction
- [ ] Should see success message
- [ ] Check: https://amoy.polygonscan.com (search tx hash)

### Test 5: Switch to Arbitrum & Test
- [ ] Click ChainSwitcher dropdown
- [ ] Select "Arbitrum Sepolia"
- [ ] Create ETH challenge
- [ ] Check: https://sepolia.arbiscan.io (search tx hash)

---

## 🎉 Success Criteria

✅ All 3 chains in ChainSwitcher dropdown
✅ Switching chains changes contract address
✅ Can create challenges on each network
✅ Transactions appear on correct block explorers
✅ User's chain preference persists after refresh

---

## 🆘 If Something Goes Wrong

### Issue: Contract addresses show 0x0000...
**Solution**: Run deployment again with `npx ts-node deploy-multichain.ts all`

### Issue: ChainSwitcher not showing
**Solution**: Add to your layout:
```typescript
import { ChainSwitcher } from '@/components/ChainSwitcher';

export function Navbar() {
  return (
    <nav>
      {/* ... your nav ... */}
      <ChainSwitcher />  {/* Add this */}
    </nav>
  );
}
```

### Issue: Old contract address still used
**Solution**:
1. Check `.env.local` has new addresses
2. Kill dev server: `pkill -9 "npm run dev"`
3. Restart: `npm run dev`
4. Hard refresh browser: `Ctrl+Shift+R`

### Issue: "Network not in wallet" error
**Solution**: Just reload page, hook will auto-add the network

### Issue: Transaction fails with "insufficient balance"
**Solution**: Get more testnet tokens from faucets:
- Base: https://www.alchemy.com/faucets/base-sepolia
- Polygon: https://faucet.polygon.technology/
- Arbitrum: https://faucet.arbitrum.io/

---

## 📊 Network Comparison

| Network | Cost | Speed | Status |
|---------|------|-------|--------|
| Base Sepolia | 💰 Cheapest | Fast | ✅ Default |
| Polygon Amoy | 💰💰 Cheapest | Fast | 🚀 New! |
| Arbitrum Sepolia | 💰 Cheap | ⚡ Fastest | 🚀 New! |

**Recommendation for testing**: Start with Polygon (cheapest gas)

---

## 🔧 Deployment Troubleshooting

### Deployment Hangs
- [ ] Ensure `ADMIN_PRIVATE_KEY` in `.env.local`
- [ ] Check admin account has ETH on network
- [ ] Check internet connection

### "Network is unreachable"
- [ ] RPC URLs might be down
- [ ] Try deploying one network at a time: `npx ts-node deploy-multichain.ts base-sepolia`

### "Nonce too low"
- [ ] Deploy script manages nonces, usually resolves in 2nd attempt
- [ ] If persists, reset nonce in admin wallet settings

### "Transaction reverted"
- [ ] Contracts might have failed to deploy properly
- [ ] Run `npx hardhat compile` again
- [ ] Check contract addresses in output

---

## 📚 Where to Learn More

| Topic | Document |
|-------|----------|
| Complete guide | `MULTICHAIN_DEPLOYMENT_GUIDE.md` |
| Architecture | `MULTICHAIN_ARCHITECTURE.md` |
| Integration | `MULTICHAIN_INTEGRATION_CHECKLIST.md` |
| Quick ref | `MULTICHAIN_SETUP_SUMMARY.md` |
| Config file | `client/src/config/chains.ts` |
| State hook | `client/src/hooks/useChain.ts` |
| UI component | `client/src/components/ChainSwitcher.tsx` |

---

## 🎓 Key Commands

```bash
# Compilation
cd contracts && npx hardhat compile

# Deployment
npx ts-node deploy-multichain.ts all              # All networks
npx ts-node deploy-multichain.ts base-sepolia     # Base only
npx ts-node deploy-multichain.ts polygon-amoy     # Polygon only
npx ts-node deploy-multichain.ts arbitrum-sepolia # Arbitrum only

# Development
npm run dev           # Start dev server
npm run check        # TypeScript check
npm run build        # Build for production

# Network-specific operations
npx hardhat verify --network base-sepolia <ADDRESS> <ARGS>
npx hardhat verify --network polygon-amoy <ADDRESS> <ARGS>
npx hardhat verify --network arbitrum-sepolia <ADDRESS> <ARGS>
```

---

## 📈 Post-Deployment

After deployment:
1. ✅ Verify contracts on block explorers (optional but recommended)
2. ✅ Test challenge flow on each network
3. ✅ Monitor gas costs across networks
4. ✅ Gather feedback from users on preferred network
5. ✅ Plan mainnet deployment when ready

---

## 🎊 You're Done!

Your multi-chain platform is ready! Users can now:
- Switch between 3 networks with one click
- Create challenges on any network
- Pay with native tokens or stablecoins
- See transactions on any block explorer
- Have their network preference remembered

**Deploy and celebrate! 🚀**

---

**Need Help?**
- Check documentation in root directory
- Review source code in `client/src/config/chains.ts`
- Check environment variables in `.env.multichain.template`
- Run `npx hardhat --help` for Hardhat commands
