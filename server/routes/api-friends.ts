/**
 * Friends Management API Routes
 * Handles friend requests, friend list, and friend relationships
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { friends, users } from '../../shared/schema';
import { eq, and, or } from 'drizzle-orm';
import { SupabaseAuthMiddleware } from '../supabaseAuth';
import { NotificationService, NotificationEvent, NotificationChannel, NotificationPriority } from '../notificationService';

const router = Router();
const notificationService = new NotificationService();

/**
 * POST /api/friends/request
 * Send friend request to another user
 */
router.post('/request', SupabaseAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { targetUserId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!targetUserId || targetUserId === userId) {
      return res.status(400).json({ error: 'Invalid target user' });
    }

    // Check if target user exists
    const targetUser = await db
      .select()
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    if (!targetUser || targetUser.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already friends
    const existingFriendship = await db
      .select()
      .from(friends)
      .where(
        or(
          and(
            eq(friends.requesterId, userId),
            eq(friends.addresseeId, targetUserId)
          ),
          and(
            eq(friends.requesterId, targetUserId),
            eq(friends.addresseeId, userId)
          )
        )
      )
      .limit(1);

    if (existingFriendship && existingFriendship.length > 0) {
      const status = existingFriendship[0].status;
      if (status === 'accepted') {
        return res.status(400).json({ error: 'Already friends' });
      } else if (status === 'pending') {
        return res.status(400).json({ error: 'Friend request already sent' });
      }
    }

    // Create friend request
    const friendRequest = await db
      .insert(friends)
      .values({
        requesterId: userId,
        addresseeId: targetUserId,
        status: 'pending',
        createdAt: new Date(),
      })
      .returning();

    console.log(`✅ Friend request sent: ${userId} → ${targetUserId}`);

    // Get requester name for notification
    const requester = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const requesterName = requester[0]?.firstName || 'Someone';

    // Send notification to target user
    await notificationService.send({
      userId: targetUserId,
      challengeId: friendRequest[0].id.toString(),
      event: NotificationEvent.FRIEND_REQUEST,
      title: `👥 ${requesterName} wants to be your friend!`,
      body: `${requesterName} sent you a friend request`,
      channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
      priority: NotificationPriority.MEDIUM,
      data: {
        requesterId: userId,
        requesterName,
        action: 'friend_request',
      },
    }).catch(err => console.warn('Failed to send friend request notification:', err.message));

    res.json({
      success: true,
      friendRequest: {
        id: friendRequest[0].id,
        status: friendRequest[0].status,
        createdAt: friendRequest[0].createdAt,
      },
    });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

/**
 * POST /api/friends/accept/:requestId
 * Accept a friend request
 */
router.post('/accept/:requestId', SupabaseAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const friendRequest = await db
      .select()
      .from(friends)
      .where(eq(friends.id, parseInt(requestId)))
      .limit(1);

    if (!friendRequest || friendRequest.length === 0) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    const request = friendRequest[0];

    // Only addressee can accept
    if (request.addresseeId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: `Request already ${request.status}` });
    }

    // Update friend request status
    const updated = await db
      .update(friends)
      .set({
        status: 'accepted',
        acceptedAt: new Date(),
      })
      .where(eq(friends.id, parseInt(requestId)))
      .returning();

    console.log(`✅ Friend request accepted: ${request.requesterId} ← ${userId}`);

    // Get acceptor name for notification
    const acceptor = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const acceptorName = acceptor[0]?.firstName || 'Someone';

    // Send notification to requester
    await notificationService.send({
      userId: request.requesterId,
      challengeId: updated[0].id.toString(),
      event: NotificationEvent.FRIEND_ACCEPTED,
      title: `✅ ${acceptorName} accepted your friend request!`,
      body: `${acceptorName} is now your friend`,
      channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
      priority: NotificationPriority.MEDIUM,
      data: {
        acceptorId: userId,
        acceptorName,
        action: 'friend_accepted',
      },
    }).catch(err => console.warn('Failed to send acceptance notification:', err.message));

    res.json({
      success: true,
      message: 'Friend request accepted',
      friendship: {
        id: updated[0].id,
        status: updated[0].status,
        acceptedAt: updated[0].acceptedAt,
      },
    });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

/**
 * POST /api/friends/reject/:requestId
 * Reject a friend request
 */
router.post('/reject/:requestId', SupabaseAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const friendRequest = await db
      .select()
      .from(friends)
      .where(eq(friends.id, parseInt(requestId)))
      .limit(1);

    if (!friendRequest || friendRequest.length === 0) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    const request = friendRequest[0];

    // Only addressee can reject
    if (request.addresseeId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: `Request already ${request.status}` });
    }

    // Delete the friend request
    await db.delete(friends).where(eq(friends.id, parseInt(requestId)));

    console.log(`✅ Friend request rejected: ${request.requesterId}`);

    res.json({
      success: true,
      message: 'Friend request rejected',
    });
  } catch (error) {
    console.error('Error rejecting friend request:', error);
    res.status(500).json({ error: 'Failed to reject friend request' });
  }
});

/**
 * GET /api/friends
 * Get all friends for current user
 */
router.get('/', SupabaseAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get all accepted friend relationships (both directions)
    const friendships = await db
      .select()
      .from(friends)
      .where(
        and(
          or(
            eq(friends.requesterId, userId),
            eq(friends.addresseeId, userId)
          ),
          eq(friends.status, 'accepted')
        )
      );

    // Extract friend IDs
    const friendIds = friendships.map(f =>
      f.requesterId === userId ? f.addresseeId : f.requesterId
    );

    if (friendIds.length === 0) {
      return res.json({
        success: true,
        friends: [],
        count: 0,
      });
    }

    // Get friend details
    const friendDetails = await db
      .select()
      .from(users)
      .where(or(...friendIds.map(id => eq(users.id, id))));

    const friendList = friendDetails.map(friend => ({
      id: friend.id,
      firstName: friend.firstName,
      lastName: friend.lastName,
      username: friend.username,
      profileImageUrl: friend.profileImageUrl,
      level: friend.level,
      points: friend.points,
    }));

    res.json({
      success: true,
      friends: friendList,
      count: friendList.length,
    });
  } catch (error) {
    console.error('Error getting friends:', error);
    res.status(500).json({ error: 'Failed to get friends list' });
  }
});

/**
 * GET /api/friends/requests
 * Get pending friend requests for current user
 */
router.get('/requests', SupabaseAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get pending requests where user is the addressee
    const pendingRequests = await db
      .select()
      .from(friends)
      .where(
        and(
          eq(friends.addresseeId, userId),
          eq(friends.status, 'pending')
        )
      );

    if (pendingRequests.length === 0) {
      return res.json({
        success: true,
        requests: [],
        count: 0,
      });
    }

    // Get requester details
    const requesterIds = pendingRequests.map(r => r.requesterId);
    const requesters = await db
      .select()
      .from(users)
      .where(or(...requesterIds.map(id => eq(users.id, id))));

    const requestList = pendingRequests.map(request => {
      const requester = requesters.find(u => u.id === request.requesterId);
      return {
        id: request.id,
        requesterId: request.requesterId,
        requesterName: requester?.firstName || 'Unknown',
        requesterProfile: requester?.profileImageUrl,
        createdAt: request.createdAt,
      };
    });

    res.json({
      success: true,
      requests: requestList,
      count: requestList.length,
    });
  } catch (error) {
    console.error('Error getting friend requests:', error);
    res.status(500).json({ error: 'Failed to get friend requests' });
  }
});

/**
 * DELETE /api/friends/:friendId
 * Remove a friend
 */
router.delete('/:friendId', SupabaseAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { friendId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Find friendship
    const friendship = await db
      .select()
      .from(friends)
      .where(
        or(
          and(
            eq(friends.requesterId, userId),
            eq(friends.addresseeId, friendId)
          ),
          and(
            eq(friends.requesterId, friendId),
            eq(friends.addresseeId, userId)
          )
        )
      )
      .limit(1);

    if (!friendship || friendship.length === 0) {
      return res.status(404).json({ error: 'Friend relationship not found' });
    }

    // Delete friendship
    await db.delete(friends).where(eq(friends.id, friendship[0].id));

    console.log(`✅ Friend removed: ${userId} removed ${friendId}`);

    res.json({
      success: true,
      message: 'Friend removed',
    });
  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

/**
 * GET /api/friends/status/:userId
 * Check friendship status with another user
 */
router.get('/status/:userId', SupabaseAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const targetUserId = req.params.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const friendship = await db
      .select()
      .from(friends)
      .where(
        or(
          and(
            eq(friends.requesterId, userId),
            eq(friends.addresseeId, targetUserId)
          ),
          and(
            eq(friends.requesterId, targetUserId),
            eq(friends.addresseeId, userId)
          )
        )
      )
      .limit(1);

    if (!friendship || friendship.length === 0) {
      return res.json({
        isFriend: false,
        status: null,
      });
    }

    res.json({
      isFriend: friendship[0].status === 'accepted',
      status: friendship[0].status,
      relationship: {
        isRequester: friendship[0].requesterId === userId,
        createdAt: friendship[0].createdAt,
        acceptedAt: friendship[0].acceptedAt,
      },
    });
  } catch (error) {
    console.error('Error checking friendship status:', error);
    res.status(500).json({ error: 'Failed to check friendship status' });
  }
});

/**
 * GET /api/friends/sent-requests
 * Get pending friend requests sent by current user
 */
router.get('/sent-requests', SupabaseAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get pending requests where user is the requester
    const sentRequests = await db
      .select()
      .from(friends)
      .where(
        and(
          eq(friends.requesterId, userId),
          eq(friends.status, 'pending')
        )
      );

    if (sentRequests.length === 0) {
      return res.json({
        success: true,
        requests: [],
        count: 0,
      });
    }

    // Get addressee details
    const addresseeIds = sentRequests.map(r => r.addresseeId);
    const addressees = await db
      .select()
      .from(users)
      .where(or(...addresseeIds.map(id => eq(users.id, id))));

    const requestList = sentRequests.map(request => {
      const addressee = addressees.find(u => u.id === request.addresseeId);
      return {
        id: request.id,
        addresseeId: request.addresseeId,
        addresseeName: addressee?.firstName || 'Unknown',
        addresseeUsername: addressee?.username,
        addresseeProfile: addressee?.profileImageUrl,
        createdAt: request.createdAt,
      };
    });

    res.json({
      success: true,
      requests: requestList,
      count: requestList.length,
    });
  } catch (error) {
    console.error('Error getting sent friend requests:', error);
    res.status(500).json({ error: 'Failed to get sent friend requests' });
  }
});

router.get('/status/:userId', SupabaseAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId: targetUserId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (userId === targetUserId) {
      return res.json({
        success: true,
        status: 'self',
      });
    }

    const friendship = await db
      .select()
      .from(friends)
      .where(
        or(
          and(
            eq(friends.requesterId, userId),
            eq(friends.addresseeId, targetUserId)
          ),
          and(
            eq(friends.requesterId, targetUserId),
            eq(friends.addresseeId, userId)
          )
        )
      )
      .limit(1);

    if (!friendship || friendship.length === 0) {
      return res.json({
        success: true,
        status: 'none',
      });
    }

    res.json({
      success: true,
      status: friendship[0].status,
      relationship: {
        isRequester: friendship[0].requesterId === userId,
        createdAt: friendship[0].createdAt,
        acceptedAt: friendship[0].acceptedAt,
      },
    });
  } catch (error) {
    console.error('Error checking friendship status:', error);
    res.status(500).json({ error: 'Failed to check friendship status' });
  }
});

export default router;
