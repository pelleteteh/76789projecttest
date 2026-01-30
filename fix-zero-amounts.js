import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fix() {
  try {
    // Get challenges with amount = 0
    const zeroAmounts = await pool.query(`
      SELECT id, title, stake_amount_wei, payment_token_address
      FROM challenges
      WHERE amount = 0 AND admin_created = false
    `);
    
    console.log(`\n📊 Found ${zeroAmounts.rows.length} P2P challenges with amount = 0:\n`);
    
    for (const row of zeroAmounts.rows) {
      let calculatedAmount = 0;
      
      if (row.stake_amount_wei) {
        const weiValue = BigInt(row.stake_amount_wei);
        const isETH = row.payment_token_address === '0x0000000000000000000000000000000000000000';
        
        if (isETH) {
          // ETH has 18 decimals - convert to regular numbers
          const ethValue = Number(weiValue) / 1e18;
          calculatedAmount = Math.floor(ethValue * 2 * 100) / 100; // Keep 2 decimal places
        } else {
          // USDC/USDT have 6 decimals
          const tokenValue = Number(weiValue) / 1e6;
          calculatedAmount = Math.floor(tokenValue * 2);
        }
      }
      
      console.log(`ID ${row.id}: "${row.title}"`);
      console.log(`  stakeAmountWei: ${row.stake_amount_wei}`);
      console.log(`  Calculated amount (total pool): ${calculatedAmount}\n`);
      
      if (calculatedAmount > 0) {
        await pool.query(`
          UPDATE challenges
          SET amount = $1
          WHERE id = $2
        `, [calculatedAmount, row.id]);
        
        console.log(`  ✅ Updated to ${calculatedAmount}\n`);
      }
    }
    
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

fix();
