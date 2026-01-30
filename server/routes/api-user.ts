/**
 * User Account Routes
 * Handles FCM token storage and user settings
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { users, transactions, dailyLogins } from '../../shared/schema';
import { eq, desc } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/auth';

const router = Router();

/**
 * POST /api/user/fcm-token
 * Save FCM token for current user (for push notifications)
 */
router.post('/fcm-token', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Invalid FCM token' });
    }

    // Update user's FCM token
    const updated = await db
      .update(users)
      .set({
        fcmToken: token,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    console.log(`✅ FCM token saved for user ${userId}`);

    res.json({
      success: true,
      message: 'FCM token saved',
      user: {
        id: updated[0].id,
        fcmTokenSet: !!updated[0].fcmToken,
      },
    });
  } catch (error) {
    console.error('Error saving FCM token:', error);
    res.status(500).json({ error: 'Failed to save FCM token' });
  }
});

/**
 * GET /api/user/profile
 * Get current user profile
 */
router.get('/profile', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userRecord = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userRecord || userRecord.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userRecord[0];

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        profileImageUrl: user.profileImageUrl,
        level: user.level,
        xp: user.xp,
        points: user.points,
        balance: user.balance,
        followerCount: user.followerCount || 0,
        followingCount: user.followingCount || 0,
        fcmTokenSet: !!user.fcmToken,
        isTelegramUser: user.isTelegramUser,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * GET /api/transactions
 * Get current user's transaction history (deposits, withdrawals, challenge earnings, etc.)
 */
router.get('/transactions', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { limit = 50, offset = 0 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const limitNum = Math.min(parseInt(limit as string) || 50, 200);
    const offsetNum = parseInt(offset as string) || 0;

    // Fetch user's transactions ordered by most recent
    const userTransactions = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt))
      .limit(limitNum)
      .offset(offsetNum);

    // Get total count for pagination
    const totalResult = await db
      .select({ count: () => null })
      .from(transactions)
      .where(eq(transactions.userId, userId));

    const total = totalResult.length || 0;

    // Format response
    const formattedTransactions = userTransactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      description: tx.description,
      status: tx.status,
      createdAt: tx.createdAt,
      relatedId: tx.relatedId,
    }));

    res.json({
      transactions: formattedTransactions,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total,
      },
    });
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      error: 'Failed to fetch transactions',
      message: error.message,
    });
  }
});

/**
 * PATCH /api/user/profile
 * Update current user profile
 */
router.patch('/profile', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { firstName, lastName, username, profileImageUrl } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Update user record
    const updated = await db
      .update(users)
      .set({
        firstName: firstName !== undefined ? firstName : undefined,
        lastName: lastName !== undefined ? lastName : undefined,
        username: username !== undefined ? username : undefined,
        profileImageUrl: profileImageUrl !== undefined ? profileImageUrl : undefined,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updated.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`✅ Profile updated for user ${userId}`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updated[0],
    });
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ 
      error: 'Failed to update profile',
      message: error.message 
    });
  }
});

/**
 * GET /api/user/stats
 * Get user statistics (wins, friends, challenges created, etc.)
 */
router.get('/stats', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get user profile for points and streak
    const userRecord = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userRecord || userRecord.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userRecord[0];

    // Return user stats
    res.json({
      wins: user.wins || 0,
      friendsCount: user.friendsCount || 0,
      eventWins: user.eventWins || 0,
      challengesCreated: user.challengesCreated || 0,
      streak: user.streak || 0,
      points: user.points || 0,
      coins: user.coins || 0,
    });
  } catch (error: any) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      error: 'Failed to fetch stats',
      message: error.message,
    });
  }
});

/**
 * GET /api/user/achievements
 * Get user achievements/badges
 */
router.get('/achievements', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get user profile
    const userRecord = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userRecord || userRecord.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userRecord[0];

    // Define achievements based on user stats
    const achievements = [
      {
        id: 'first_challenge',
        name: 'First Win',
        description: 'Win your first challenge',
        unlocked: (user.wins || 0) >= 1,
        unlockedAt: user.createdAt,
        pointsReward: 100,
      },
      {
        id: 'streak_master',
        name: 'Streak Master',
        description: 'Login 7 days in a row',
        unlocked: (user.streak || 0) >= 7,
        pointsReward: 250,
      },
      {
        id: 'social_butterfly',
        name: 'Social Butterfly',
        description: 'Make 10 friends',
        unlocked: (user.friendsCount || 0) >= 10,
        pointsReward: 500,
      },
      {
        id: 'big_better',
        name: 'Big Better',
        description: 'Win 5 events',
        unlocked: (user.eventWins || 0) >= 5,
        pointsReward: 300,
      },
      {
        id: 'challenger',
        name: 'Challenger',
        description: 'Create 20 challenges',
        unlocked: (user.challengesCreated || 0) >= 20,
        pointsReward: 350,
      },
    ];

    res.json(achievements);
  } catch (error: any) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({
      error: 'Failed to fetch achievements',
      message: error.message,
    });
  }
});

/**
 * GET /api/daily-signin/history
 * Get user's daily login history
 */
router.get('/daily-signin/history', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { limit = 30 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const limitNum = Math.min(parseInt(limit as string) || 30, 365);

    // Fetch daily logins
    const logins = await db
      .select()
      .from(dailyLogins)
      .where(eq(dailyLogins.userId, userId))
      .orderBy(desc(dailyLogins.createdAt))
      .limit(limitNum);

    // Format response
    const formattedLogins = logins.map((login) => ({
      id: login.id,
      streak: login.streak || 0,
      pointsEarned: login.pointsEarned || 0,
      claimed: login.claimed || false,
      createdAt: login.createdAt,
    }));

    res.json(formattedLogins);
  } catch (error: any) {
    console.error('Error fetching daily signin history:', error);
    res.status(500).json({
      error: 'Failed to fetch daily signin history',
      message: error.message,
    });
  }
});

export default router;
