/**
 * Phase 3: Database Utilities for Blockchain Integration
 * Helper functions for managing blockchain-related database operations
 */

import { db } from '../db';
import {
  userPointsLedgers,
  pointsTransactions,
  blockchainTransactions,
  challengeEscrowRecords,
  contractDeployments,
  adminSignaturesLog,
  userWalletAddresses,
  type InsertUserPointsLedger,
  type InsertPointsTransaction,
  type InsertBlockchainTransaction,
  type InsertChallengeEscrowRecord,
  type InsertContractDeployment,
  type InsertAdminSignaturesLog,
  type InsertUserWalletAddress,
} from '../../shared/schema-blockchain';
import { eq, and, desc } from 'drizzle-orm';

// ============================================================================
// USER POINTS LEDGER OPERATIONS
// ============================================================================

/**
 * Get or create user points ledger
 */
export async function ensureUserPointsLedger(userId: string) {
  const existing = await db
    .select()
    .from(userPointsLedgers)
    .where(eq(userPointsLedgers.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const newLedger: InsertUserPointsLedger = {
    userId,
    pointsBalance: 0n,
    totalPointsEarned: 0n,
    totalPointsBurned: 0n,
    pointsLockedInEscrow: 0n,
  };

  const result = await db.insert(userPointsLedgers).values(newLedger).returning();
  return result[0];
}

/**
 * Record a points transaction
 */
export async function recordPointsTransaction(
  data: InsertPointsTransaction
) {
  const result = await db.insert(pointsTransactions).values(data).returning();
  
  // Update user ledger after transaction
  await updateUserPointsBalance(data.userId);
  
  return result[0];
}

/**
 * Recalculate user points balance from transaction history
 */
export async function updateUserPointsBalance(userId: string) {
  const transactions = await db
    .select()
    .from(pointsTransactions)
    .where(eq(pointsTransactions.userId, userId));

  let balance = 0n;
  let earned = 0n;
  let burned = 0n;

  for (const tx of transactions) {
    const amount = BigInt(tx.amount);
    
    if (tx.transactionType === 'earned_challenge' || 
        tx.transactionType === 'released_escrow' ||
        tx.transactionType === 'transferred_escrow' ||
        tx.transactionType === 'transferred_user' ||
        tx.transactionType === 'creation_reward' ||
        tx.transactionType === 'joining_reward') {
      balance += amount;
      if (tx.transactionType === 'earned_challenge' || 
          tx.transactionType === 'creation_reward' || 
          tx.transactionType === 'joining_reward') {
        earned += amount;
      }
    } else if (tx.transactionType === 'burned_usage' || 
               tx.transactionType === 'locked_escrow' ||
               tx.transactionType === 'admin_claim_weekly' ||
               tx.transactionType === 'admin_payout_weekly') {
      balance -= amount;
      if (tx.transactionType === 'burned_usage') {
        burned += amount;
      }
    }
  }

  await db
    .update(userPointsLedgers)
    .set({
      pointsBalance: balance,
      totalPointsEarned: earned,
      totalPointsBurned: burned,
      lastUpdatedAt: new Date(),
    })
    .where(eq(userPointsLedgers.userId, userId));
}

/**
 * Get user points balance
 */
export async function getUserPointsBalance(userId: string) {
  const ledger = await db
    .select()
    .from(userPointsLedgers)
    .where(eq(userPointsLedgers.userId, userId))
    .limit(1);

  return ledger.length > 0 ? ledger[0].pointsBalance : 0n;
}

// ============================================================================
// BLOCKCHAIN TRANSACTION LOGGING
// ============================================================================

/**
 * Record a blockchain transaction
 */
export async function logBlockchainTransaction(
  data: InsertBlockchainTransaction
) {
  const result = await db
    .insert(blockchainTransactions)
    .values(data)
    .returning();
  return result[0];
}

/**
 * Update blockchain transaction status
 */
export async function updateBlockchainTransactionStatus(
  txHash: string,
  status: 'pending' | 'success' | 'failed',
  updates?: Partial<InsertBlockchainTransaction>
) {
  const result = await db
    .update(blockchainTransactions)
    .set({
      status,
      confirmedAt: status === 'success' ? new Date() : undefined,
      ...updates,
    })
    .where(eq(blockchainTransactions.transactionHash, txHash))
    .returning();

  return result[0];
}

/**
 * Get recent blockchain transactions
 */
export async function getRecentBlockchainTransactions(
  limit: number = 50,
  type?: string
) {
  let query = db
    .select()
    .from(blockchainTransactions)
    .orderBy(desc(blockchainTransactions.submittedAt))
    .limit(limit);

  if (type) {
    query = query.where(eq(blockchainTransactions.transactionType, type));
  }

  return query;
}

// ============================================================================
// ESCROW MANAGEMENT
// ============================================================================

/**
 * Create escrow record
 */
export async function createEscrowRecord(
  data: InsertChallengeEscrowRecord
) {
  const result = await db
    .insert(challengeEscrowRecords)
    .values(data)
    .returning();
  return result[0];
}

/**
 * Update escrow status
 */
export async function updateEscrowStatus(
  escrowId: number,
  status: 'locked' | 'released' | 'claimed',
  txHash?: string
) {
  const updates: any = { status };
  
  if (status === 'released' && txHash) {
    updates.releaseTxHash = txHash;
    updates.releasedAt = new Date();
  } else if (status === 'claimed' && txHash) {
    updates.claimTxHash = txHash;
    updates.claimedAt = new Date();
  }

  const result = await db
    .update(challengeEscrowRecords)
    .set(updates)
    .where(eq(challengeEscrowRecords.id, escrowId))
    .returning();

  return result[0];
}

/**
 * Get user's active escrows
 */
export async function getUserActiveEscrows(userId: string) {
  return db
    .select()
    .from(challengeEscrowRecords)
    .where(
      and(
        eq(challengeEscrowRecords.userId, userId),
        eq(challengeEscrowRecords.status, 'locked')
      )
    );
}

// ============================================================================
// CONTRACT DEPLOYMENT TRACKING
// ============================================================================

/**
 * Record contract deployment
 */
export async function recordContractDeployment(
  data: InsertContractDeployment
) {
  const result = await db
    .insert(contractDeployments)
    .values(data)
    .returning();
  return result[0];
}

/**
 * Get deployed contracts by name
 */
export async function getContractByName(
  contractName: string,
  chainId: number = 84532
) {
  const contracts = await db
    .select()
    .from(contractDeployments)
    .where(
      and(
        eq(contractDeployments.contractName, contractName),
        eq(contractDeployments.chainId, chainId),
        eq(contractDeployments.isActive, true)
      )
    )
    .orderBy(desc(contractDeployments.deployedAt));

  return contracts.length > 0 ? contracts[0] : null;
}

/**
 * Get all deployed contracts
 */
export async function getDeployedContracts(chainId: number = 84532) {
  return db
    .select()
    .from(contractDeployments)
    .where(
      and(
        eq(contractDeployments.chainId, chainId),
        eq(contractDeployments.isActive, true)
      )
    )
    .orderBy(desc(contractDeployments.deployedAt));
}

// ============================================================================
// ADMIN SIGNATURE LOGGING
// ============================================================================

/**
 * Log admin signature
 */
export async function logAdminSignature(
  data: InsertAdminSignaturesLog
) {
  const result = await db
    .insert(adminSignaturesLog)
    .values(data)
    .returning();
  return result[0];
}

/**
 * Update signature verification
 */
export async function updateSignatureVerification(
  signatureId: number,
  isVerified: boolean,
  error?: string
) {
  const result = await db
    .update(adminSignaturesLog)
    .set({
      isVerified,
      verificationError: error,
    })
    .where(eq(adminSignaturesLog.id, signatureId))
    .returning();

  return result[0];
}

/**
 * Get signature logs for challenge
 */
export async function getChallengeSignatureLogs(challengeId: number) {
  return db
    .select()
    .from(adminSignaturesLog)
    .where(eq(adminSignaturesLog.challengeId, challengeId))
    .orderBy(desc(adminSignaturesLog.signedAt));
}

// ============================================================================
// USER WALLET MANAGEMENT
// ============================================================================

/**
 * Add or update user wallet address
 */
export async function addUserWallet(
  data: InsertUserWalletAddress
) {
  // Try to update first
  const existing = await db
    .select()
    .from(userWalletAddresses)
    .where(
      and(
        eq(userWalletAddresses.userId, data.userId!),
        eq(userWalletAddresses.walletAddress, data.walletAddress!)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    const result = await db
      .update(userWalletAddresses)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(userWalletAddresses.id, existing[0].id))
      .returning();
    return result[0];
  }

  // Insert new
  const result = await db
    .insert(userWalletAddresses)
    .values(data)
    .returning();
  return result[0];
}

/**
 * Get user's wallets
 */
export async function getUserWallets(
  userId: string,
  chainId: number = 84532
) {
  return db
    .select()
    .from(userWalletAddresses)
    .where(
      and(
        eq(userWalletAddresses.userId, userId),
        eq(userWalletAddresses.chainId, chainId)
      )
    )
    .orderBy(desc(userWalletAddresses.connectedAt));
}

/**
 * Get user's primary wallet
 */
export async function getUserPrimaryWallet(
  userId: string,
  chainId: number = 84532
) {
  const wallets = await db
    .select()
    .from(userWalletAddresses)
    .where(
      and(
        eq(userWalletAddresses.userId, userId),
        eq(userWalletAddresses.chainId, chainId),
        eq(userWalletAddresses.isPrimary, true)
      )
    )
    .limit(1);

  return wallets.length > 0 ? wallets[0] : null;
}

/**
 * Set primary wallet
 */
export async function setPrimaryWallet(
  walletId: number,
  userId: string,
  chainId: number = 84532
) {
  // First, remove primary flag from all user wallets on this chain
  await db
    .update(userWalletAddresses)
    .set({ isPrimary: false })
    .where(
      and(
        eq(userWalletAddresses.userId, userId),
        eq(userWalletAddresses.chainId, chainId)
      )
    );

  // Then set this one as primary
  const result = await db
    .update(userWalletAddresses)
    .set({ isPrimary: true })
    .where(eq(userWalletAddresses.id, walletId))
    .returning();

  return result[0];
}

/**
 * Update wallet balances
 */
export async function updateWalletBalances(
  walletId: number,
  balances: {
    usdcBalance?: bigint;
    usdtBalance?: bigint;
    pointsBalance?: bigint;
    nativeBalance?: bigint;
  }
) {
  const result = await db
    .update(userWalletAddresses)
    .set({
      ...balances,
      lastBalanceSyncAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(userWalletAddresses.id, walletId))
    .returning();

  return result[0];
}

// ============================================================================
// ANALYTICS & REPORTING
// ============================================================================

/**
 * Get points statistics
 */
export async function getPointsStatistics() {
  const stats = await db
    .select({
      totalUsers: () => db.countDistinct(userPointsLedgers.userId),
      totalPointsInCirculation: () => db.sum(userPointsLedgers.pointsBalance),
      totalPointsEarned: () => db.sum(userPointsLedgers.totalPointsEarned),
      totalPointsBurned: () => db.sum(userPointsLedgers.totalPointsBurned),
    })
    .from(userPointsLedgers);

  return stats[0] || {};
}

/**
 * Get blockchain transaction statistics
 */
export async function getBlockchainTransactionStats(chainId: number = 84532) {
  const stats = await db
    .select({
      totalTransactions: () => db.count(),
      successfulTransactions: () => 
        db.countDistinct(blockchainTransactions.transactionHash),
      totalGasUsed: () => db.sum(blockchainTransactions.gasUsed),
      totalValueTransferred: () => db.sum(blockchainTransactions.valueTransferred),
    })
    .from(blockchainTransactions)
    .where(eq(blockchainTransactions.chainId, chainId));

  return stats[0] || {};
}

/**
 * Get user transaction history
 */
export async function getUserPointsTransactionHistory(
  userId: string,
  limit: number = 100
) {
  return db
    .select()
    .from(pointsTransactions)
    .where(eq(pointsTransactions.userId, userId))
    .orderBy(desc(pointsTransactions.createdAt))
    .limit(limit);
}

export {
  userPointsLedgers,
  pointsTransactions,
  blockchainTransactions,
  challengeEscrowRecords,
  contractDeployments,
  adminSignaturesLog,
  userWalletAddresses,
};
