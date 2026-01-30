/**
 * Blockchain Module Exports
 * Central hub for all blockchain-related functionality
 */

// Client initialization and management
export { 
  initBlockchainClient, 
  getBlockchainClient, 
  type BlockchainConfig 
} from './client';

// Initialization
export { 
  initializeBlockchain, 
  initBlockchainWithConfig 
} from './init';

// Contract helpers
export {
  getChallenge,
  createAdminChallenge,
  createP2PChallenge,
  joinAdminChallenge,
  acceptP2PChallenge,
  claimPayout,
  getUserPointsBalance,
  getTokenBalance,
  approveToken,
  getChallengeParticipants,
  getUserLockedStakes,
  estimateGasForChallenge,
} from './helpers';

// Signing and admin functions
export {
  signChallengeResolution,
  verifyChallengeSignature,
  resolveChallengeOnChain,
  batchSignChallenges,
  getSigningStats,
} from './signing';

// Re-export ethers for convenience
export { ethers, type Signer } from './client';
