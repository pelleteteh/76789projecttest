#!/usr/bin/env node
/**
 * Run the 0006_add_p2p_blockchain_fields migration
 */
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function runMigration() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', '0006_add_p2p_blockchain_fields.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    console.log('🔄 Running migration: 0006_add_p2p_blockchain_fields.sql');
    
    const result = await pool.query(sql);
    console.log('✅ Migration completed successfully');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
