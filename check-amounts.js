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
        amount,
        stake_amount_wei,
        payment_token_address
      FROM challenges
      WHERE admin_created = false
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log('\n📊 P2P Challenges - Amount Values:\n');
    console.log('ID | Title | Amount | StakeWei | Token');
    console.log('---|-------|--------|----------|------');
    
    result.rows.forEach(row => {
      const title = row.title.substring(0, 20).padEnd(20);
      const amount = (row.amount || 'NULL').toString().padEnd(7);
      const stakeWei = row.stake_amount_wei ? row.stake_amount_wei.toString().substring(0, 15) : 'NULL';
      const token = row.payment_token_address ? row.payment_token_address.substring(0, 10) : 'NULL';
      console.log(`${row.id} | ${title} | ${amount} | ${stakeWei} | ${token}`);
    });
    
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

check();
