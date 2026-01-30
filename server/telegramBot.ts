import fetch from 'node-fetch';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;
const TELEGRAM_GROUP_ID = process.env.TELEGRAM_GROUP_ID;

interface ChallengeMessage {
  id: number;
  title: string;
  description?: string;
  amount: number;
  category: string;
  creator: {
    username: string;
    firstName?: string;
  };
  challengeType: 'open' | 'direct' | 'admin';
  status: string;
  expirationHours?: number;
  isAdminChallenge?: boolean;
}

class TelegramBot {
  private token: string;
  private channelId: string;
  private groupId: string;

  constructor() {
    this.token = TELEGRAM_BOT_TOKEN || '';
    this.channelId = TELEGRAM_CHANNEL_ID || '';
    this.groupId = TELEGRAM_GROUP_ID || '';
  }

  isConfigured(): boolean {
    return !!(this.token && (this.channelId || this.groupId));
  }

  /**
   * Format challenge message for Telegram
   * No tags for admin challenges, but tags for P2P challenges
   */
  private formatChallengeMessage(challenge: ChallengeMessage): string {
    const appUrl = process.env.APP_URL || `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
    const challengeLink = `${appUrl}/challenges/${challenge.id}/activity`;
    const joinLink = challenge.challengeType === 'open' ? `${appUrl}/challenges` : challengeLink;

    const baseInfo = `
🎯 <b>New Challenge: ${challenge.title}</b>

💰 <b>Amount:</b> $${challenge.amount.toFixed(2)}
🏷️ <b>Category:</b> ${challenge.category || 'General'}
📝 <b>Type:</b> ${challenge.challengeType === 'admin' ? 'Betting Pool' : challenge.challengeType === 'direct' ? 'Direct Challenge' : 'Open Challenge'}
⏱️ <b>Expires in:</b> ${challenge.expirationHours || 24} hours
${challenge.description ? `\n📄 <b>Details:</b> ${challenge.description}` : ''}

🔗 <a href="${joinLink}">Click here to JOIN this challenge!</a>
`;

    // Only add tags for P2P challenges, NOT for admin challenges
    if (!challenge.isAdminChallenge && challenge.creator.username) {
      return `${baseInfo}\n👤 <b>Created by:</b> @${challenge.creator.username}`;
    }

    return baseInfo;
  }

  /**
   * Broadcast challenge to Telegram channel and group
   */
  async broadcastChallenge(challenge: ChallengeMessage): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn('⚠️ Telegram bot not configured - skipping broadcast');
      return false;
    }

    try {
      const message = this.formatChallengeMessage(challenge);
      console.log(`📨 Broadcasting challenge to Telegram: "${challenge.title}"`);
      
      // Send to channel if configured
      if (this.channelId) {
        try {
          await this.sendMessage(this.channelId, message);
          console.log(`✅ Broadcast sent to channel: ${this.channelId}`);
        } catch (channelError) {
          console.error(`❌ Failed to broadcast to channel ${this.channelId}:`, channelError);
        }
      }

      // Send to group if configured and not already sent to same ID
      if (this.groupId && this.groupId !== this.channelId) {
        try {
          await this.sendMessage(this.groupId, message);
          console.log(`✅ Broadcast sent to group: ${this.groupId}`);
        } catch (groupError) {
          console.error(`❌ Failed to broadcast to group ${this.groupId}:`, groupError);
        }
      }

      console.log(`✅ Challenge broadcast to Telegram: ${challenge.title}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to broadcast challenge to Telegram:', error);
      return false;
    }
  }

  /**
   * Send a message to a Telegram chat
   */
  private async sendMessage(chatId: string, message: string): Promise<void> {
    try {
      console.log(`📤 Sending message to Telegram chat: ${chatId}`);
      const response = await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
          disable_web_page_preview: false,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error(`❌ Telegram API error for chat ${chatId}:`, error);
        throw new Error(`Telegram API error: ${JSON.stringify(error)}`);
      }

      const result = await response.json();
      console.log(`✅ Message sent successfully to ${chatId}: message_id=${result.result.message_id}`);
    } catch (error) {
      console.error(`❌ Error sending message to Telegram chat ${chatId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const telegramBot = new TelegramBot();

export default telegramBot;
