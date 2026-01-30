/**
 * Blockchain Client - Initialize ethers.js with contracts
 * Manages connection to Base Testnet Sepolia and contract instances
 */

import { ethers } from 'ethers';
import { Contract } from 'ethers';
import type { Signer } from 'ethers';

// Contract ABIs (minimal - full ABIs from compiled contracts)
const POINTS_ABI = [
  'function awardPoints(address user, uint256 amount, uint256 challengeId, string reason) external',
  'function burnPointsFrom(address user, uint256 amount) external',
  'function transferPoints(address to, uint256 amount) external returns (bool)',
  'function setPointsManager(address newManager) external',
  'function getUserPointsBalance(address user) external view returns (uint256)',
  'function getChallengePoints(uint256 challengeId) external view returns (uint256)',
  'event PointsAwarded(address indexed user, uint256 amount, uint256 indexed challengeId, string reason)',
  'event PointsBurned(address indexed user, uint256 amount)',
];

const CHALLENGE_FACTORY_ABI = [
  'function createAdminChallenge(uint256 stakeAmount, address paymentToken, string metadataURI) external returns (uint256)',
  'function createP2PChallenge(address opponent, uint256 stakeAmount, address paymentToken, string metadataURI) external returns (uint256)',
  'function acceptP2PChallenge(uint256 challengeId) external',
  'function joinAdminChallenge(uint256 challengeId, bool side) external',
  'function resolveChallenge(uint256 challengeId, address winner, uint256 pointsAwarded, bytes memory signature) external',
  'function claimPayout(uint256 challengeId) external',
  'function getChallenge(uint256 challengeId) external view returns (tuple(uint256 id, uint8 challengeType, address creator, address participant, uint256 stakeAmount, address paymentToken, uint8 status, address winner, uint256 createdAt, uint256 resolvedAt, string metadataURI))',
  'function getYesParticipants(uint256 challengeId) external view returns (address[])',
  'function getNoParticipants(uint256 challengeId) external view returns (address[])',
  'function getUserLockedStakes(address user) external view returns (uint256)',
  'function setAdmin(address newAdmin) external',
  'function setPlatformFee(uint256 basisPoints) external',
  'event ChallengeCreated(uint256 indexed challengeId, uint8 challengeType, address indexed creator, uint256 stakeAmount, address paymentToken, string metadataURI)',
  'event ChallengeResolved(uint256 indexed challengeId, address indexed winner, uint256 prizeAmount, uint256 pointsAwarded)',
  'event PayoutClaimed(uint256 indexed challengeId, address indexed user, uint256 amount)',
];

const ERC20_ABI = [
  'function balanceOf(address owner) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

interface BlockchainConfig {
  rpcUrl: string;
  chainId: number;
  pointsContractAddress: string;
  challengeFactoryAddress: string;
  pointsEscrowAddress: string;
  usdcAddress: string;
  usdtAddress: string;
  adminPrivateKey: string;
  adminAddress: string;
}

class BlockchainClient {
  private provider: ethers.JsonRpcProvider;
  private adminSigner: ethers.Wallet;
  private config: BlockchainConfig;

  // Contract instances
  pointsContract: Contract;
  challengeFactoryContract: Contract;
  usdcContract: Contract;
  usdtContract: Contract;

  constructor(config: BlockchainConfig) {
    this.config = config;

    // Initialize provider
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl, config.chainId);

    // Initialize admin signer (for signing challenge resolutions)
    this.adminSigner = new ethers.Wallet(config.adminPrivateKey, this.provider);

    // Initialize contract instances
    this.pointsContract = new ethers.Contract(
      config.pointsContractAddress,
      POINTS_ABI,
      this.provider
    );

    this.challengeFactoryContract = new ethers.Contract(
      config.challengeFactoryAddress,
      CHALLENGE_FACTORY_ABI,
      this.provider
    );

    this.usdcContract = new ethers.Contract(
      config.usdcAddress,
      ERC20_ABI,
      this.provider
    );

    this.usdtContract = new ethers.Contract(
      config.usdtAddress,
      ERC20_ABI,
      this.provider
    );
  }

  /**
   * Get provider for read-only operations
   */
  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  /**
   * Get admin signer for transaction signing
   */
  getAdminSigner(): ethers.Wallet {
    return this.adminSigner;
  }

  /**
   * Get connected contract instance for writing (admin signer)
   */
  getChallengeFactoryForWriting(): Contract {
    return this.challengeFactoryContract.connect(this.adminSigner);
  }

  /**
   * Get points contract for writing (admin signer)
   */
  getPointsContractForWriting(): Contract {
    return this.pointsContract.connect(this.adminSigner);
  }

  /**
   * Get contract connected to specific signer/user
   */
  getChallengeFactoryForUser(userSigner: Signer): Contract {
    return this.challengeFactoryContract.connect(userSigner);
  }

  /**
   * Get token contract connected to specific user
   */
  getTokenForUser(tokenAddress: string, userSigner: Signer): Contract {
    return new ethers.Contract(tokenAddress, ERC20_ABI, userSigner);
  }

  /**
   * Verify connection to blockchain
   */
  async verifyConnection(): Promise<boolean> {
    try {
      const blockNumber = await this.provider.getBlockNumber();
      const network = await this.provider.getNetwork();
      console.log(`✅ Connected to Base Testnet (Chain: ${network.chainId}, Block: ${blockNumber})`);
      return true;
    } catch (error) {
      console.error('❌ Blockchain connection failed:', error);
      return false;
    }
  }

  /**
   * Get admin address
   */
  getAdminAddress(): string {
    return this.config.adminAddress;
  }

  /**
   * Get all contract addresses
   */
  getContractAddresses() {
    return {
      challengeFactory: this.config.challengeFactoryAddress,
      pointsEscrow: this.config.pointsEscrowAddress,
      usdc: this.config.usdcAddress,
      usdt: this.config.usdtAddress,
    };
  }

  /**
   * Get network info
   */
  async getNetworkInfo() {
    try {
      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();
      const feeData = await this.provider.getFeeData();
      const adminBalance = await this.provider.getBalance(this.adminSigner.address);

      return {
        network: network.name,
        chainId: network.chainId,
        blockNumber,
        gasPrice: feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') : '0',
        adminBalance: ethers.formatEther(adminBalance),
        adminAddress: this.adminSigner.address,
      };
    } catch (error) {
      console.error('Failed to get network info:', error);
      throw error;
    }
  }
}

// Singleton instance
let blockchainClient: BlockchainClient | null = null;

/**
 * Initialize blockchain client (call once on server startup)
 */
export function initBlockchainClient(config: BlockchainConfig): BlockchainClient {
  if (blockchainClient) {
    console.warn('Blockchain client already initialized');
    return blockchainClient;
  }

  blockchainClient = new BlockchainClient(config);
  return blockchainClient;
}

/**
 * Get blockchain client instance
 */
export function getBlockchainClient(): BlockchainClient {
  if (!blockchainClient) {
    throw new Error('Blockchain client not initialized. Call initBlockchainClient() first.');
  }
  return blockchainClient;
}

export type { BlockchainConfig, Signer };
export { ethers, Contract };
