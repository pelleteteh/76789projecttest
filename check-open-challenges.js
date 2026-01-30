import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function check() {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        title,
        status,
        admin_created,
        challenger,
        challenged,
        created_at
      FROM challenges
      WHERE status = 'open'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log('\n📊 Open Challenges:');
    console.log(`Found ${result.rows.length} open challenges\n`);
    
    result.rows.forEach((row, idx) => {
      console.log(`${idx + 1}. ID: ${row.id}`);
      console.log(`   Title: ${row.title}`);
      console.log(`   Admin Created: ${row.admin_created}`);
      console.log(`   Challenger ID: ${row.challenger}`);
      console.log(`   Challenged ID: ${row.challenged}`);
      console.log(`   Created: ${row.created_at}\n`);
    });
    
    await pool.end();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

check();
