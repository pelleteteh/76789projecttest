import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    // Get open P2P challenges
    const challenges = await pool.query(`
      SELECT id, title, status, admin_created, challenger, challenged
      FROM challenges
      WHERE status = 'open' AND admin_created = false
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    console.log('\n📊 Open P2P Challenges in DB:');
    challenges.rows.forEach(row => {
      console.log(`\nID: ${row.id}`);
      console.log(`  challenged: ${row.challenged} (type: ${typeof row.challenged})`);
      console.log(`  challenged === null: ${row.challenged === null}`);
    });
    
    // Get user data for mapping
    if (challenges.rows.length > 0) {
      const userIds = new Set();
      challenges.rows.forEach(c => {
        if (c.challenger) userIds.add(c.challenger);
        if (c.challenged) userIds.add(c.challenged);
      });
      
      console.log(`\n👥 Challenger/Challenged User IDs to fetch:`);
      Array.from(userIds).forEach(id => console.log(`  - ${id}`));
      
      const users = await pool.query(`
        SELECT id, username, firstName, lastName
        FROM users
        WHERE id = ANY($1)
      `, [Array.from(userIds)]);
      
      console.log(`\n Found ${users.rows.length} users`);
    }
    
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

check();
