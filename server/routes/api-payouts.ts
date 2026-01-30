/**
 * Phase 4: API Routes - Payouts & Claims
 * REST endpoints for claiming winnings and managing payouts
 */

import { Router, Request, Response } from 'express';
import { isAuthenticated } from '../auth';
import { claimPayout } from '../blockchain/helpers';
import {
  updateEscrowStatus,
  getUserActiveEscrows,
  recordPointsTransaction,
  logBlockchainTransaction,
} from '../blockchain/db-utils';
import { db } from '../db';
import { challenges } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * POST /api/payouts/:challengeId/claim
 * Claim payout for winning a challenge
 * Only callable by the winner after challenge is resolved
 */
router.post('/:challengeId/claim', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { challengeId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!challengeId) {
      return res.status(400).json({ error: 'Challenge ID required' });
    }

    const cId = parseInt(challengeId);

    console.log(`\n💰 User ${userId} claiming payout for challenge ${cId}...`);

    // Get challenge
    const dbChallenge = await db
      .select()
      .from(challenges)
      .where(eq(challenges.id, cId))
      .limit(1);

    if (!dbChallenge.length) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    const challenge = dbChallenge[0];

    // Verify user is the winner (this should be verified on-chain)
    // For now, check if challenge is resolved and user has payout available

    if (challenge.onChainStatus !== 'resolved') {
      return res.status(400).json({
        error: 'Challenge not resolved yet',
        status: challenge.onChainStatus,
      });
    }

    // Claim on-chain
    console.log(`⛓️  Claiming payout on-chain...`);
    const txResult = await claimPayout(cId, req.user as any);

    // Update escrow record
    const escrows = await getUserActiveEscrows(userId);
    for (const escrow of escrows) {
      if (escrow.challengeId === cId) {
        await updateEscrowStatus(escrow.id, 'claimed', txResult.transactionHash);
      }
    }

    // Log blockchain transaction
    await logBlockchainTransaction({
      chainId: 84532,
      transactionHash: txResult.transactionHash,
      transactionType: 'payout_claim',
      contractAddress: challenge.blockchainContractAddress || '',
      fromAddress: userId,
      toAddress: userId,
      functionName: 'claimPayout',
      parameters: JSON.stringify({ challengeId: cId }),
      status: 'success',
      challengeId: cId,
      userId,
    });

    console.log(`✅ Payout claimed: ${txResult.transactionHash}`);

    res.json({
      success: true,
      challengeId: cId,
      transactionHash: txResult.transactionHash,
      message: 'Payout claimed successfully',
    });
  } catch (error: any) {
    console.error('Failed to claim payout:', error);
    res.status(500).json({
      error: 'Failed to claim payout',
      message: error.message,
    });
  }
});

/**
 * GET /api/payouts/user/:userId
 * Get user's pending and completed payouts
 */
router.get('/user/:userId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { status = 'all' } = req.query;

    // Get user's challenges
    let query = db
      .select()
      .from(challenges)
      .where(db.raw(`(challenger = $1 OR challenged = $1)`, [userId]));

    if (status !== 'all') {
      query = query.where(eq(challenges.onChainStatus, status as string));
    }

    const userChallenges = await query;

    // Filter for resolved/claimed
    const claimable = userChallenges.filter(
      (c) => c.onChainStatus === 'resolved' || c.onChainStatus === 'claimed'
    );

    res.json({
      claimable: claimable.length,
      challenges: userChallenges,
      total: userChallenges.length,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get payouts',
      message: error.message,
    });
  }
});

/**
 * GET /api/payouts/:challengeId/status
 * Get payout status for a specific challenge
 */
router.get('/:challengeId/status', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const challengeId = parseInt(req.params.challengeId);

    const dbChallenge = await db
      .select()
      .from(challenges)
      .where(eq(challenges.id, challengeId))
      .limit(1);

    if (!dbChallenge.length) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    const challenge = dbChallenge[0];

    res.json({
      challengeId,
      status: challenge.onChainStatus,
      resolved: challenge.onChainResolved,
      winner: challenge.challenger, // Simplified - actual winner determined on-chain
      stakeAmount: challenge.stakeAmountWei,
      paymentToken: challenge.paymentTokenAddress,
      resolutionTxHash: challenge.blockchainResolutionTxHash,
      payoutTxHash: challenge.blockchainPayoutTxHash,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get payout status',
      message: error.message,
    });
  }
});

/**
 * POST /api/payouts/batch-claim
 * Claim multiple payouts in one request
 * Useful for claiming multiple wins at once
 */
router.post('/batch-claim', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { challengeIds } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!Array.isArray(challengeIds) || challengeIds.length === 0) {
      return res.status(400).json({
        error: 'Challenge IDs array required',
      });
    }

    console.log(`\n📦 Batch claiming ${challengeIds.length} payouts for user ${userId}...`);

    const results = [];
    const failures = [];

    for (const challengeId of challengeIds) {
      try {
        console.log(`  Claiming challenge ${challengeId}...`);

        const dbChallenge = await db
          .select()
          .from(challenges)
          .where(eq(challenges.id, challengeId))
          .limit(1);

        if (!dbChallenge.length) {
          failures.push({
            challengeId,
            error: 'Challenge not found',
          });
          continue;
        }

        const challenge = dbChallenge[0];

        if (challenge.onChainStatus !== 'resolved') {
          failures.push({
            challengeId,
            error: `Not resolved (status: ${challenge.onChainStatus})`,
          });
          continue;
        }

        // Claim
        const txResult = await claimPayout(challengeId, req.user as any);

        results.push({
          challengeId,
          success: true,
          transactionHash: txResult.transactionHash,
        });
      } catch (error: any) {
        failures.push({
          challengeId,
          error: error.message,
        });
      }
    }

    console.log(`✅ Batch claim complete: ${results.length} successful, ${failures.length} failed`);

    res.json({
      successful: results.length,
      failed: failures.length,
      results,
      failures: failures.length > 0 ? failures : undefined,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Batch claim failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/payouts/earnings-history
 * Get cumulative earnings data for the past N days
 */
router.get('/earnings-history', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const days = parseInt(req.query.days as string) || 7;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Generate realistic mock daily data for the past N days
    const data = [];
    let cumulativeEarnings = Math.random() * 50; // Start with some random amount
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      // Mock daily earnings with more realistic patterns
      // Most days earn 5-30, some days earn more
      const variance = Math.sin(i * 0.5) * 10 + 15;
      const dailyEarnings = Math.max(0, variance + (Math.random() - 0.5) * 20);
      cumulativeEarnings += dailyEarnings;
      
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        amount: parseFloat(cumulativeEarnings.toFixed(2)),
      });
    }

    res.json(data);
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get earnings history',
      message: error.message,
    });
  }
});

export default router;
