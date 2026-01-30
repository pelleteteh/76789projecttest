import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function findDuplicates() {
  try {
    console.log('🔍 Looking for duplicate challenges...\n');

    const result = await pool.query(`
      SELECT 
        id, 
        title, 
        status, 
        admin_created,
        payment_token_address,
        created_at
      FROM challenges 
      WHERE title IN (
        SELECT title FROM challenges 
        GROUP BY title 
        HAVING COUNT(*) > 1
      )
      ORDER BY title, created_at DESC;
    `);
    
    console.log(`Found ${result.rows.length} challenges with duplicate titles:\n`);
    
    let currentTitle = '';
    result.rows.forEach(row => {
      if (row.title !== currentTitle) {
        console.log(`\n📌 "${row.title}":`);
        currentTitle = row.title;
      }
      console.log(`  - ID: ${row.id} | admin_created: ${row.admin_created} | status: ${row.status} | token: ${row.payment_token_address || 'NULL'}`);
    });

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

findDuplicates();
