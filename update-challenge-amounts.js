import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function updateAmounts() {
  try {
    // Get challenges with amount = 0 and valid stakeAmountWei
    const zeroAmounts = await pool.query(`
      SELECT id, title, stake_amount_wei, payment_token_address, amount
      FROM challenges
      WHERE amount = 0 AND stake_amount_wei IS NOT NULL AND admin_created = false
    `);
    
    console.log(`\n📊 Found ${zeroAmounts.rows.length} P2P challenges with amount = 0\n`);
    
    let updated = 0;
    
    for (const row of zeroAmounts.rows) {
      let calculatedAmount = 0;
      
      if (row.stake_amount_wei) {
        const weiValue = BigInt(row.stake_amount_wei);
        const isETH = row.payment_token_address === '0x0000000000000000000000000000000000000000';
        
        if (isETH) {
          // ETH has 18 decimals
          const ethValue = Number(weiValue) / 1e18;
          calculatedAmount = ethValue * 2; // Total pool = stake * 2
        } else {
          // USDC/USDT have 6 decimals
          const tokenValue = Number(weiValue) / 1e6;
          calculatedAmount = Math.floor(tokenValue * 2); // Keep as integer for USDC
        }
      }
      
      console.log(`ID ${row.id}: "${row.title}"`);
      console.log(`  stakeAmountWei: ${row.stake_amount_wei}`);
      console.log(`  Calculated amount: ${calculatedAmount}`);
      
      if (calculatedAmount > 0) {
        const updateRes = await pool.query(`
          UPDATE challenges
          SET amount = $1
          WHERE id = $2
        `, [calculatedAmount, row.id]);
        
        if (updateRes.rowCount > 0) {
          console.log(`  ✅ Updated\n`);
          updated++;
        }
      } else {
        console.log(`  ⏭️  Skipped (too small)\n`);
      }
    }
    
    console.log(`\n✅ Updated ${updated}/${zeroAmounts.rows.length} challenges`);
    
    // Show the updated values
    console.log('\n📋 Updated challenges:');
    const updatedRows = await pool.query(`
      SELECT id, title, amount, stake_amount_wei, payment_token_address
      FROM challenges
      WHERE id IN (30, 31, 32, 33)
      ORDER BY id
    `);
    
    for (const row of updatedRows.rows) {
      console.log(`\nID ${row.id}: "${row.title}"`);
      console.log(`  Amount: ${row.amount}`);
      console.log(`  Stake Wei: ${row.stake_amount_wei}`);
    }
    
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

updateAmounts();
