import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fix() {
  try {
    const result = await pool.query(`
      UPDATE challenges
      SET challenged = NULL
      WHERE status = 'open' AND admin_created = false AND challenged IS NOT NULL
      RETURNING id, title
    `);
    
    console.log(`\n✅ Fixed ${result.rows.length} open challenges`);
    result.rows.forEach(row => {
      console.log(`  ID: ${row.id}, Title: ${row.title}`);
    });
    
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

fix();
