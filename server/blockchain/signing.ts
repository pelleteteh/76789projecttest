/**
 * Admin Signing Middleware
 * Handles cryptographic signing of challenge resolutions for on-chain verification
 */

import { ethers } from 'ethers';
import { getBlockchainClient } from './client';

interface SignableChallenge {
  challengeId: number;
  winner: string;
  pointsAwarded: number;
}

/**
 * Sign a challenge resolution
 * Returns signature that can be verified on-chain by the admin signer
 * 
 * Admin signature proves:
 * 1. Admin authorized this specific winner
 * 2. Admin awarded these specific points
 * 3. For this specific challenge
 */
export async function signChallengeResolution(
  challenge: SignableChallenge
): Promise<{
  signature: string;
  messageHash: string;
  ethSignedMessage: string;
  signer: string;
  timestamp: number;
}> {
  const client = getBlockchainClient();
  const adminSigner = client.getAdminSigner();

  try {
    // Create message hash following Solidity format
    const messageHash = ethers.solidityPacked(
      ['uint256', 'address', 'uint256'],
      [challenge.challengeId, challenge.winner, challenge.pointsAwarded]
    );

    // Hash it again with keccak256
    const hashFinal = ethers.keccak256(messageHash);

    // Sign with admin wallet
    const signature = await adminSigner.signMessage(ethers.toBeArray(hashFinal));

    return {
      signature,
      messageHash: hashFinal,
      ethSignedMessage: ethers.hashMessage(ethers.toBeArray(hashFinal)),
      signer: adminSigner.address,
      timestamp: Math.floor(Date.now() / 1000),
    };
  } catch (error) {
    console.error('Failed to sign challenge:', error);
    throw error;
  }
}

/**
 * Verify a signature (for testing/validation)
 * Returns the signer address if valid
 */
export async function verifyChallengeSignature(
  challenge: SignableChallenge,
  signature: string
): Promise<{
  isValid: boolean;
  signer: string;
}> {
  const client = getBlockchainClient();
  const expectedAdmin = client.getAdminAddress();

  try {
    // Recreate message hash
    const messageHash = ethers.solidityPacked(
      ['uint256', 'address', 'uint256'],
      [challenge.challengeId, challenge.winner, challenge.pointsAwarded]
    );

    const hashFinal = ethers.keccak256(messageHash);

    // Recover signer from signature
    const signer = ethers.recoverAddress(
      ethers.hashMessage(ethers.toBeArray(hashFinal)),
      signature
    );

    const isValid = signer.toLowerCase() === expectedAdmin.toLowerCase();

    return {
      isValid,
      signer,
    };
  } catch (error) {
    console.error('Failed to verify signature:', error);
    return {
      isValid: false,
      signer: '',
    };
  }
}

/**
 * Create and submit a challenge resolution on-chain
 * This combines signing + contract call
 */
export async function resolveChallengeOnChain(
  challenge: SignableChallenge
): Promise<{
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
  status: 'success' | 'failed';
}> {
  const client = getBlockchainClient();

  try {
    // Step 1: Sign the resolution
    console.log(`📝 Signing challenge ${challenge.challengeId}...`);
    const signatureData = await signChallengeResolution(challenge);
    console.log(`✅ Signed by ${signatureData.signer}`);

    // Step 2: Verify signature before submitting
    console.log(`🔍 Verifying signature...`);
    const verification = await verifyChallengeSignature(challenge, signatureData.signature);
    if (!verification.isValid) {
      throw new Error('Signature verification failed');
    }
    console.log(`✅ Signature verified`);

    // Step 3: Submit to blockchain
    console.log(`📤 Submitting resolution to blockchain...`);
    const contract = client.getChallengeFactoryForWriting();
    
    const tx = await contract.resolveChallenge(
      challenge.challengeId,
      challenge.winner,
      challenge.pointsAwarded,
      signatureData.signature
    );

    const receipt = await tx.wait();

    console.log(`✅ Challenge resolved! TX: ${receipt.transactionHash}`);

    return {
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      status: 'success',
    };
  } catch (error) {
    console.error('Failed to resolve challenge on-chain:', error);
    throw error;
  }
}

/**
 * Batch sign multiple challenges (for dashboard admin panel)
 * Useful for bulk challenge resolution
 */
export async function batchSignChallenges(
  challenges: SignableChallenge[]
): Promise<Array<{
  challengeId: number;
  signature: string;
  signer: string;
  error?: string;
}>> {
  const results = [];

  for (const challenge of challenges) {
    try {
      const signatureData = await signChallengeResolution(challenge);
      results.push({
        challengeId: challenge.challengeId,
        signature: signatureData.signature,
        signer: signatureData.signer,
      });
    } catch (error) {
      results.push({
        challengeId: challenge.challengeId,
        signature: '',
        signer: '',
        error: String(error),
      });
    }
  }

  return results;
}

/**
 * Get signing stats for admin dashboard
 */
export async function getSigningStats(): Promise<{
  adminAddress: string;
  chainId: number;
  contractAddress: string;
  status: 'ready' | 'error';
}> {
  try {
    const client = getBlockchainClient();
    const networkInfo = await client.getNetworkInfo();

    return {
      adminAddress: client.getAdminAddress(),
      chainId: networkInfo.chainId,
      contractAddress: client.getContractAddresses().challengeFactory,
      status: 'ready',
    };
  } catch (error) {
    console.error('Failed to get signing stats:', error);
    return {
      adminAddress: '',
      chainId: 0,
      contractAddress: '',
      status: 'error',
    };
  }
}

export { ethers };
