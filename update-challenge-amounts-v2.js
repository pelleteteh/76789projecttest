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
          // For ETH: store as wei to preserve precision, then divide by 1e18 on display
          // Amount = total pool in wei (stake * 2)
          calculatedAmount = Number(weiValue * BigInt(2));
        } else {
          // USDC/USDT have 6 decimals
          // Amount = stake in smallest units * 2 (both sides)
          calculatedAmount = Number(weiValue * BigInt(2));
        }
      }
      
      console.log(`ID ${row.id}: "${row.title}"`);
      console.log(`  stakeAmountWei: ${row.stake_amount_wei}`);
      console.log(`  Calculated amount (in wei): ${calculatedAmount}`);
      
      if (calculatedAmount > 0) {
        // For ETH, calculatedAmount is in wei. For USDC, it's in smallest units.
        // Store as is - the frontend handles conversion
        const updateRes = await pool.query(`
          UPDATE challenges
          SET amount = $1
          WHERE id = $2
        `, [calculatedAmount, row.id]);
        
        if (updateRes.rowCount > 0) {
          console.log(`  ✅ Updated to ${calculatedAmount}\n`);
          updated++;
        }
      } else {
        console.log(`  ⏭️  Skipped (zero)\n`);
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
      const display = Number(row.amount) / 1e18; // Assuming ETH
      console.log(`\nID ${row.id}: "${row.title}"`);
      console.log(`  Amount (wei): ${row.amount}`);
      console.log(`  Amount (ETH): ${display.toFixed(10)}`);
    }
    
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

updateAmounts();
