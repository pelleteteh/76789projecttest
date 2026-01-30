import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
  idleTimeoutMillis: 0,
});

async function checkAdminCreatedFlag() {
  try {
    // Check total challenges by admin_created flag
    console.log('\n📊 Challenge Count by admin_created flag:');
    const countResult = await pool.query(`
      SELECT admin_created, COUNT(*) as count, status
      FROM challenges
      GROUP BY admin_created, status
      ORDER BY admin_created, status
    `);
    if (!countResult || !countResult.rows) {
      console.log('  No data returned');
    } else {
      countResult.rows.forEach(row => {
        console.log(`  admin_created=${row.admin_created}, status=${row.status}: ${row.count} challenges`);
      });
    }

    // Find open challenges that are incorrectly marked as admin_created
    console.log('\n⚠️  Open challenges marked as admin_created (should be false):');
    const problematicResult = await pool.query(`
      SELECT id, title, status, admin_created, created_at, challenger, category
      FROM challenges
      WHERE status = 'open' AND admin_created = true
      ORDER BY created_at DESC
      LIMIT 20
    `);
    
    if (problematicResult.rows.length === 0) {
      console.log('  ✅ No problematic challenges found!');
    } else {
      console.log(`  Found ${problematicResult.rows.length} challenges:`);
      problematicResult.rows.forEach(row => {
        console.log(`  - ID: ${row.id}, Title: "${row.title}", Status: ${row.status}, Category: ${row.category}`);
      });
    }

    // Check for challenges with null payment_token_address
    console.log('\n⚠️  Challenges with null payment_token_address:');
    const tokenResult = await pool.query(`
      SELECT id, title, status, admin_created, payment_token_address
      FROM challenges
      WHERE payment_token_address IS NULL
      LIMIT 20
    `);
    
    if (tokenResult.rows.length === 0) {
      console.log('  ✅ All challenges have payment_token_address set!');
    } else {
      console.log(`  Found ${tokenResult.rows.length} challenges with null token address:`);
      tokenResult.rows.forEach(row => {
        console.log(`  - ID: ${row.id}, Title: "${row.title}", Status: ${row.status}`);
      });
    }

    // Get recent open challenges to verify
    console.log('\n📋 Recent open challenges (last 10):');
    const recentResult = await pool.query(`
      SELECT id, title, status, admin_created, created_at, category
      FROM challenges
      WHERE status = 'open'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    recentResult.rows.forEach(row => {
      const flag = row.admin_created ? '❌ ADMIN' : '✅ P2P';
      console.log(`  ${flag} | ID: ${row.id} | "${row.title.substring(0, 30)}..." | ${row.category}`);
    });

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkAdminCreatedFlag();
