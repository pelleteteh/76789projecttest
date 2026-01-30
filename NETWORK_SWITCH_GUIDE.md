# Network Switching Fix - External Wallets Only

## What Changed

The system now **FORCES** your external wallet (MetaMask, Rainbow, etc.) to switch to **Base Sepolia** before EVERY blockchain transaction.

### The Fix

**File:** [client/src/hooks/useBlockchainChallenge.ts](client/src/hooks/useBlockchainChallenge.ts#L48-L120)

**Function:** `switchToBaseSepolia()` - Called automatically before:
1. Creating a P2P challenge
2. Accepting a P2P challenge

### How It Works

```
User clicks "Create Challenge"
    ↓
System checks wallet network
    ↓
Is it Base Sepolia (Chain 84532)?
    ↓
NO → Request wallet switch via RPC
    ↓
User approves in wallet popup
    ↓
Chain ID 0x14a34 (Base Sepolia) activated
    ↓
Transaction proceeds
```

### Error Scenarios

| Scenario | What Happens |
|----------|--------------|
| **Wallet on Ethereum Mainnet** | 🔄 System asks to switch → User approves → OK ✅ |
| **Wallet on Ethereum Sepolia** | 🔄 System asks to switch → User approves → OK ✅ |
| **Wallet on Base Sepolia** | ✅ Already correct → Proceed directly → OK ✅ |
| **Base Sepolia not in wallet** | ℹ️ Auto-add chain → User approves → OK ✅ |
| **User rejects switch** | ❌ Transaction cancelled → Clear error message |
| **No Web3 wallet installed** | ❌ Please install MetaMask or similar |

## Testing

### Before Creating Challenge

Your wallet should:
- [ ] Show popup to switch networks
- [ ] Ask for approval to switch to Base Sepolia
- [ ] OR ask to add Base Sepolia (if not present)
- [ ] After approval, network indicator shows "Base Sepolia"

### If Wallet Shows Wrong Network

```
Current: ❌ Ethereum Sepolia
Expected: ✅ Base Sepolia (84532)

→ Click "Create Challenge"
→ Wallet should automatically prompt to switch
→ Approve the switch
→ Network should update to Base Sepolia
→ Transaction proceeds
```

## Technical Details

### Chain Information
- **Network Name:** Base Sepolia Testnet
- **Chain ID:** 84532 (decimal) / 0x14a34 (hex)
- **RPC URL:** https://sepolia.base.org
- **Block Explorer:** https://sepolia.basescan.org
- **Native Currency:** ETH

### Wallet Methods Used

```javascript
// Switch to existing chain
window.ethereum.request({
  method: 'wallet_switchEthereumChain',
  params: [{ chainId: '0x14a34' }]
})

// Add new chain (if not found)
window.ethereum.request({
  method: 'wallet_addEthereumChain',
  params: [{
    chainId: '0x14a34',
    chainName: 'Base Sepolia Testnet',
    rpcUrls: ['https://sepolia.base.org'],
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    blockExplorerUrls: ['https://sepolia.basescan.org']
  }]
})
```

## FAQ

**Q: Why is it forcing the network switch?**
A: Because your wallet might be on a different network (like Ethereum Sepolia), and transactions must be signed on Base Sepolia where the contracts are deployed.

**Q: Will my existing transactions be affected?**
A: No, only new transactions created after this fix will use the network switch logic.

**Q: What if I accidentally reject the network switch?**
A: You'll see an error message. Simply click "Create Challenge" again and approve the switch.

**Q: Does this work with all wallets?**
A: Yes! Works with MetaMask, Rainbow, WalletConnect, and any EIP-1193 compatible wallet.

**Q: Why use 0x14a34?**
A: That's the hexadecimal representation of 84532 (Base Sepolia's decimal chain ID).

## Deployment Checklist

- [x] Network switch function implemented
- [x] Called before createP2PChallenge
- [x] Called before acceptP2PChallenge
- [x] Proper error handling for all cases
- [x] User-friendly error messages
- [x] Automatic chain addition if needed
- [x] Logging for debugging
- [x] No Privy dependencies (external wallets only)

---

**Status:** ✅ Ready for deployment and testing
