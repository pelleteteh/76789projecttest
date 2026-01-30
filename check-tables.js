const { Client } = require('pg');

const client = new Client(process.env.DATABASE_URL);

async function checkTables() {
  try {
    await client.connect();
    
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\n✅ EXISTING TABLES IN DATABASE:\n');
    const tables = res.rows.map(r => r.table_name);
    
    // Group tables by category
    const categories = {
      'Users & Auth': ['users', 'sessions', 'user_achievements', 'achievements'],
      'Friends System': ['friends'],
      'Notifications': ['notifications', 'user_notification_preferences'],
      'Wallets': ['wallets', 'user_wallet_addresses', 'wallet_transactions', 'admin_wallet_transactions', 'treasury_wallets', 'treasury_wallet_transactions'],
      'Challenges': ['challenges', 'challenge_comments', 'challenge_payments'],
      'Transactions': ['transactions'],
      'Events': ['events', 'event_comments'],
      'Payouts': ['payouts'],
      'Leaderboard': ['leaderboard_cache']
    };
    
    for (const [category, tableList] of Object.entries(categories)) {
      const found = tableList.filter(t => tables.includes(t));
      if (found.length > 0) {
        console.log(`📦 ${category}:`);
        found.forEach(t => console.log(`   ✅ ${t}`));
        console.log();
      }
    }
    
    console.log('Total tables:', tables.length);
    console.log('\nAll tables:', tables.join(', '));
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

checkTables();
