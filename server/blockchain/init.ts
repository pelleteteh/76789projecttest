/**
 * Blockchain Initialization Module
 * Call initializeBlockchain() on server startup
 * 
 * Usage in server/index.ts:
 * 
 * import { initializeBlockchain } from './blockchain/init';
 * 
 * // In your app startup code:
 * await initializeBlockchain();
 */

import { initBlockchainClient, type BlockchainConfig } from './client';

/**
 * Initialize blockchain client from environment variables
 */
export async function initializeBlockchain(): Promise<void> {
  const requiredEnvVars = [
    'VITE_BASE_TESTNET_RPC',
    'VITE_POINTS_CONTRACT_ADDRESS',
    'VITE_CHALLENGE_FACTORY_ADDRESS',
    'VITE_POINTS_ESCROW_ADDRESS',
    'VITE_USDC_ADDRESS',
    'VITE_USDT_ADDRESS',
    'ADMIN_PRIVATE_KEY',
    'ADMIN_ADDRESS',
  ];

  // Check required env vars
  const missing = requiredEnvVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.error('❌ Missing environment variables for blockchain:');
    missing.forEach((v) => console.error(`   - ${v}`));
    console.error('\nPlease update your .env file with contract addresses from deployment');
    throw new Error('Blockchain configuration incomplete');
  }

  const config: BlockchainConfig = {
    rpcUrl: process.env.VITE_BASE_TESTNET_RPC!,
    chainId: 84532, // Base Testnet Sepolia
    pointsContractAddress: process.env.VITE_POINTS_CONTRACT_ADDRESS!,
    challengeFactoryAddress: process.env.VITE_CHALLENGE_FACTORY_ADDRESS!,
    pointsEscrowAddress: process.env.VITE_POINTS_ESCROW_ADDRESS!,
    usdcAddress: process.env.VITE_USDC_ADDRESS!,
    usdtAddress: process.env.VITE_USDT_ADDRESS!,
    adminPrivateKey: process.env.ADMIN_PRIVATE_KEY!,
    adminAddress: process.env.ADMIN_ADDRESS!,
  };

  try {
    console.log('\n🔗 Initializing blockchain client...');
    const client = initBlockchainClient(config);

    // Verify connection
    const connected = await client.verifyConnection();
    if (!connected) {
      throw new Error('Failed to connect to blockchain');
    }

    // Log network info
    const networkInfo = await client.getNetworkInfo();
    console.log(`\n✅ Blockchain initialized successfully`);
    console.log(`   Network: Base Testnet Sepolia (Chain: ${networkInfo.chainId})`);
    console.log(`   Block: ${networkInfo.blockNumber}`);
    console.log(`   Gas Price: ${networkInfo.gasPrice} Gwei`);
    console.log(`   Admin Balance: ${networkInfo.adminBalance} ETH`);
    console.log(`   Admin Address: ${networkInfo.adminAddress}\n`);

    // Log contract addresses
    const addresses = client.getContractAddresses();
    console.log('📋 Contract Addresses:');
    console.log(`   Factory: ${addresses.challengeFactory}`);
    console.log(`   Escrow: ${addresses.pointsEscrow}`);
    console.log(`   USDC: ${addresses.usdc}`);
    console.log(`   USDT: ${addresses.usdt}\n`);
  } catch (error: any) {
    console.error('❌ Blockchain initialization failed:');
    console.error(error.message);
    throw error;
  }
}

/**
 * Initialize blockchain with custom config (for testing)
 */
export function initBlockchainWithConfig(config: BlockchainConfig) {
  return initBlockchainClient(config);
}

export { initBlockchainClient };
