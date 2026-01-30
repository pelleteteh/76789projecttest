/**
 * Broadcast All Old Challenges to Telegram
 * ========================================
 * Script to post all existing challenges from the database to the Telegram group
 * Useful for historical data migration or populating Telegram with existing challenges
 */

import * as dotenv from 'dotenv';
import postgres from 'postgres';
import fetch from 'node-fetch';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_GROUP_ID = process.env.TELEGRAM_GROUP_ID;
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not configured in .env.local');
  process.exit(1);
}

if (!TELEGRAM_BOT_TOKEN || (!TELEGRAM_GROUP_ID && !TELEGRAM_CHANNEL_ID)) {
  console.error('❌ Telegram configuration missing (TELEGRAM_BOT_TOKEN, TELEGRAM_GROUP_ID/TELEGRAM_CHANNEL_ID)');
  process.exit(1);
}

/**
 * Format challenge for Telegram message
 */
function formatChallengeMessage(challenge: any): string {
  const baseInfo = `
🎯 <b>Challenge: ${challenge.title}</b>

💰 <b>Amount:</b> $${(challenge.amount || 0).toFixed(2)}
🏷️ <b>Category:</b> ${challenge.category || 'General'}
📝 <b>Type:</b> ${challenge.admin_created ? 'Betting Pool' : challenge.challenged ? 'Direct Challenge' : 'Open Challenge'}
⏱️ <b>Created:</b> ${new Date(challenge.created_at).toLocaleDateString()}
${challenge.description ? `\n📄 <b>Details:</b> ${challenge.description}` : ''}
`;

  // Only add creator tag for P2P challenges
  if (!challenge.admin_created && challenge.challenger_username) {
    return `${baseInfo}\n👤 <b>By:</b> @${challenge.challenger_username}`;
  }

  return baseInfo;
}

/**
 * Send message to Telegram chat
 */
async function sendToTelegram(chatId: string, message: string): Promise<boolean> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
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
      console.error(`  ❌ Telegram error for chat ${chatId}:`, error);
      return false;
    }

    const result = await response.json();
    return true;
  } catch (error) {
    console.error(`  ❌ Error sending to Telegram:`, error);
    return false;
  }
}

/**
 * Main broadcast function
 */
async function broadcastAllChallenges() {
  console.log('\n🚀 Starting broadcast of all challenges to Telegram...\n');

  // Connect to database
  let sql;
  try {
    sql = postgres(DATABASE_URL, { ssl: 'require' });
    console.log('✅ Connected to database');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
  }

  try {
    // Fetch all challenges with creator info
    const result = await sql`
      SELECT 
        c.id,
        c.title,
        c.description,
        c.amount,
        c.category,
        c.admin_created,
        c.challenger,
        c.challenged,
        c.created_at,
        u.username as challenger_username,
        u.first_name as challenger_first_name
      FROM challenges c
      LEFT JOIN users u ON c.challenger = u.id
      ORDER BY c.created_at DESC
    `;

    const challenges = result as any[];
    console.log(`📊 Found ${challenges.length} total challenges\n`);

    if (challenges.length === 0) {
      console.log('⚠️  No challenges to broadcast');
      await sql.end();
      return;
    }

    let successCount = 0;
    let failCount = 0;
    const chatIds = [TELEGRAM_GROUP_ID, TELEGRAM_CHANNEL_ID].filter(Boolean) as string[];

    console.log(`📤 Broadcasting to ${chatIds.length} Telegram chat(s):\n`);

    for (let i = 0; i < challenges.length; i++) {
      const challenge = challenges[i];
      const message = formatChallengeMessage(challenge);

      console.log(`[${i + 1}/${challenges.length}] 📢 "${challenge.title}"`);
      console.log(`    Type: ${challenge.admin_created ? 'Betting Pool' : challenge.challenged ? 'Direct' : 'Open'}`);
      console.log(`    Amount: $${(challenge.amount || 0).toFixed(2)}`);

      let sentToAny = false;
      for (const chatId of chatIds) {
        const success = await sendToTelegram(chatId, message);
        if (success) {
          sentToAny = true;
          console.log(`    ✅ Posted to Telegram`);
        }
      }

      if (sentToAny) {
        successCount++;
      } else {
        failCount++;
      }

      // Add small delay between requests to avoid rate limiting
      if (i < challenges.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`\n\n📊 Broadcast Summary:`);
    console.log(`✅ Successfully posted: ${successCount}/${challenges.length}`);
    console.log(`❌ Failed: ${failCount}/${challenges.length}`);
    console.log(`\n✨ All old challenges have been broadcast to Telegram!\n`);

  } catch (error) {
    console.error('❌ Error during broadcast:', error);
  } finally {
    if (sql) {
      await sql.end();
    }
  }
}

// Run the script
broadcastAllChallenges().catch(console.error);
