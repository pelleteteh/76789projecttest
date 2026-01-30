// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * BANTAH ON-CHAIN CHALLENGE SYSTEM
 * ================================
 * 
 * Phase 1: Smart Contracts for Base Testnet Sepolia
 * 
 * CONTRACTS:
 * 1. BantahPoints.sol - ERC-20 token for user reputation/leaderboard points
 * 2. ChallengeFactory.sol - Main contract for challenge creation/resolution
 * 3. PointsEscrow.sol - Escrow for locking points during challenges
 * 
 * DEPLOYMENT INSTRUCTIONS:
 * 
 * Network: Base Testnet Sepolia (Chain ID: 84532)
 * RPC: https://sepolia.base.org
 * Explorer: https://sepolia.basescan.org
 * 
 * STEP 1: Deploy BantahPoints
 * - Constructor args: (owner address - will be deployer)
 * - Initial supply: 1,000,000 BPTS (18 decimals)
 * - Save contract address to .env as POINTS_CONTRACT_ADDRESS
 * 
 * STEP 2: Deploy ChallengeFactory
 * - Constructor args: (BantahPoints address, admin address)
 * - admin: Address authorized to sign challenge resolutions (from ADMIN_PRIVATE_KEY)
 * - Save contract address to .env as CHALLENGE_FACTORY_ADDRESS
 * 
 * STEP 3: Deploy PointsEscrow
 * - Constructor args: (BantahPoints address, ChallengeFactory address)
 * - Save contract address to .env as POINTS_ESCROW_ADDRESS
 * 
 * STEP 4: Setup permissions
 * - Call BantahPoints.setPointsManager(ChallengeFactory address)
 * - This allows ChallengeFactory to mint points for winners
 * 
 * STEP 5: Update .env
 * VITE_BASE_TESTNET_RPC=https://sepolia.base.org
 * VITE_CHALLENGE_FACTORY_ADDRESS=0x...
 * VITE_POINTS_CONTRACT_ADDRESS=0x...
 * VITE_POINTS_ESCROW_ADDRESS=0x...
 * VITE_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b3566dA8860
 * VITE_USDT_ADDRESS=0x3c499c542cEF5E3811e1192ce70d8cC7d307B653
 * ADMIN_PRIVATE_KEY=your_admin_key_here
 * ADMIN_ADDRESS=derived_from_private_key
 * 
 * DEPLOYMENT FLOW:
 * 1. Install dependencies: npm install
 * 2. Compile contracts: npx hardhat compile (or use Foundry/Remix)
 * 3. Deploy to testnet with constructor args above
 * 4. Call setPointsManager on BantahPoints
 * 5. Test with small amounts first
 * 
 * TESTING:
 * - Get testnet ETH from https://www.alchemy.com/faucets/base-sepolia
 * - Get testnet USDC from faucet or swap
 * - Call createAdminChallenge to create a betting pool
 * - Call joinAdminChallenge to join with YES/NO
 * - Call resolveChallenge (signed by admin) to settle
 * - Call claimPayout to claim winnings
 * 
 * KEY ADDRESSES (Base Testnet Sepolia):
 * USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b3566dA8860 (6 decimals)
 * USDT: 0x3c499c542cEF5E3811e1192ce70d8cC7d307B653 (6 decimals)
 * 
 * SECURITY:
 * - Admin key should NEVER be in git repo
 * - Use environment variables for all sensitive data
 * - Contracts are not audited - for testnet only
 * - ReentrancyGuard protects against reentrancy
 * - ECDSA signature verification for admin resolutions
 * - All state changes happen in correct order (checks-effects-interactions)
 * 
 * NEXT PHASE:
 * Phase 2: Backend blockchain client setup (ethers.js)
 * Phase 3: Database schema updates
 * Phase 4: API route implementations
 * Phase 5: Frontend integration
 */

// This file serves as documentation only
