import { Client } from 'pg';
import process from 'process';

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
    
    // Show key tables for recent features
    const keyTables = {
      'Users & Auth': ['users', 'sessions', 'user_achievements', 'achievements'],
      'Friends System': ['friends'],
      'Notifications': ['notifications', 'user_notification_preferences'],
      'Wallets': ['wallets', 'user_wallet_addresses', 'wallet_transactions', 'admin_wallet_transactions'],
      'Challenges': ['challenges'],
    };
    
    for (const [category, tableList] of Object.entries(keyTables)) {
      const found = tableList.filter(t => tables.includes(t));
      if (found.length > 0) {
        console.log(`📦 ${category}:`);
        found.forEach(t => console.log(`   ✅ ${t}`));
        console.log();
      }
    }
    
    console.log(`Total tables in database: ${tables.length}`);
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

checkTables();
