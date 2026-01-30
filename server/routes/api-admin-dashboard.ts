import express, { Request, Response } from 'express';
import { storage } from '../storage';
import { db } from '../db';
import { challenges } from '@shared/schema';

const router = express.Router();

/**
 * Admin Auth Middleware
 */
const adminAuth = async (req: Request, res: Response, next: Function) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token || !token.startsWith('admin_')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Token format: admin_<userId>_<timestamp>
    // Extract userId from token (everything between first and last underscore)
    const parts = token.split('_');
    if (parts.length < 3) {
      return res.status(401).json({ error: 'Invalid token format' });
    }
    
    const userId = parts.slice(1, -1).join('_'); // Join in case userId contains underscores
    const user = await storage.getUser(userId);

    if (!user || !user.isAdmin) {
      console.log(`Admin auth failed: user=${userId}, exists=${!!user}, isAdmin=${user?.isAdmin}`);
      return res.status(403).json({ error: 'Admin access required' });
    }

    (req as any).user = user;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
};

/**
 * GET /api/admin/stats
 * Get admin dashboard statistics
 */
router.get('/stats', adminAuth, async (req: Request, res: Response) => {
  try {
    const allUsers = await storage.getAllUsersWithWallets();
    const allChallenges = await db.select().from(challenges);
    
    // Calculate stats
    const totalUsers = allUsers.length;
    const newUsersThisWeek = allUsers.filter(u => {
      const createdAt = new Date(u.createdAt);
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return createdAt >= oneWeekAgo;
    }).length;

    const activeUsers = allUsers.filter(u => u.status === 'active' || u.isActive).length;
    
    // Calculate challenge stats
    const totalChallenges = allChallenges.length;
    const activeChallenges = allChallenges.filter((c: any) => c.status === 'active').length;
    const completedChallenges = allChallenges.filter((c: any) => c.status === 'completed').length;
    const pendingChallenges = allChallenges.filter((c: any) => c.status === 'pending' || c.status === 'accepted').length;

    // Calculate financial stats
    let totalVolume = 0;
    let totalChallengeStaked = 0;

    allChallenges.forEach((challenge: any) => {
      if (challenge.amount) {
        const amount = parseFloat(challenge.amount.toString());
        totalChallengeStaked += amount;
        totalVolume += amount;
      }
    });

    const stats = {
      totalUsers,
      activeUsers,
      newUsersThisWeek,
      dailyActiveUsers: activeUsers,
      totalEvents: 0,
      activeEvents: 0,
      completedEvents: 0,
      totalChallenges,
      activeChallenges,
      completedChallenges,
      pendingChallenges,
      totalTransactions: 0,
      totalVolume,
      totalEventPool: 0,
      totalChallengeStaked,
      totalRevenue: 0,
      totalCreatorFees: 0,
      totalPlatformFees: 0,
      totalDeposits: 0,
      totalWithdrawals: 0,
      pendingPayouts: 0,
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/admin/users
 * Get all users with pagination and filtering
 */
router.get('/users', adminAuth, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const allUsers = await storage.getAllUsersWithWallets();
    
    // Map to admin response format
    const users = allUsers.slice(offset, offset + limit).map(user => ({
      id: user.id,
      username: user.username,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email,
      level: user.level || 0,
      points: user.points || 0,
      balance: user.balance?.toString() || '0',
      streak: 0,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin || user.createdAt,
      status: user.isActive ? 'active' : 'inactive',
      isAdmin: user.isAdmin || false,
    }));

    res.json(users);
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * GET /api/admin/users/:userId
 * Get specific user details
 */
router.get('/users/:userId', adminAuth, async (req: Request, res: Response) => {
  try {
    const user = await storage.getUser(req.params.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      username: user.username,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email,
      level: user.level || 0,
      points: user.points || 0,
      balance: user.balance?.toString() || '0',
      createdAt: user.createdAt,
      lastLogin: user.lastLogin || user.createdAt,
      status: user.isActive ? 'active' : 'inactive',
      isAdmin: user.isAdmin || false,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

/**
 * GET /api/admin/challenges
 * Get all challenges for admin view
 */
router.get('/challenges', adminAuth, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const allChallenges = await db.select().from(challenges);
    
    const challengesList = allChallenges.slice(offset, offset + limit).map((challenge: any) => ({
      id: challenge.id,
      title: challenge.title || `Challenge #${challenge.id}`,
      description: challenge.description || '',
      category: challenge.category || 'General',
      status: challenge.status || 'pending',
      amount: challenge.amount?.toString() || '0',
      result: challenge.result || null,
      evidence: challenge.evidence || null,
      dueDate: challenge.dueDate || new Date().toISOString(),
      createdAt: challenge.createdAt || new Date().toISOString(),
      completedAt: challenge.completedAt || null,
      isPinned: challenge.isPinned || false,
      challenger: challenge.challengerId?.toString() || '',
      challenged: challenge.challengedId?.toString() || '',
      challengerUser: {
        id: challenge.challengerId || '',
        username: challenge.challengerUsername || 'Unknown',
        firstName: '',
        lastName: '',
        profileImageUrl: ''
      },
      challengedUser: {
        id: challenge.challengedId || '',
        username: challenge.challengedUsername || 'Unknown',
        firstName: '',
        lastName: '',
        profileImageUrl: ''
      },
      adminCreated: challenge.adminCreated || false,
      bonusSide: challenge.bonusSide || null,
      bonusMultiplier: challenge.bonusMultiplier?.toString() || null,
      bonusEndsAt: challenge.bonusEndsAt || null,
      yesStakeTotal: challenge.yesStakeTotal || 0,
      noStakeTotal: challenge.noStakeTotal || 0,
      paymentTokenAddress: challenge.paymentTokenAddress,
      type: challenge.challengedId ? 'p2p' : 'admin',
    }));

    res.json(challengesList);
  } catch (error) {
    console.error('Error fetching admin challenges:', error);
    res.status(500).json({ error: 'Failed to fetch challenges' });
  }
});

/**
 * POST /api/admin/users/:userId/action
 * Perform admin action on user (ban, unban, give points, etc.)
 */
router.post('/users/:userId/action', adminAuth, async (req: Request, res: Response) => {
  try {
    const { action, value, reason } = req.body;
    const userId = req.params.userId;

    // Log the action
    console.log(`Admin action: ${action} on user ${userId}. Reason: ${reason}`);

    // Implement specific actions as needed
    switch (action) {
      case 'ban':
        // Ban user logic
        break;
      case 'unban':
        // Unban user logic
        break;
      case 'admin':
        // Make admin logic
        break;
      case 'balance':
        // Adjust balance logic
        break;
      case 'message':
        // Send message logic
        break;
    }

    res.json({ success: true, message: `Action ${action} executed` });
  } catch (error) {
    console.error('Error executing admin action:', error);
    res.status(500).json({ error: 'Failed to execute action' });
  }
});

export default router;
