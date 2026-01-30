/**
 * Challenge Expiry Reminders Job
 * Sends notifications to users about challenges expiring soon
 * Run periodically (e.g., every 30 minutes)
 */

import { db } from '../db';
import { challenges, users } from '../../shared/schema';
import { lt, and, eq, isNull } from 'drizzle-orm';
import { NotificationService, NotificationEvent, NotificationChannel, NotificationPriority } from '../notificationService';

const notificationService = new NotificationService();

export async function sendChallengeExpiryReminders() {
  try {
    console.log(`\n⏰ Running challenge expiry reminder job...`);

    // Find challenges expiring in the next 1 hour that are still active
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    const expiringChallenges = await db
      .select()
      .from(challenges)
      .where(
        and(
          eq(challenges.status, 'active'),
          lt(challenges.dueDate, oneHourFromNow),
          isNull(challenges.completedAt) // Not yet completed
        )
      );

    if (expiringChallenges.length === 0) {
      console.log(`✅ No challenges expiring soon`);
      return;
    }

    console.log(`⏰ Found ${expiringChallenges.length} challenges expiring soon`);

    // Send reminders to both participants
    for (const challenge of expiringChallenges) {
      if (!challenge.dueDate) continue;

      const minutesUntilExpiry = Math.floor((challenge.dueDate.getTime() - now.getTime()) / (60 * 1000));

      if (minutesUntilExpiry <= 0) {
        console.log(`⏳ Challenge #${challenge.id} has already expired`);
        continue;
      }

      const timeMessage = minutesUntilExpiry < 60 
        ? `${minutesUntilExpiry} minutes`
        : `${Math.floor(minutesUntilExpiry / 60)} hour${Math.floor(minutesUntilExpiry / 60) > 1 ? 's' : ''}`;

      // Notify challenger
      if (challenge.challenger) {
        try {
          await notificationService.send({
            userId: challenge.challenger,
            challengeId: challenge.id.toString(),
            event: NotificationEvent.CHALLENGE_REMINDER,
            title: `⏰ Challenge Expiring Soon!`,
            body: `Your challenge "${challenge.title}" expires in ${timeMessage}. Submit your result now!`,
            channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
            priority: NotificationPriority.HIGH,
            data: {
              challengeId: challenge.id,
              challengeTitle: challenge.title,
              minutesUntilExpiry,
            },
          }).catch(err => console.warn(`Failed to remind challenger:`, err));

          console.log(`⏰ Reminder sent to challenger for challenge #${challenge.id}`);
        } catch (err) {
          console.error(`Failed to send challenger reminder:`, err);
        }
      }

      // Notify challenged (if it's a direct P2P)
      if (challenge.challenged && challenge.challenged !== challenge.challenger) {
        try {
          await notificationService.send({
            userId: challenge.challenged,
            challengeId: challenge.id.toString(),
            event: NotificationEvent.CHALLENGE_REMINDER,
            title: `⏰ Challenge Expiring Soon!`,
            body: `The challenge "${challenge.title}" expires in ${timeMessage}. Submit your result now!`,
            channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
            priority: NotificationPriority.HIGH,
            data: {
              challengeId: challenge.id,
              challengeTitle: challenge.title,
              minutesUntilExpiry,
            },
          }).catch(err => console.warn(`Failed to remind challenged user:`, err));

          console.log(`⏰ Reminder sent to challenged user for challenge #${challenge.id}`);
        } catch (err) {
          console.error(`Failed to send challenged user reminder:`, err);
        }
      }
    }

    console.log(`✅ Challenge expiry reminder job completed`);
  } catch (error: any) {
    console.error(`❌ Challenge expiry reminder job failed:`, error.message);
  }
}

/**
 * Start the challenge expiry reminder job
 * Run every 30 minutes to check for expiring challenges
 */
export function startChallengeExpiryReminderJob() {
  // Initial run after 1 minute
  setTimeout(() => sendChallengeExpiryReminders(), 60 * 1000);

  // Then run every 30 minutes
  setInterval(() => sendChallengeExpiryReminders(), 30 * 60 * 1000);

  console.log(`✅ Challenge expiry reminder job scheduled (every 30 minutes)`);
}
