import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    // Check challenges 32 and 33 specifically
    const result = await pool.query(`
      SELECT 
        id,
        title,
        amount,
        admin_created
      FROM challenges
      WHERE id IN (32, 33)
    `);
    
    console.log('\nChallenges 32 and 33:');
    result.rows.forEach(row => {
      console.log(`ID ${row.id}: amount=${row.amount}, adminCreated=${row.admin_created}`);
    });
    
    // Check all with NULL amount
    const nullResult = await pool.query(`
      SELECT count(*) FROM challenges WHERE amount IS NULL
    `);
    console.log(`\nTotal challenges with NULL amount: ${nullResult.rows[0].count}`);
    
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

check();
