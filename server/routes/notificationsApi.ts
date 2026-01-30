/**
 * 🔔 Notification API Endpoints
 * 
 * Routes for:
 * - Getting notifications
 * - Marking notifications as read
 * - Managing notification preferences
 * - Clearing notifications
 */

import { Router, Request, Response } from 'express';
import { NotificationService } from '../notificationService';
import { db } from '../db';
import { notifications, userNotificationPreferences } from '../../shared/schema';
import { eq, and, desc, count } from 'drizzle-orm';
import { SupabaseAuthMiddleware } from '../supabaseAuth';

const router = Router();
const notificationService = new NotificationService();

/**
 * GET /api/notifications
 * Get unread notifications for current user
 * 
 * Query params:
 * - limit: number (default: 20)
 * - offset: number (default: 0)
 */
router.get('/', SupabaseAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    console.log('\n📬 GET /api/notifications called');
    console.log(`   req.user:`, req.user ? `✅ Present (id: ${req.user.id})` : '❌ Missing');
    console.log(`   userId extracted:`, userId || 'undefined');
    
    if (!userId) {
      console.error('   ❌ No userId, returning 401');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log(`   ✅ UserId found, fetching notifications...`);
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const userNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    // Count total notifications
    const allNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId));

    res.json({
      data: userNotifications,
      total: allNotifications.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications
 */
router.get('/unread-count', SupabaseAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const unreadNotifications = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));

    res.json({ unreadCount: unreadNotifications.length });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark notification as read
 */
router.put('/:id/read', SupabaseAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify ownership
    const notification = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
      .limit(1);

    if (!notification[0]) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await notificationService.markAsRead(notificationId);

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// Support PATCH method for clients that use PATCH instead of PUT
router.patch('/:id/read', SupabaseAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify ownership
    const notification = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
      .limit(1);

    if (!notification[0]) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await notificationService.markAsRead(notificationId);

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read (PATCH):', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
router.put('/read-all', SupabaseAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete('/:id', SupabaseAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify ownership
    const notification = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
      .limit(1);

    if (!notification[0]) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await db.delete(notifications).where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));

    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

/**
 * DELETE /api/notifications/clear-all
 * Delete all notifications for user
 */
router.delete('/clear-all', SupabaseAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Delete all notifications for this user
    await db.delete(notifications).where(eq(notifications.userId, userId));

    res.json({ success: true, message: 'All notifications cleared' });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

/**
 * GET /api/notifications/preferences
 * Get user notification preferences
 */
router.get('/preferences', SupabaseAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const prefs = await db
      .select()
      .from(userNotificationPreferences)
      .where(eq(userNotificationPreferences.userId, userId))
      .limit(1);

    if (!prefs[0]) {
      // Return default preferences
      return res.json({
        enablePush: true,
        enableTelegram: false,
        enableInApp: true,
        notificationFrequency: 'immediate',
        mutedChallenges: [],
        mutedUsers: [],
      });
    }

    res.json({
      enablePush: prefs[0].enablePush,
      enableTelegram: prefs[0].enableTelegram,
      enableInApp: prefs[0].enableInApp,
      notificationFrequency: prefs[0].notificationFrequency,
      mutedChallenges: prefs[0].mutedChallenges || [],
      mutedUsers: prefs[0].mutedUsers || [],
    });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

/**
 * PUT /api/notifications/preferences
 * Update user notification preferences
 */
router.put('/preferences', SupabaseAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      enablePush,
      enableTelegram,
      enableInApp,
      notificationFrequency,
      mutedChallenges,
      mutedUsers,
    } = req.body;

    // Update or insert preferences
    const existing = await db
      .select()
      .from(userNotificationPreferences)
      .where(eq(userNotificationPreferences.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(userNotificationPreferences)
        .set({
          enablePush: enablePush !== undefined ? enablePush : true,
          enableTelegram: enableTelegram !== undefined ? enableTelegram : false,
          enableInApp: enableInApp !== undefined ? enableInApp : true,
          notificationFrequency: notificationFrequency || 'immediate',
          mutedChallenges: mutedChallenges || [],
          mutedUsers: mutedUsers || [],
        })
        .where(eq(userNotificationPreferences.userId, userId));
    } else {
      await db.insert(userNotificationPreferences).values({
        userId,
        enablePush: enablePush !== undefined ? enablePush : true,
        enableTelegram: enableTelegram !== undefined ? enableTelegram : false,
        enableInApp: enableInApp !== undefined ? enableInApp : true,
        notificationFrequency: notificationFrequency || 'immediate',
        mutedChallenges: mutedChallenges || [],
        mutedUsers: mutedUsers || [],
      });
    }

    res.json({ success: true, message: 'Preferences updated' });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

/**
 * POST /api/notifications/mute-challenge/:challengeId
 * Mute notifications for a challenge
 */
router.post('/mute-challenge/:challengeId', SupabaseAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const challengeId = req.params.challengeId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const prefs = await db
      .select()
      .from(userNotificationPreferences)
      .where(eq(userNotificationPreferences.userId, userId))
      .limit(1);

    const mutedChallenges = prefs[0]?.mutedChallenges || [];
    if (!mutedChallenges.includes(challengeId)) {
      mutedChallenges.push(challengeId);
    }

    if (prefs.length > 0) {
      await db
        .update(userNotificationPreferences)
        .set({ mutedChallenges })
        .where(eq(userNotificationPreferences.userId, userId));
    } else {
      await db.insert(userNotificationPreferences).values({
        userId,
        mutedChallenges,
      });
    }

    res.json({ success: true, message: 'Challenge muted' });
  } catch (error) {
    console.error('Error muting challenge:', error);
    res.status(500).json({ error: 'Failed to mute challenge' });
  }
});

/**
 * POST /api/notifications/unmute-challenge/:challengeId
 * Unmute notifications for a challenge
 */
router.post('/unmute-challenge/:challengeId', SupabaseAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const challengeId = req.params.challengeId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const prefs = await db
      .select()
      .from(userNotificationPreferences)
      .where(eq(userNotificationPreferences.userId, userId))
      .limit(1);

    const mutedChallenges = (prefs[0]?.mutedChallenges || []).filter((id) => id !== challengeId);

    if (prefs.length > 0) {
      await db
        .update(userNotificationPreferences)
        .set({ mutedChallenges })
        .where(eq(userNotificationPreferences.userId, userId));
    } else {
      await db.insert(userNotificationPreferences).values({
        userId,
        mutedChallenges,
      });
    }

    res.json({ success: true, message: 'Challenge unmuted' });
  } catch (error) {
    console.error('Error unmuting challenge:', error);
    res.status(500).json({ error: 'Failed to unmute challenge' });
  }
});

export default router;
