import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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
      ORDER BY created_at DESC
      LIMIT 30
    `);
    
    console.log('\n📊 All Recent Challenges:\n');
    console.log('Status | Admin | Challenger | Challenged | Title');
    console.log('-------|-------|------------|------------|------');
    
    result.rows.forEach(row => {
      const status = row.status.padEnd(7);
      const admin = (row.admin_created ? 'Y' : 'N').padEnd(6);
      const chall = row.challenger ? 'YES' : 'NO';
      const challed = row.challenged ? 'YES' : 'NO';
      const title = row.title.substring(0, 30);
      console.log(`${status}| ${admin}| ${chall.padEnd(10)} | ${challed.padEnd(10)} | ${title}`);
    });
    
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

check();
