#!/usr/bin/env node

/**
 * Diagnostic script to find challenges with:
 * 1. adminCreated = true but status = "open" (incorrect P2P challenges)
 * 2. NULL or invalid paymentTokenAddress
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function diagnose() {
  try {
    console.log('🔍 Diagnosing challenge issues...\n');

    // Issue 1: Open challenges with admin_created = true
    console.log('📋 Finding open challenges with admin_created = true:');
    const result1 = await pool.query(`
      SELECT 
        id, 
        title, 
        status, 
        admin_created, 
        payment_token_address,
        created_at
      FROM challenges 
      WHERE status = 'open' AND admin_created = true
      ORDER BY created_at DESC
      LIMIT 20;
    `);
    console.log(`Found ${result1.rows.length} issues:\n`);
    result1.rows.forEach(row => {
      console.log(`  - ID: ${row.id}`);
      console.log(`    Title: ${row.title}`);
      console.log(`    Status: ${row.status}`);
      console.log(`    admin_created: ${row.admin_created}`);
      console.log(`    Token Address: ${row.payment_token_address || 'NULL'}`);
      console.log(`    Created: ${row.created_at}\n`);
    });

    // Issue 2: Challenges with NULL or empty payment_token_address
    console.log('\n💰 Finding challenges with NULL/empty payment_token_address:');
    const result2 = await pool.query(`
      SELECT 
        id, 
        title, 
        status, 
        admin_created,
        payment_token_address,
        created_at
      FROM challenges 
      WHERE payment_token_address IS NULL OR payment_token_address = ''
      ORDER BY created_at DESC
      LIMIT 20;
    `);
    console.log(`Found ${result2.rows.length} issues:\n`);
    result2.rows.forEach(row => {
      console.log(`  - ID: ${row.id}`);
      console.log(`    Title: ${row.title}`);
      console.log(`    Status: ${row.status}`);
      console.log(`    admin_created: ${row.admin_created}`);
      console.log(`    Created: ${row.created_at}\n`);
    });

    // Summary stats
    console.log('\n📊 Summary Statistics:');
    const statsResult = await pool.query(`
      SELECT 
        status,
        admin_created,
        COUNT(*) as count,
        SUM(CASE WHEN payment_token_address IS NULL OR payment_token_address = '' THEN 1 ELSE 0 END) as null_token_count
      FROM challenges
      GROUP BY status, admin_created
      ORDER BY status, admin_created;
    `);
    console.log(statsResult.rows);

    await pool.end();
    console.log('\n✅ Diagnosis complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

diagnose();
