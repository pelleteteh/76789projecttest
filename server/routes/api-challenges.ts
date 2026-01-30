/**
 * Phase 4: API Routes - Challenge Operations
 * REST endpoints for challenge creation, joining, and management
 * 
 * Points Distribution (New System):
 * - Challenge Creation: 50 + (Amount × 5) = MAX 500 pts
 * - Challenge Joining: 10 + (Amount × 4) = MAX 500 pts
 * - Referral: 200 pts (one-time per user)
 * - Weekly claiming enabled
 */

import { ethers } from 'ethers';
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { isAuthenticated } from '../auth';
import { PrivyAuthMiddleware } from '../privyAuth';
import { NotificationService, NotificationEvent, NotificationChannel, NotificationPriority } from '../notificationService';
import {
  createAdminChallenge,
  createP2PChallenge,
  joinAdminChallenge,
  acceptP2PChallenge,
  getChallenge,
  getChallengeParticipants,
  getUserLockedStakes,
  getTokenBalance,
  approveToken,
} from '../blockchain/helpers';
import {
  recordPointsTransaction,
  createEscrowRecord,
  recordContractDeployment,
  addUserWallet,
  getUserPrimaryWallet as dbGetUserPrimaryWallet,
} from '../blockchain/db-utils';
import { calculateCreationPoints, calculateParticipationPoints } from '../utils/points-calculator';
import { notifyPointsEarnedParticipation, notifyPointsEarnedCreation } from '../utils/bantahPointsNotifications';
import { db } from '../db';
import { challenges, users } from '../../shared/schema';
import { eq, inArray } from 'drizzle-orm';
import { telegramBot } from '../telegramBot';

const router = Router();

// Multer configuration for evidence file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 5 // Maximum 5 files per submission
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types for evidence and cover images
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/svg+xml',
      'image/webp',
      'video/mp4',
      'video/webm',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`), false);
    }
  }
});
const notificationService = new NotificationService();

/**
 * GET /api/challenges/public
 * Get all public challenges (no auth required)
 * Includes user data for challenger and challenged users
 */
router.get('/public', async (req: Request, res: Response) => {
  try {
    const allChallenges = await db.select().from(challenges);
    
    // Filter public challenges (open status or completed)
    const publicChallenges = allChallenges.filter(c => 
      c.status === 'open' || c.status === 'active' || c.status === 'completed' || c.status === 'pending'
    );

    // Get unique user IDs from the challenges
    const userIds = new Set<string>();
    publicChallenges.forEach(challenge => {
      if (challenge.challenger) userIds.add(challenge.challenger);
      if (challenge.challenged) userIds.add(challenge.challenged);
    });

    // Fetch user data for all unique user IDs
    const usersData = await db
      .select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
      })
      .from(users)
      .where(inArray(users.id, Array.from(userIds)));

    // Get primary wallet addresses for all users
    const userMap = new Map();
    for (const user of usersData) {
      const primaryWallet = await dbGetUserPrimaryWallet(user.id);
      userMap.set(user.id, {
        ...user,
        primaryWalletAddress: primaryWallet?.walletAddress || null,
      });
    }

    // Combine challenge data with user data
    const challengesWithUsers = publicChallenges.map(challenge => ({
      ...challenge,
      challengerUser: challenge.challenger ? userMap.get(challenge.challenger) : null,
      challengedUser: challenge.challenged ? userMap.get(challenge.challenged) : null,
    }));

    console.log(`📊 GET /api/challenges/public: ${challengesWithUsers.length} challenges found`);
    res.json(challengesWithUsers);
  } catch (error: any) {
    console.error('Error fetching public challenges:', error);
    res.status(500).json({ error: 'Failed to fetch challenges' });
  }
});

/**
 * GET /api/challenges/debug/status
 * Debug endpoint to check database and API health
 */
router.get('/debug/status', async (req: Request, res: Response) => {
  try {
    const allChallenges = await db.select().from(challenges);
    const statuses = allChallenges.reduce((acc: any, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {});

    const activeCount = allChallenges.filter(c => 
      c.status === 'open' || c.status === 'active' || c.status === 'completed' || c.status === 'pending'
    ).length;

    console.log(`\n🔍 Challenge Status Debug:`);
    console.log(`   Total challenges in DB: ${allChallenges.length}`);
    console.log(`   By status: ${JSON.stringify(statuses)}`);
    console.log(`   Public challenges (displayed): ${activeCount}`);

    res.json({
      success: true,
      total: allChallenges.length,
      byStatus: statuses,
      publicCount: activeCount,
      recentChallenges: allChallenges
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map(c => ({
          id: c.id,
          title: c.title,
          status: c.status,
          challenger: c.challenger,
          createdAt: c.createdAt,
          transactionHash: c.creatorTransactionHash
        }))
    });
  } catch (error: any) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/challenges/create-admin
 * Create a new admin-created challenge (betting pool)
 */
router.post('/create-admin', PrivyAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { stakeAmount, paymentToken, metadataURI, title, description, category, dueDate } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!stakeAmount || !paymentToken || !metadataURI) {
      return res.status(400).json({
        error: 'Missing required fields: stakeAmount, paymentToken, metadataURI',
      });
    }

    // Validate token addresses (USDC or USDT on Base Sepolia)
    const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b3566dA8860';
    const USDT = '0x3c499c542cEF5E3811e1192ce70d8cC7d307B653';
    
    if (![USDC, USDT].includes(paymentToken.toLowerCase())) {
      return res.status(400).json({
        error: 'Invalid token. Must be USDC or USDT',
      });
    }

    console.log(`\n💾 Creating admin challenge from ${userId}...`);

    // Calculate creation points based on stake amount (50 + amount × 5, MAX 500)
    const stakeAmountUSD = parseInt(stakeAmount); // USDC/USDT amounts are in USD equivalent
    const creationPoints = Math.min(50 + (stakeAmountUSD * 5), 500);
    console.log(`🎁 Challenge creator will earn ${creationPoints} Bantah Points`);

    // Parse and validate dueDate (optional). Default to 24h from now if not provided.
    const parsedDueDate = dueDate ? new Date(dueDate) : new Date(Date.now() + 24 * 60 * 60 * 1000);
    if (isNaN(parsedDueDate.getTime()) || parsedDueDate.getTime() <= Date.now()) {
      return res.status(400).json({ error: 'Invalid dueDate. Must be a future date.' });
    }

    // Create challenge in database first
    const dbChallenge = await db
      .insert(challenges)
      .values({
        title,
        description,
        category: category || 'general',
        amount: parseInt(stakeAmount) * 2, // Display both sides
        status: 'pending',
        adminCreated: true,
        challenger: userId,
        dueDate: parsedDueDate,
        paymentTokenAddress: paymentToken,
        stakeAmountWei: BigInt(stakeAmount + '000000'), // 6 decimals for USDC/USDT
        onChainStatus: 'pending',
        pointsAwarded: creationPoints, // Store creation points for winner to earn
      })
      .returning();

    const challengeId = dbChallenge[0].id;
    console.log(`📋 Challenge created in DB with ID: ${challengeId}`);

    // Create on-chain
    console.log(`⛓️  Creating on-chain...`);
    const txResult = await createAdminChallenge(
      stakeAmount,
      paymentToken,
      metadataURI
    );

    // Update database with blockchain info
    await db
      .update(challenges)
      .set({
        blockchainCreationTxHash: txResult.transactionHash,
        blockchainBlockNumber: txResult.blockNumber,
        onChainStatus: 'active',
        onChainResolved: false,
      })
      .where(eq(challenges.id, challengeId));

    console.log(`✅ Admin challenge created: ${txResult.transactionHash}`);

    // Broadcast to Telegram (NO tags for admin challenges)
    try {
      // Get the challenge from database to access coverImageUrl
      const dbChallenge = await db
        .select()
        .from(challenges)
        .where(eq(challenges.id, challengeId))
        .limit(1);
      
      await telegramBot.broadcastChallenge({
        id: challengeId,
        title,
        description,
        amount: parseInt(stakeAmount),
        category: category || 'general',
        creator: { username: 'Admin', firstName: 'Admin' },
        challengeType: 'admin',
        status: 'pending',
        isAdminChallenge: true, // No tags for admin challenges
        coverImageUrl: dbChallenge[0]?.coverImageUrl || undefined,
      });
    } catch (err) {
      console.error('Failed to broadcast admin challenge to Telegram:', err);
      // Don't fail the challenge creation if Telegram posting fails
    }

    res.json({
      success: true,
      challengeId,
      transactionHash: txResult.transactionHash,
      blockNumber: txResult.blockNumber,
      title,
      stakeAmount,
      paymentToken,
    });
  } catch (error: any) {
    console.error('Failed to create admin challenge:', error);
    res.status(500).json({
      error: 'Failed to create challenge',
      message: error.message,
    });
  }
});

/**
 * POST /api/challenges/create-p2p
 * Create a P2P challenge (direct or open)
 * - Direct P2P: opponentId specified, only that user can accept
 * - Open Challenge: opponentId null/undefined, anyone can accept
 * Note: User must sign the blockchain transaction client-side with their wallet
 */
router.post('/create-p2p', PrivyAuthMiddleware, upload.single('coverImage'), async (req: Request, res: Response) => {
  try {
    const { opponentId, stakeAmount, paymentToken, metadataURI, title, description, challengeType, dueDate, transactionHash, side } = req.body;
    const userId = req.user?.id || req.user?.sub || (req.user?.claims?.sub);

    console.log(`\n📨 POST /api/challenges/create-p2p`);
    console.log(`  ✓ Auth successful - userId: ${userId?.substring(0, 20)}...`);
    console.log(`  ✓ Request received with:`);
    console.log(`    - title: ${title}`);
    console.log(`    - stakeAmount: ${stakeAmount}`);
    console.log(`    - paymentToken: ${paymentToken}`);
    console.log(`    - transactionHash: ${transactionHash?.substring(0, 10)}...`);
    console.log(`    - challengeType: ${challengeType}`);

    if (!userId) {
      console.error('❌ User ID not found in request');
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!stakeAmount || !paymentToken) {
      console.error(`❌ Missing required fields: stakeAmount=${!!stakeAmount}, paymentToken=${!!paymentToken}`);
      return res.status(400).json({
        error: 'Missing required fields: stakeAmount, paymentToken',
      });
    }

    // Determine if this is open or direct P2P
    const isOpenChallenge = !opponentId;
    const type = challengeType || (isOpenChallenge ? 'open' : 'p2p');

    if (!isOpenChallenge && userId === opponentId) {
      return res.status(400).json({
        error: 'Cannot challenge yourself',
      });
    }

    console.log(`\n💾 Creating ${type} challenge: creator=${userId}${!isOpenChallenge ? ` opponent=${opponentId}` : ' (open - any joiner)'}`);

    // Calculate creation points based on stake amount (50 + amount × 5, MAX 500)
    // stakeAmount comes as a decimal string (e.g., "0.000008" for ETH or "100" for USDC)
    const stakeAmountUSD = parseFloat(stakeAmount); // Parse as float to handle decimals
    const creationPoints = Math.min(50 + (stakeAmountUSD * 5), 500);
    console.log(`🎁 Challenge creator will earn ${creationPoints} Bantah Points`);

    // Parse and validate dueDate (optional). Default to 24h from now if not provided.
    const parsedDueDate = dueDate ? new Date(dueDate) : new Date(Date.now() + 24 * 60 * 60 * 1000);
    if (isNaN(parsedDueDate.getTime()) || parsedDueDate.getTime() <= Date.now()) {
      return res.status(400).json({ error: 'Invalid dueDate. Must be a future date.' });
    }

    // Handle cover image upload if provided
    let coverImageUrl: string | null = null;
    if (req.file) {
      try {
        // For now, store as base64 data URL (production would use cloud storage)
        const base64Data = req.file.buffer.toString('base64');
        coverImageUrl = `data:${req.file.mimetype};base64,${base64Data}`;
        console.log(`🖼️  Cover image uploaded: ${req.file.originalname} (${req.file.size} bytes)`);
      } catch (err) {
        console.error('Error processing cover image:', err);
        // Don't fail challenge creation if image processing fails
      }
    }

    // Create in database with blockchain status
    // Determine decimals based on token type
    const isNativeETH = paymentToken === '0x0000000000000000000000000000000000000000' || paymentToken?.toLowerCase() === '0x0000000000000000000000000000000000000000';
    const tokenDecimals = isNativeETH ? 18 : 6; // ETH has 18 decimals, USDC/USDT have 6
    
    const dbChallenge = await db
      .insert(challenges)
      .values({
        title,
        description,
        category: 'p2p',
        amount: Math.floor(parseFloat(stakeAmount) * 2),
        status: isOpenChallenge ? 'open' : 'pending',
        adminCreated: false,
        challenger: userId,
        challenged: opponentId || null,
        challengerSide: side || 'YES', // Default to YES if not provided
        dueDate: parsedDueDate,
        paymentTokenAddress: paymentToken,
        stakeAmountWei: BigInt(ethers.parseUnits(stakeAmount, tokenDecimals).toString()),
        onChainStatus: transactionHash ? 'submitted' : 'pending',
        creatorTransactionHash: transactionHash || null,
        pointsAwarded: creationPoints,
        coverImageUrl: coverImageUrl || undefined,
      })
      .returning();

    const challengeId = dbChallenge[0].id;

    console.log(`✅ ${type} challenge created in DB: ${challengeId}`);
    console.log(`📝 User must sign transaction client-side to complete`);

    // Get challenger name for notification
    const challenger = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const challengerName = challenger[0]?.firstName || 'Someone';

    // For direct P2P: send notification to specific opponent
    if (!isOpenChallenge && opponentId) {
      await notificationService.send({
        userId: opponentId,
        challengeId: challengeId.toString(),
        event: NotificationEvent.CHALLENGE_CREATED,
        title: `🎯 ${challengerName} challenged you!`,
        body: `${challengerName} challenged you to: "${title}"`,
        channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
        priority: NotificationPriority.MEDIUM,
        data: {
          challengeId: challengeId,
          title,
          stakeAmount,
          challenger: userId,
        },
      }).catch(err => {
        console.warn('Failed to send challenge notification:', err.message);
      });

      console.log(`📬 Notification sent to opponent ${opponentId}`);
    } else {
      // For open challenges: send notification to creator that the challenge was created
      await notificationService.send({
        userId: userId,
        challengeId: challengeId.toString(),
        event: NotificationEvent.CHALLENGE_CREATED,
        title: `✅ Challenge created!`,
        body: `Your challenge is now live! Wait for others to see it and accept it.Goodluck!`,
        channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
        priority: NotificationPriority.MEDIUM,
        data: {
          challengeId: challengeId,
          title,
          stakeAmount,
        },
      }).catch(err => {
        console.warn('Failed to send open challenge notification:', err.message);
      });

      console.log(`📢 Open challenge notification sent to creator`);
    }

    // Broadcast to Telegram
    try {
      // Get the challenge from database to access coverImageUrl
      const dbChallenge = await db
        .select()
        .from(challenges)
        .where(eq(challenges.id, challengeId))
        .limit(1);
      
      await telegramBot.broadcastChallenge({
        id: challengeId,
        title,
        description,
        amount: parseInt(stakeAmount),
        category: 'p2p', // P2P challenges are tagged as p2p category
        creator: {
          username: challenger[0]?.username || 'user',
          firstName: challenger[0]?.firstName,
        },
        challengeType: isOpenChallenge ? 'open' : 'direct',
        status: 'pending',
        isAdminChallenge: false, // P2P challenges get tagged
        coverImageUrl: dbChallenge[0]?.coverImageUrl || undefined,
      });
    } catch (err) {
      console.error('Failed to broadcast P2P challenge to Telegram:', err);
      // Don't fail the challenge creation if Telegram posting fails
    }

    // Award points to the creator for creating the challenge
    try {
      console.log(`\n🎁 Awarding ${creationPoints} Bantah Points to creator ${userId}...`);
      
      // Update legacy points column in users table as well
      await db.update(users)
        .set({ points: sql`${users.points} + ${Math.floor(creationPoints)}` })
        .where(eq(users.id, userId));

      // Record the points transaction
      const pointsResult = await recordPointsTransaction({
        userId,
        challengeId,
        transactionType: 'earned_challenge_creation',
        amount: BigInt(Math.floor(creationPoints * 1e18)),
        reason: `Created ${type} challenge: "${title}"`,
        blockchainTxHash: transactionHash || null,
      });
      console.log(`✅ Points transaction recorded:`, pointsResult);

      // Send notification to creator about points earned
      const notificationSent = await notifyPointsEarnedCreation(
        userId,
        challengeId,
        creationPoints,
        title || `Challenge #${challengeId}`
      );
      
      if (notificationSent) {
        console.log(`✅ Points earned notification sent to creator`);
      } else {
        console.warn('⚠️ Points earned notification failed but points were recorded');
      }
    } catch (pointsError: any) {
      console.error('❌ Failed to award creation points:', pointsError.message);
      // Don't fail challenge creation if points awarding fails - points system is secondary
    }

    // Award Bantah Points for creation
    const finalCreationPoints = Math.min(50 + Math.floor(amount * 5), 500);
    const creationPointsWei = BigInt(finalCreationPoints) * BigInt(1e18);
    
    await recordPointsTransaction({
      userId: userId,
      transactionType: 'creation_reward',
      amount: creationPointsWei,
      reason: `Creating challenge: ${title}`,
      challengeId: newChallenge.id
    }).catch(err => console.error('Failed to award creation points:', err));

    // Update legacy points column for leaderboard sync
    await db.execute(sql`UPDATE users SET points = points + ${finalCreationPoints} WHERE id = ${userId}`);

    console.log(`\n✅✅✅ SUCCESS - Sending response to frontend`);
    console.log(`   challengeId: ${newChallenge.id}`);
    console.log(`   title: ${title}`);
    console.log(`   pointsAwarded: ${finalCreationPoints}`);
    
    res.json({
      success: true,
      challengeId: newChallenge.id,
      title,
      type,
      opponent: opponentId || null,
      stakeAmount,
      pointsAwarded: finalCreationPoints,
      message: `${type === 'open' ? 'Open' : 'Direct P2P'} challenge created. You earned ${finalCreationPoints} Bantah Points!`,
    });
  } catch (error: any) {
    console.error('❌ FAILED TO CREATE P2P CHALLENGE:', error.message);
    console.error(`   Error stack:`, error.stack);
    res.status(500).json({
      error: 'Failed to create P2P challenge',
      message: error.message,
    });
  }
});

/**
 * POST /api/challenges/:id/join
 * Join an admin challenge (choose YES or NO side)
 */
router.post('/:id/join', PrivyAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { side } = req.body; // true for YES, false for NO
    const challengeId = parseInt(req.params.id);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (side === undefined) {
      return res.status(400).json({
        error: 'Missing required field: side (true for YES, false for NO)',
      });
    }

    console.log(`\n🔗 User ${userId} joining challenge ${challengeId} on side ${side ? 'YES' : 'NO'}...`);

    // Get challenge
    const dbChallenge = await db
      .select()
      .from(challenges)
      .where(eq(challenges.id, challengeId))
      .limit(1);

    if (!dbChallenge.length) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    const challenge = dbChallenge[0];

    // Calculate participation points based on stake amount (10 + amount × 4, MAX 500)
    const stakeAmountUSD = challenge.stakeAmountWei ? Number(challenge.stakeAmountWei) / 1e6 : 0; // Convert from wei to USD
    const participationPoints = Math.min(10 + (stakeAmountUSD * 4), 500);
    console.log(`🎁 Challenge participant will earn ${participationPoints} Bantah Points`);

    // Get on-chain challenge
    const onChainChallenge = await getChallenge(challengeId);

    // Join on-chain
    const txResult = await joinAdminChallenge(
      challengeId,
      side,
      req.user as any
    );

    // Record escrow
    if (challenge.stakeAmountWei) {
      await createEscrowRecord({
        challengeId,
        userId,
        tokenAddress: challenge.paymentTokenAddress!,
        amountEscrowed: challenge.stakeAmountWei,
        status: 'locked',
        side: side ? 'YES' : 'NO',
        lockTxHash: txResult.transactionHash,
      });
    }

    // Award participation points to the joining user
    try {
      const pointsInWei = BigInt(Math.floor(participationPoints * 1e18));
      
      // Update legacy points column in users table as well
      await db.update(users)
        .set({ points: sql`${users.points} + ${Math.floor(participationPoints)}` })
        .where(eq(users.id, userId));

      await recordPointsTransaction({
        userId,
        challengeId,
        transactionType: 'challenge_joined',
        amount: pointsInWei,
        reason: `Participated in challenge #${challengeId}`,
        blockchainTxHash: txResult.transactionHash,
      });
      console.log(`✅ Awarded ${participationPoints} points to user ${userId} for joining challenge`);
      
      // Send notification
      await notifyPointsEarnedParticipation(
        userId,
        challengeId,
        participationPoints,
        challenge.title || `Challenge #${challengeId}`
      ).catch(err => console.error('Failed to send participation points notification:', err));
    } catch (pointsError) {
      console.error('Failed to record participation points:', pointsError);
      // Don't fail the entire request if points recording fails
    }

    // Notify the challenge creator that someone joined their challenge (if it's an open challenge)
    if (!challenge.challenged && challenge.challenger) {
      try {
        const joiner = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        const joinerName = joiner[0]?.firstName || 'Someone';

        await notificationService.send({
          userId: challenge.challenger,
          challengeId: challengeId.toString(),
          event: NotificationEvent.CHALLENGE_JOINED_FRIEND,
          title: `👤 ${joinerName} joined your challenge!`,
          body: `${joinerName} has joined your open challenge: "${challenge.title}"`,
          channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
          priority: NotificationPriority.MEDIUM,
          data: {
            challengeId: challengeId,
            title: challenge.title,
            joinerId: userId,
            joinerName: joinerName,
          },
        }).catch(err => {
          console.warn('Failed to notify creator that someone joined:', err.message);
        });

        console.log(`📬 Creator ${challenge.challenger} notified that ${joinerName} joined their challenge`);
      } catch (err) {
        console.error('Failed to send join notification to creator:', err);
      }
    }

    console.log(`✅ User joined challenge: ${txResult.transactionHash}`);

    res.json({
      success: true,
      challengeId,
      transactionHash: txResult.transactionHash,
      side: side ? 'YES' : 'NO',
    });
  } catch (error: any) {
    console.error('Failed to join challenge:', error);
    res.status(500).json({
      error: 'Failed to join challenge',
      message: error.message,
    });
  }
});

/**
 * POST /api/challenges/:id/accept
 * Accept a P2P challenge (as the challenged user)
 */
router.post('/:id/accept', PrivyAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const challengeId = parseInt(req.params.id);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    console.log(`\n🤝 User ${userId} accepting P2P challenge ${challengeId}...`);

    // Get challenge
    const dbChallenge = await db
      .select()
      .from(challenges)
      .where(eq(challenges.id, challengeId))
      .limit(1);

    if (!dbChallenge.length) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    const challenge = dbChallenge[0];

    if (challenge.challenged !== userId) {
      return res.status(403).json({
        error: 'Not the challenged user',
      });
    }

    // Accept on-chain
    const txResult = await acceptP2PChallenge(challengeId, req.user as any);

    // Record escrow
    if (challenge.stakeAmountWei) {
      await createEscrowRecord({
        challengeId,
        userId,
        tokenAddress: challenge.paymentTokenAddress!,
        amountEscrowed: challenge.stakeAmountWei,
        status: 'locked',
        side: 'CHALLENGER', // They're the acceptor
        lockTxHash: txResult.transactionHash,
      });
    }

    // Update challenge
    await db
      .update(challenges)
      .set({
        status: 'active',
        onChainStatus: 'active',
      })
      .where(eq(challenges.id, challengeId));

    console.log(`✅ P2P challenge accepted: ${txResult.transactionHash}`);

    // Get acceptor name for notification
    const acceptor = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const acceptorName = acceptor[0]?.firstName || 'Someone';

    // Send notification to challenger that their challenge was accepted
    if (challenge.challenger) {
      await notificationService.send({
        userId: challenge.challenger,
        challengeId: challengeId.toString(),
        event: NotificationEvent.CHALLENGE_JOINED_FRIEND,
        title: `⚔️ ${acceptorName} accepted your challenge!`,
        body: `${acceptorName} accepted your challenge: "${challenge.title}"`,
        channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
        priority: NotificationPriority.MEDIUM,
        data: {
          challengeId: challengeId,
          title: challenge.title,
          acceptor: userId,
        },
      }).catch(err => {
        console.warn('Failed to send acceptance notification:', err.message);
        // Don't fail the challenge acceptance if notification fails
      });

      console.log(`📬 Notification sent to challenger ${challenge.challenger}`);
    }

    res.json({
      success: true,
      challengeId,
      transactionHash: txResult.transactionHash,
    });
  } catch (error: any) {
    console.error('Failed to accept challenge:', error);
    res.status(500).json({
      error: 'Failed to accept challenge',
      message: error.message,
    });
  }
});

/**
 * GET /api/challenges/:id
 * Get challenge details with on-chain data
 */
router.get('/:id', PrivyAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const challengeId = parseInt(req.params.id);

    // Get from database
    const dbChallenge = await db
      .select()
      .from(challenges)
      .where(eq(challenges.id, challengeId))
      .limit(1);

    if (!dbChallenge.length) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    const challenge = dbChallenge[0];

    // Get user data with primary wallet addresses
    let challengerUser = null;
    let challengedUser = null;

    if (challenge.challenger) {
      const userData = await db
        .select({
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        })
        .from(users)
        .where(eq(users.id, challenge.challenger));

      if (userData.length > 0) {
        const primaryWallet = await dbGetUserPrimaryWallet(challenge.challenger);
        challengerUser = {
          ...userData[0],
          primaryWalletAddress: primaryWallet?.walletAddress || null,
        };
      }
    }

    if (challenge.challenged) {
      const userData = await db
        .select({
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        })
        .from(users)
        .where(eq(users.id, challenge.challenged));

      if (userData.length > 0) {
        const primaryWallet = await dbGetUserPrimaryWallet(challenge.challenged);
        challengedUser = {
          ...userData[0],
          primaryWalletAddress: primaryWallet?.walletAddress || null,
        };
      }
    }

    // Get on-chain data
    let onChainData = null;
    let participants = null;

    try {
      onChainData = await getChallenge(challengeId);
      participants = await getChallengeParticipants(challengeId);
    } catch (error) {
      console.warn('Could not fetch on-chain data:', error);
    }

    res.json({
      ...challenge,
      challengerUser,
      challengedUser,
      onChainData,
      participants,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get challenge',
      message: error.message,
    });
  }
});

/**
 * GET /api/challenges
 * List challenges with filters
 */
router.get('/', PrivyAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { status, adminCreated, limit = 50, offset = 0 } = req.query;

    // First get the challenges
    let query = db.select().from(challenges);

    if (status) {
      query = query.where(eq(challenges.status, status as string));
    }

    if (adminCreated !== undefined) {
      query = query.where(eq(challenges.adminCreated, adminCreated === 'true'));
    }

    const challengeResults = await query
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    // Get unique user IDs from the challenges
    const userIds = new Set<string>();
    challengeResults.forEach(challenge => {
      if (challenge.challenger) userIds.add(challenge.challenger);
      if (challenge.challenged) userIds.add(challenge.challenged);
    });

    // Fetch user data for all unique user IDs
    const usersData = await db
      .select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
      })
      .from(users)
      .where(inArray(users.id, Array.from(userIds)));

    // Get primary wallet addresses for all users
    const userMap = new Map();
    for (const user of usersData) {
      const primaryWallet = await dbGetUserPrimaryWallet(user.id);
      userMap.set(user.id, {
        ...user,
        primaryWalletAddress: primaryWallet?.walletAddress || null,
      });
    }

    // Combine challenge data with user data
    const challengesWithUsers = challengeResults.map(challenge => ({
      ...challenge,
      challengerUser: challenge.challenger ? userMap.get(challenge.challenger) : null,
      challengedUser: challenge.challenged ? userMap.get(challenge.challenged) : null,
    }));

    res.json({
      challenges: challengesWithUsers,
      total: challengeResults.length,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to list challenges',
      message: error.message,
    });
  }
});

/**
 * GET /api/challenges/user/:userId
 * Get user's challenges
 */
router.get('/user/:userId', PrivyAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const userChallenges = await db
      .select()
      .from(challenges)
      .where(
        // Challenges where user is challenger or challenged
        db.raw(
          `(challenger = $1 OR challenged = $1)`
        )
      )
      .orderBy(challenges.createdAt);

    // Get unique user IDs from the challenges
    const userIds = new Set<string>();
    userChallenges.forEach(challenge => {
      if (challenge.challenger) userIds.add(challenge.challenger);
      if (challenge.challenged) userIds.add(challenge.challenged);
    });

    // Fetch user data for all unique user IDs
    const usersData = await db
      .select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
      })
      .from(users)
      .where(inArray(users.id, Array.from(userIds)));

    // Get primary wallet addresses for all users
    const userMap = new Map();
    for (const user of usersData) {
      const primaryWallet = await dbGetUserPrimaryWallet(user.id);
      userMap.set(user.id, {
        ...user,
        primaryWalletAddress: primaryWallet?.walletAddress || null,
      });
    }

    // Combine challenge data with user data
    const challengesWithUsers = userChallenges.map(challenge => ({
      ...challenge,
      challengerUser: challenge.challenger ? userMap.get(challenge.challenger) : null,
      challengedUser: challenge.challenged ? userMap.get(challenge.challenged) : null,
    }));

    res.json({
      challenges: challengesWithUsers,
      total: challengesWithUsers.length,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get user challenges',
      message: error.message,
    });
  }
});

/**
 * POST /api/challenges/:challengeId/accept-open
 * Accept an open P2P challenge (first user to join becomes opponent)
 * Calls blockchain: joinOpenP2PChallenge()
 */
router.post('/:challengeId/accept-open', PrivyAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { challengeId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    console.log(`\n⚔️ User ${userId} accepting open challenge ${challengeId}...`);

    // Get challenge from database
    const dbChallenge = await db
      .select()
      .from(challenges)
      .where(eq(challenges.id, parseInt(challengeId)))
      .limit(1);

    if (!dbChallenge.length) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    const challenge = dbChallenge[0];

    // Validate challenge is open and waiting for opponent
    if (challenge.status !== 'open') {
      return res.status(400).json({
        error: `Challenge is not open. Current status: ${challenge.status}`,
      });
    }

    if (challenge.challenged !== null) {
      return res.status(400).json({
        error: 'Challenge has already been accepted by someone else',
      });
    }

    // Validate user is not the creator
    if (challenge.challenger === userId) {
      return res.status(403).json({
        error: 'You cannot accept your own challenge',
      });
    }

    // Step 1: Record in database that user is TRYING to accept
    // In a real blockchain flow, the frontend should sign and send us the hash
    // If the server is doing it, it MUST use the admin signer for "joinAdminChallenge" 
    // or handle P2P specifically. The error shows ethers is trying to send a tx 
    // without a signer.
    
    console.log(`✅ Challenge validation passed. Updating database...`);

    // For now, we update the DB first to mark it as active
    // In production, the frontend SHOULD have sent a transactionHash
    const { transactionHash: providedTxHash } = req.body;

    // Step 2: Update database with acceptor info
    await db
      .update(challenges)
      .set({
        challenged: userId,
        status: 'active',
        acceptorTransactionHash: providedTxHash || 'pending_onchain',
      })
      .where(eq(challenges.id, parseInt(challengeId)));

    console.log(`✅ Database updated - challenge now ACTIVE`);

    // Step 3: Get the creator for notifications
    const creator = await db
      .select()
      .from(users)
      .where(eq(users.id, challenge.challenger!))
      .limit(1);

    const acceptor = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const creatorName = creator[0]?.firstName || 'Someone';
    const acceptorName = acceptor[0]?.firstName || 'Someone';

    // Step 4: Send notifications
    console.log(`📬 Sending notifications...`);

    // Notify creator that someone accepted their challenge
    await notificationService.sendNotification({
      userId: challenge.challenger!,
      event: NotificationEvent.NEW_CHALLENGE_ACCEPTED,
      title: '⚔️ Challenge Accepted!',
      message: `${acceptorName} accepted your challenge! The battle begins now.`,
      metadata: {
        challengeId: parseInt(challengeId),
        challengeTitle: challenge.title,
        acceptorId: userId,
        acceptorName: acceptorName,
        stakeAmount: challenge.amount,
      },
      channels: [NotificationChannel.PUSHER, NotificationChannel.FIREBASE],
      priority: NotificationPriority.HIGH,
    }).catch(err => {
      console.warn('⚠️ Notification to creator failed (non-blocking):', err.message);
    });

    // Notify acceptor that they joined the challenge
    await notificationService.sendNotification({
      userId: userId,
      event: NotificationEvent.NEW_CHALLENGE_ACCEPTED,
      title: '✓ Challenge Accepted!',
      message: `You've accepted ${creatorName}'s challenge! Stakes are now locked on-chain. May the best predictor win!`,
      metadata: {
        challengeId: parseInt(challengeId),
        challengeTitle: challenge.title,
        creatorId: challenge.challenger,
        creatorName: creatorName,
        stakeAmount: challenge.amount,
        totalPool: challenge.amount * 2,
      },
      channels: [NotificationChannel.PUSHER, NotificationChannel.FIREBASE],
      priority: NotificationPriority.HIGH,
    }).catch(err => {
      console.warn('⚠️ Notification to acceptor failed (non-blocking):', err.message);
    });

    // Award Bantah Points for joining
    const joiningPoints = Math.min(10 + Math.floor(challenge.amount * 4), 500);
    const pointsWei = BigInt(joiningPoints) * BigInt(1e18);
    
    await recordPointsTransaction({
      userId: userId,
      transactionType: 'joining_reward',
      amount: pointsWei,
      reason: `Joining challenge: ${challenge.title}`,
      challengeId: parseInt(challengeId)
    }).catch(err => console.error('Failed to award joining points:', err));

    // Update legacy points column for leaderboard sync
    await db.execute(sql`UPDATE users SET points = points + ${joiningPoints} WHERE id = ${userId}`);

    console.log(`✅ Notifications sent successfully`);

    // Step 5: Return success response
    res.json({
      success: true,
      challengeId: parseInt(challengeId),
      transactionHash: providedTxHash || 'pending_onchain',
      blockNumber: null,
      status: 'active',
      title: challenge.title,
      challenger: challenge.challenger,
      challenged: userId,
      stakeAmount: challenge.amount,
      totalPool: challenge.amount * 2,
      pointsAwarded: joiningPoints,
      message: `Challenge accepted! Both stakes are now locked on-chain.`,
    });

  } catch (error: any) {
    console.error('❌ Failed to accept open challenge:', error);
    
    // Determine error type
    let errorMessage = error.message || 'Failed to accept challenge';
    let statusCode = 500;

    if (error.message?.includes('already accepted')) {
      errorMessage = 'This challenge has already been accepted by someone else';
      statusCode = 409;
    } else if (error.message?.includes('Challenge not open')) {
      errorMessage = 'This challenge is no longer open';
      statusCode = 400;
    } else if (error.message?.includes('insufficient')) {
      errorMessage = 'Insufficient USDC balance to accept this challenge';
      statusCode = 400;
    }

    res.status(statusCode).json({
      error: 'Challenge acceptance failed',
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /api/challenges/:challengeId/evidence
 * Submit evidence for a P2P challenge
 * Users can submit proof to support their position before or after dispute
 */
router.post('/:challengeId/evidence', PrivyAuthMiddleware, upload.array('files', 5), async (req: Request, res: Response) => {
  try {
    const { challengeId } = req.params;
    const userId = req.user?.id;
    const { description, type } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'Evidence description is required' });
    }

    const id = parseInt(challengeId);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid challenge ID' });
    }

    console.log(`\n📸 User ${userId} submitting evidence for challenge ${id}...`);

    // Get challenge
    const dbChallenge = await db
      .select()
      .from(challenges)
      .where(eq(challenges.id, id))
      .limit(1);

    if (!dbChallenge.length) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    const challenge = dbChallenge[0];

    // Verify user is participant
    if (challenge.challenger !== userId && challenge.challenged !== userId) {
      return res.status(403).json({ error: 'You are not a participant in this challenge' });
    }

    // Challenge must be active or completed (can submit evidence before or after)
    if (!['active', 'completed', 'disputed'].includes(challenge.status)) {
      return res.status(400).json({
        error: 'Cannot submit evidence for this challenge',
        currentStatus: challenge.status,
      });
    }

    // Collect file data
    const files = req.files as Express.Multer.File[] | undefined;
    const fileCount = files ? files.length : 0;

    if (fileCount === 0) {
      return res.status(400).json({ error: 'At least one file is required' });
    }

    if (fileCount > 5) {
      return res.status(400).json({ error: 'Maximum 5 files allowed' });
    }

    // Create evidence object
    const evidenceData = {
      submittedBy: userId,
      submittedAt: new Date().toISOString(),
      description: description.trim(),
      type: type || 'p2p_evidence',
      files: files?.map((f) => ({
        originalName: f.originalname,
        mimeType: f.mimetype,
        size: f.size,
        buffer: f.buffer.toString('base64'), // Store as base64
        fieldname: f.fieldname,
      })) || [],
    };

    // Update challenge with evidence
    await db
      .update(challenges)
      .set({
        evidence: evidenceData,
      })
      .where(eq(challenges.id, id));

    console.log(`✅ Evidence submitted for challenge ${id}`);
    console.log(`   Files: ${fileCount}`);
    console.log(`   Description: ${description.substring(0, 50)}...`);

    // Notify admins about evidence submission
    await notificationService
      .sendNotification({
        type: NotificationEvent.EVIDENCE_SUBMITTED,
        userId: 'admin', // Target admins
        title: `📸 Evidence Submitted - Challenge #${id}`,
        message: `${challenge.challengerUser?.firstName || challenge.challenger} submitted evidence for "${challenge.title}"`,
        data: {
          challengeId: id,
          submittedBy: userId,
          submittedByName: challenge.challenger === userId ? challenge.challengerUser?.firstName : challenge.challengedUser?.firstName,
          challengeTitle: challenge.title,
          fileCount,
        },
        channels: [NotificationChannel.PUSHER, NotificationChannel.FIREBASE],
        priority: NotificationPriority.HIGH,
      })
      .catch((err) => {
        console.warn('⚠️  Failed to notify admin about evidence submission:', err.message);
      });

    // Also notify the other participant
    const otherUserId = challenge.challenger === userId ? challenge.challenged : challenge.challenger;
    if (otherUserId) {
      await notificationService
        .sendNotification({
          type: NotificationEvent.CHALLENGE_UPDATE,
          userId: otherUserId,
          title: 'Evidence Submitted',
          message: 'Your opponent submitted evidence for this challenge. An admin will review it.',
          data: {
            challengeId: id,
            challengeTitle: challenge.title,
          },
          channels: [NotificationChannel.PUSHER],
          priority: NotificationPriority.MEDIUM,
        })
        .catch((err) => {
          console.warn('⚠️  Failed to notify other participant:', err.message);
        });
    }

    res.json({
      success: true,
      challengeId: id,
      message: 'Evidence submitted successfully',
      evidenceData: {
        submittedBy: userId,
        submittedAt: evidenceData.submittedAt,
        description: description.trim(),
        fileCount,
      },
    });
  } catch (error: any) {
    console.error('❌ Failed to submit evidence:', error);
    res.status(500).json({
      error: 'Failed to submit evidence',
      message: error.message,
    });
  }
});

export default router;

// DEBUG: Allow authenticated users to manually trigger a test notification
router.post('/debug/trigger-notif', PrivyAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { targetUserId, title, body } = req.body;
    if (!targetUserId) return res.status(400).json({ error: 'targetUserId required' });

    await notificationService.send({
      userId: String(targetUserId),
      challengeId: null as any,
      event: NotificationEvent.CHALLENGE_CREATED,
      title: title || 'Debug Notification',
      body: body || 'This is a server-triggered debug notification',
      channels: [NotificationChannel.IN_APP],
      priority: NotificationPriority.MEDIUM,
      data: { debug: true },
    });

    res.json({ success: true, message: 'Notification triggered' });
  } catch (err: any) {
    console.error('Failed to trigger debug notification:', err);
    res.status(500).json({ error: err.message || 'Failed to trigger notification' });
  }
});
