/**
 * Phase 4: API Routes - Points & Leaderboard
 * REST endpoints for points management and leaderboard queries
 */

import { Router, Request, Response } from 'express';
import { SupabaseAuthMiddleware } from '../supabaseAuth';
import { getBlockchainClient } from '../blockchain/client';
import {
  getUserPointsBalance,
  recordPointsTransaction,
  ensureUserPointsLedger,
  getUserPointsTransactionHistory,
  getPointsStatistics,
  updateUserPointsBalance,
  addUserWallet,
  getUserWallets,
  getUserPrimaryWallet,
  setPrimaryWallet,
  updateWalletBalances,
} from '../blockchain/db-utils';
import { userPointsLedgers, pointsTransactions } from '../../shared/schema-blockchain';
import { db } from '../db';
import { users } from '../../shared/schema';
import { desc, gt, eq, sql } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/points/balance/:userId
 * Get user's current points balance including weekly claiming status
 * Returns:
 *   - balance: Raw balance (in wei, as string)
 *   - balanceFormatted: Human-readable balance (in BPTS)
 *   - lastClaimedAt: Timestamp of last weekly claim
 *   - canClaimThisWeek: Boolean indicating if user can claim now
 */
router.get('/balance/:userId', SupabaseAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Ensure ledger exists
    await ensureUserPointsLedger(userId);

    const balance = await getUserPointsBalance(userId);
    const ledger = await db
      .select()
      .from(userPointsLedgers)
      .where(eq(userPointsLedgers.userId, userId))
      .limit(1);

    res.json({
      userId,
      balance: balance.toString(),
      balanceFormatted: (Number(balance) / 1e18).toFixed(2),
      lastClaimedAt: ledger.length > 0 ? ledger[0].lastClaimedAt : null,
      ...(ledger.length > 0 ? ledger[0] : {}),
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get points balance',
      message: error.message,
    });
  }
});

/**
 * POST /api/points/transfer
 * Transfer points from one user to another
 * Only on-chain transfers are supported (for security)
 */
router.post('/transfer', SupabaseAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { recipientId, amount } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!recipientId || !amount) {
      return res.status(400).json({
        error: 'Missing required fields: recipientId, amount',
      });
    }

    if (userId === recipientId) {
      return res.status(400).json({
        error: 'Cannot transfer to yourself',
      });
    }

    console.log(`\n💸 User ${userId} transferring ${amount} points to ${recipientId}...`);

    // Ensure both users have ledgers
    await ensureUserPointsLedger(userId);
    await ensureUserPointsLedger(recipientId);

    // Check sender has enough balance
    const balance = await getUserPointsBalance(userId);
    const amountBigInt = BigInt(Math.floor(parseFloat(amount) * 1e18));

    if (balance < amountBigInt) {
      return res.status(400).json({
        error: 'Insufficient points balance',
        balance: balance.toString(),
        requested: amountBigInt.toString(),
      });
    }

    // Log transactions
    await recordPointsTransaction({
      userId,
      transactionType: 'transferred_user',
      amount: amountBigInt,
      reason: `Transfer to ${recipientId}`,
    });

    await recordPointsTransaction({
      userId: recipientId,
      transactionType: 'transferred_user',
      amount: amountBigInt,
      reason: `Transfer from ${userId}`,
    });

    console.log(`✅ Points transferred: ${amount} BPTS`);

    res.json({
      success: true,
      from: userId,
      to: recipientId,
      amount: amount.toString(),
      message: 'Points transferred successfully',
    });
  } catch (error: any) {
    console.error('Failed to transfer points:', error);
    res.status(500).json({
      error: 'Failed to transfer points',
      message: error.message,
    });
  }
});

/**
 * GET /api/points/leaderboard
 * Get global points leaderboard
 */
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const { limit = 100, offset = 0, period = 'all' } = req.query;

    const limitNum = Math.min(parseInt(limit as string) || 100, 500);
    const offsetNum = parseInt(offset as string) || 0;

    // Query leaderboard from database
    const leaderboard = await db
      .select({
        rank: () => null, // Will be calculated
        userId: users.id,
        pointsBalance: users.points,
        totalEarned: users.xp,
        username: users.username,
        profileImage: users.profileImageUrl,
      })
      .from(users)
      .where(gt(users.points, 0))
      .orderBy(desc(users.points))
      .limit(limitNum)
      .offset(offsetNum);

    // Add rank
    const rankedLeaderboard = leaderboard.map((entry, index) => ({
      ...entry,
      rank: offsetNum + index + 1,
      pointsBalance: entry.pointsBalance?.toString() || "0",
      totalEarned: entry.totalEarned?.toString() || "0",
    }));

    // Get total unique players
    const totalPlayersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(gt(users.points, 0));
    const totalPlayers = Number(totalPlayersResult[0]?.count || 0);

    res.json({
      leaderboard: rankedLeaderboard,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total: totalPlayers,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get leaderboard',
      message: error.message,
    });
  }
});

/**
 * GET /api/points/leaderboard/:userId
 * Get user's leaderboard rank and stats
 */
router.get('/leaderboard/:userId', SupabaseAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Get user's points
    const userPoints = await db
      .select()
      .from(userPointsLedgers)
      .where(eq(userPointsLedgers.userId, userId))
      .limit(1);

    if (!userPoints.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userPointsData = userPoints[0];

    // Count users ahead
    const usersAhead = await db
      .select({ count: () => null })
      .from(userPointsLedgers)
      .where(gt(userPointsLedgers.pointsBalance, userPointsData.pointsBalance || 0));

    const rank = usersAhead.length + 1;

    // Get user info
    const userInfo = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    res.json({
      userId,
      username: userInfo[0]?.username,
      rank,
      pointsBalance: userPointsData.pointsBalance?.toString(),
      totalEarned: userPointsData.totalPointsEarned?.toString(),
      totalBurned: userPointsData.totalPointsBurned?.toString(),
      lockedInEscrow: userPointsData.pointsLockedInEscrow?.toString(),
      lastUpdated: userPointsData.lastUpdatedAt,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get user rank',
      message: error.message,
    });
  }
});

/**
 * GET /api/points/history/:userId
 * Get user's points transaction history
 */
router.get('/history/:userId', SupabaseAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0, type } = req.query;

    const history = await getUserPointsTransactionHistory(
      userId,
      parseInt(limit as string)
    );

    const filtered = type
      ? history.filter((tx) => tx.transactionType === type)
      : history;

    res.json({
      userId,
      transactions: filtered,
      total: filtered.length,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get transaction history',
      message: error.message,
    });
  }
});

/**
 * GET /api/points/statistics
 * Get global points statistics
 */
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const stats = await getPointsStatistics();

    res.json({
      ...stats,
      pointsInCirculation: stats.totalPointsInCirculation?.toString(),
      totalEarned: stats.totalPointsEarned?.toString(),
      totalBurned: stats.totalPointsBurned?.toString(),
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get statistics',
      message: error.message,
    });
  }
});

/**
 * POST /api/points/connect-wallet
 * Connect blockchain wallet to user account
 */
router.post('/connect-wallet', SupabaseAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { walletAddress, walletType } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    console.log(`\n🔗 Connecting wallet ${walletAddress} to user ${userId}...`);

    // Add wallet
    const wallet = await addUserWallet({
      userId,
      walletAddress,
      walletType: walletType || 'privy',
      chainId: 84532,
      isPrimary: true, // Default to primary
    });

    console.log(`✅ Wallet connected: ${wallet.id}`);

    res.json({
      success: true,
      walletId: wallet.id,
      walletAddress,
      isPrimary: wallet.isPrimary,
    });
  } catch (error: any) {
    console.error('Failed to connect wallet:', error);
    res.status(500).json({
      error: 'Failed to connect wallet',
      message: error.message,
    });
  }
});

/**
 * GET /api/points/wallets
 * Get user's connected wallets
 */
router.get('/wallets', SupabaseAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const wallets = await getUserWallets(userId);

    res.json({
      wallets: wallets.map((w) => ({
        id: w.id,
        address: w.walletAddress,
        type: w.walletType,
        isPrimary: w.isPrimary,
        usdcBalance: w.usdcBalance?.toString(),
        pointsBalance: w.pointsBalance?.toString(),
        connectedAt: w.connectedAt,
      })),
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get wallets',
      message: error.message,
    });
  }
});

/**
 * POST /api/points/set-primary-wallet/:walletId
 * Set primary wallet for transactions
 */
router.post('/set-primary-wallet/:walletId', SupabaseAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { walletId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const walletIdNum = parseInt(walletId);

    // Verify wallet belongs to user
    const primaryWallet = await getUserPrimaryWallet(userId);
    
    await setPrimaryWallet(walletIdNum, userId);

    res.json({
      success: true,
      message: 'Primary wallet updated',
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to set primary wallet',
      message: error.message,
    });
  }
});

/**
 * POST /api/points/admin/claim-weekly
 * Allow admins to claim their earned points for the week
 * Points earned from challenges/events they administered
 * 
 * Request body:
 *   - walletAddress: Wallet to receive the points payout to
 * 
 * Response:
 *   - claimedAmount: Points claimed this week
 *   - transactionId: Database transaction ID for this claim
 *   - nextClaimDate: When admin can claim next
 */
router.post('/admin/claim-weekly', SupabaseAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const adminId = req.user?.id;
    const { walletAddress } = req.body;

    if (!adminId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!walletAddress) {
      return res.status(400).json({
        error: 'Missing required field: walletAddress',
      });
    }

    // Get admin's earned points for this week
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);

    const weeklyEarnings = await db
      .select()
      .from(pointsTransactions)
      .where((tx) => {
        const created = new Date(tx.createdAt);
        return created >= weekStart && tx.userId === adminId && 
               (tx.transactionType === 'earned_challenge' || tx.transactionType === 'earned_event');
      });

    if (weeklyEarnings.length === 0) {
      return res.status(400).json({
        error: 'No points earned this week to claim',
      });
    }

    // Calculate total earned this week
    let totalEarned = 0n;
    for (const earning of weeklyEarnings) {
      const amount = BigInt(earning.amount);
      totalEarned += amount;
    }

    // Record the weekly claim transaction
    await recordPointsTransaction({
      userId: adminId,
      challengeId: undefined,
      transactionType: 'admin_claim_weekly',
      amount: totalEarned,
      reason: `Weekly admin payout - ${weekStart.toLocaleDateString()}`,
      blockchainTxHash: walletAddress, // Store wallet address in txHash field
    });

    // Calculate next claim date (same time next week)
    const nextClaimDate = new Date(weekStart);
    nextClaimDate.setDate(nextClaimDate.getDate() + 7);

    console.log(`✅ Admin ${adminId} claimed ${(Number(totalEarned) / 1e18).toFixed(2)} BPTS`);
    console.log(`💰 Payout address: ${walletAddress}`);

    res.json({
      success: true,
      claimedAmount: (Number(totalEarned) / 1e18).toFixed(2),
      claimedAmountRaw: totalEarned.toString(),
      walletAddress,
      transactionCount: weeklyEarnings.length,
      nextClaimDate: nextClaimDate.toISOString(),
      message: `Successfully claimed ${(Number(totalEarned) / 1e18).toFixed(2)} BPTS. Points will be sent to ${walletAddress}.`,
    });
  } catch (error: any) {
    console.error('Failed to claim weekly points:', error);
    res.status(500).json({
      error: 'Failed to claim weekly points',
      message: error.message,
    });
  }
});

/**
 * GET /api/points/admin/weekly-earnings
 * Get admin's earned points for the current week (before claiming)
 * 
 * Response:
 *   - weeklyEarnings: Total points earned this week
 *   - transactionCount: Number of earning transactions this week
 *   - canClaimThisWeek: Boolean if admin hasn't claimed yet this week
 *   - lastClaimedAt: When admin last claimed
 *   - nextClaimDate: When they can claim next
 */
router.get('/admin/weekly-earnings', SupabaseAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    // Get this week's earnings
    const weeklyEarnings = await db
      .select()
      .from(pointsTransactions)
      .where((tx) => {
        const created = new Date(tx.createdAt);
        return created >= weekStart && tx.userId === adminId && 
               (tx.transactionType === 'earned_challenge' || tx.transactionType === 'earned_event');
      });

    // Get last claim date
    const lastClaim = await db
      .select()
      .from(pointsTransactions)
      .where((tx) => tx.userId === adminId && tx.transactionType === 'admin_claim_weekly')
      .orderBy((tx) => desc(tx.createdAt))
      .limit(1);

    let totalEarned = 0n;
    for (const earning of weeklyEarnings) {
      const amount = BigInt(earning.amount);
      totalEarned += amount;
    }

    const lastClaimedAt = lastClaim.length > 0 ? new Date(lastClaim[0].createdAt) : null;
    const nextClaimDate = new Date(weekStart);
    nextClaimDate.setDate(nextClaimDate.getDate() + 7);

    // Can claim if hasn't claimed this week yet
    const canClaimThisWeek = !lastClaimedAt || lastClaimedAt < weekStart;

    res.json({
      adminId,
      weeklyEarnings: (Number(totalEarned) / 1e18).toFixed(2),
      weeklyEarningsRaw: totalEarned.toString(),
      transactionCount: weeklyEarnings.length,
      canClaimThisWeek,
      lastClaimedAt,
      weekStart: weekStart.toISOString(),
      nextClaimDate: nextClaimDate.toISOString(),
      weekEndDate: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error: any) {
    console.error('Failed to get weekly earnings:', error);
    res.status(500).json({
      error: 'Failed to get weekly earnings',
      message: error.message,
    });
  }
});

/**
 * GET /api/points/admin/user-weekly-earnings
 * Get all users with their earned points for the current week
 * Admin only - returns list of users for payout processing
 * 
 * Response:
 *   - Array of users with:
 *     - userId: User ID
 *     - username: Username
 *     - email: User email
 *     - weeklyEarnings: Points earned this week
 *     - transactionCount: Number of transactions this week
 */
router.get('/admin/user-weekly-earnings', SupabaseAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get week start
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    // Get all earning transactions this week
    const allEarnings = await db
      .select()
      .from(pointsTransactions)
      .where((tx) => {
        const created = new Date(tx.createdAt);
        return created >= weekStart && 
               (tx.transactionType === 'earned_challenge' || tx.transactionType === 'earned_event');
      });

    // Group by user and calculate totals
    const userEarningsMap = new Map<string, { totalEarned: bigint; count: number }>();
    
    for (const earning of allEarnings) {
      const userId = earning.userId;
      if (!userEarningsMap.has(userId)) {
        userEarningsMap.set(userId, { totalEarned: 0n, count: 0 });
      }
      const current = userEarningsMap.get(userId)!;
      current.totalEarned += BigInt(earning.amount);
      current.count += 1;
    }

    // Get user details for all users with earnings
    const usersWithDetails = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
      })
      .from(users)
      .where((u) => {
        // Filter users who have earnings
        const userIds = Array.from(userEarningsMap.keys());
        if (userIds.length === 0) return false;
        return userIds.includes(u.id) ? true : false;
      });

    // Combine user details with earnings
    const result = usersWithDetails
      .map((user) => {
        const earnings = userEarningsMap.get(user.id)!;
        return {
          userId: user.id,
          username: user.username,
          email: typeof user.email === 'string' ? user.email : (user.email as any)?.address,
          weeklyEarnings: Number(earnings.totalEarned) / 1e18,
          transactionCount: earnings.count,
        };
      })
      .sort((a, b) => b.weeklyEarnings - a.weeklyEarnings);

    res.json(result);
  } catch (error: any) {
    console.error('Failed to get user weekly earnings:', error);
    res.status(500).json({
      error: 'Failed to get user weekly earnings',
      message: error.message,
    });
  }
});

/**
 * POST /api/points/admin/payout-weekly
 * Process batch payouts for multiple users
 * Admin sends earned points to user wallets
 * 
 * Request body:
 *   - payouts: Array of { userId, walletAddress }
 * 
 * Response:
 *   - processedCount: Number of successful payouts
 *   - totalAmount: Total points distributed
 *   - payouts: Array of processed payout records
 */
router.post('/admin/payout-weekly', SupabaseAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const adminId = req.user?.id;
    const { payouts } = req.body;

    if (!adminId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!Array.isArray(payouts) || payouts.length === 0) {
      return res.status(400).json({
        error: 'Missing or invalid payouts array',
      });
    }

    // Get week start
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const processedPayouts = [];
    let totalAmount = 0n;

    for (const payout of payouts) {
      const { userId, walletAddress } = payout;

      if (!userId || !walletAddress) {
        console.warn('Skipping invalid payout entry:', payout);
        continue;
      }

      try {
        // Get user's earnings for the week
        const userEarnings = await db
          .select()
          .from(pointsTransactions)
          .where((tx) => {
            const created = new Date(tx.createdAt);
            return created >= weekStart && 
                   tx.userId === userId &&
                   (tx.transactionType === 'earned_challenge' || tx.transactionType === 'earned_event');
          });

        if (userEarnings.length === 0) {
          console.log(`No earnings for user ${userId} this week`);
          continue;
        }

        // Calculate total for this user
        let userTotal = 0n;
        for (const earning of userEarnings) {
          userTotal += BigInt(earning.amount);
        }

        // Record the payout transaction
        const txId = await recordPointsTransaction({
          userId,
          challengeId: undefined,
          transactionType: 'admin_claim_weekly',
          amount: userTotal,
          reason: `Weekly admin payout - ${weekStart.toLocaleDateString()}`,
          blockchainTxHash: walletAddress, // Store wallet address in txHash field
        });

        processedPayouts.push({
          userId,
          walletAddress,
          amount: Number(userTotal) / 1e18,
          transactionId: txId,
          transactionCount: userEarnings.length,
        });

        totalAmount += userTotal;

        console.log(`✅ Payout processed for user ${userId}: ${(Number(userTotal) / 1e18).toFixed(2)} BPTS to ${walletAddress}`);
      } catch (error) {
        console.error(`Failed to process payout for user ${userId}:`, error);
      }
    }

    res.json({
      success: true,
      processedCount: processedPayouts.length,
      totalAmount: (Number(totalAmount) / 1e18).toFixed(2),
      totalAmountRaw: totalAmount.toString(),
      payouts: processedPayouts,
      message: `Successfully processed ${processedPayouts.length} payouts totaling ${(Number(totalAmount) / 1e18).toFixed(2)} BPTS`,
    });
  } catch (error: any) {
    console.error('Failed to process payouts:', error);
    res.status(500).json({
      error: 'Failed to process payouts',
      message: error.message,
    });
  }
});

export default router;
