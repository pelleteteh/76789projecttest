import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fix() {
  try {
    // Find P2P challenges with status='open' that have a challenged user
    const problematic = await pool.query(`
      SELECT id, title, challenger, challenged
      FROM challenges
      WHERE status = 'open' AND admin_created = false AND challenged IS NOT NULL
      ORDER BY created_at DESC
    `);
    
    console.log(`\n🔍 Found ${problematic.rows.length} P2P open challenges with opponents set:\n`);
    problematic.rows.forEach(row => {
      console.log(`  ID: ${row.id}, Title: ${row.title}`);
      console.log(`    Challenger: ${row.challenger}`);
      console.log(`    Challenged (should be null): ${row.challenged}\n`);
    });

    if (problematic.rows.length > 0) {
      const confirm = await new Promise(resolve => {
        process.stdout.write('⚠️  Fix these? (yes/no): ');
        process.stdin.once('data', data => {
          resolve(data.toString().trim().toLowerCase() === 'yes');
        });
      });

      if (confirm) {
        const result = await pool.query(`
          UPDATE challenges
          SET challenged = NULL
          WHERE status = 'open' AND admin_created = false AND challenged IS NOT NULL
          RETURNING id, title, challenged
        `);
        
        console.log(`\n✅ Fixed ${result.rows.length} challenges`);
        result.rows.forEach(row => {
          console.log(`  ID: ${row.id}, Title: ${row.title}, challenged: ${row.challenged}`);
        });
      }
    }
    
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

fix();
