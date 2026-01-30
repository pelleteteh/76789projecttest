import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function findSpecific() {
  try {
    console.log('🔍 Looking for "ordifg" challenge...\n');

    const result = await pool.query(`
      SELECT 
        id, 
        title, 
        status, 
        admin_created,
        payment_token_address,
        created_at,
        challenged
      FROM challenges 
      WHERE LOWER(title) LIKE '%ordifg%'
      ORDER BY created_at DESC;
    `);
    
    console.log(`Found ${result.rows.length} challenge(s):\n`);
    result.rows.forEach(row => {
      console.log(`ID: ${row.id}`);
      console.log(`Title: ${row.title}`);
      console.log(`Status: ${row.status}`);
      console.log(`admin_created: ${row.admin_created}`);
      console.log(`payment_token_address: ${row.payment_token_address || 'NULL'}`);
      console.log(`challenged: ${row.challenged || 'NULL (Open P2P)'}`);
      console.log(`Created: ${row.created_at}\n`);
    });

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

findSpecific();
