#!/usr/bin/env python3
"""
Supabase Database Migration Script
Adds missing columns to tables for notification and points system
"""

import os
import sys
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor
from urllib.parse import urlparse

# Load environment variables
load_dotenv()

# Get Supabase connection details from DATABASE_URL
DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    print("❌ Missing DATABASE_URL in .env file")
    sys.exit(1)

# Parse the database URL
try:
    parsed_url = urlparse(DATABASE_URL)
    SUPABASE_USER = parsed_url.username
    SUPABASE_PASSWORD = parsed_url.password
    SUPABASE_HOST = parsed_url.hostname
    SUPABASE_PORT = parsed_url.port or 5432
    SUPABASE_DB = parsed_url.path.lstrip('/')
    
    print(f"📌 Connecting to: {SUPABASE_HOST}:{SUPABASE_PORT}/{SUPABASE_DB}")
except Exception as e:
    print(f"❌ Failed to parse DATABASE_URL: {e}")
    sys.exit(1)

# Connection string
try:
    conn = psycopg2.connect(
        host=SUPABASE_HOST,
        port=SUPABASE_PORT,
        user=SUPABASE_USER,
        password=SUPABASE_PASSWORD,
        database=SUPABASE_DB
    )
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    print("✅ Connected to Supabase")
    
    migrations = []
    
    # Migration 1: Add challenge_id column to points_transactions
    print("\n📋 Checking points_transactions table...")
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'points_transactions' AND column_name = 'challenge_id'
    """)
    
    if not cursor.fetchone():
        print("  ⚠️  challenge_id column missing - adding it...")
        migrations.append("""
            ALTER TABLE points_transactions
            ADD COLUMN challenge_id INTEGER REFERENCES challenges(id) ON DELETE SET NULL;
        """)
        print("  ✅ Migration added: Add challenge_id to points_transactions")
    else:
        print("  ✓ challenge_id column already exists")
    
    # Migration 2: Add indexes for performance
    print("\n📋 Checking indexes on points_transactions...")
    cursor.execute("""
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'points_transactions' AND indexname = 'idx_points_challenge_id'
    """)
    
    if not cursor.fetchone():
        print("  ⚠️  Challenge ID index missing - adding it...")
        migrations.append("""
            CREATE INDEX idx_points_challenge_id ON points_transactions(challenge_id);
        """)
        print("  ✅ Migration added: Create idx_points_challenge_id")
    else:
        print("  ✓ Challenge ID index already exists")
    
    # Migration 3: Check challenges table has result column
    print("\n📋 Checking challenges table...")
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'challenges' AND column_name = 'result'
    """)
    
    if not cursor.fetchone():
        print("  ⚠️  result column missing - adding it...")
        migrations.append("""
            ALTER TABLE challenges
            ADD COLUMN result VARCHAR DEFAULT NULL;
        """)
        print("  ✅ Migration added: Add result to challenges")
    else:
        print("  ✓ result column already exists")
    
    # Migration 4: Check resolutionTimestamp column
    print("\n📋 Checking resolutionTimestamp in challenges...")
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'challenges' AND column_name = 'resolution_timestamp'
    """)
    
    if not cursor.fetchone():
        print("  ⚠️  resolution_timestamp column missing - adding it...")
        migrations.append("""
            ALTER TABLE challenges
            ADD COLUMN resolution_timestamp TIMESTAMP DEFAULT NULL;
        """)
        print("  ✅ Migration added: Add resolution_timestamp to challenges")
    else:
        print("  ✓ resolution_timestamp column already exists")
    
    # Migration 5: Check resolutionTxHash column
    print("\n📋 Checking resolutionTxHash in challenges...")
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'challenges' AND column_name = 'resolution_tx_hash'
    """)
    
    if not cursor.fetchone():
        print("  ⚠️  resolution_tx_hash column missing - adding it...")
        migrations.append("""
            ALTER TABLE challenges
            ADD COLUMN resolution_tx_hash VARCHAR DEFAULT NULL;
        """)
        print("  ✅ Migration added: Add resolution_tx_hash to challenges")
    else:
        print("  ✓ resolution_tx_hash column already exists")
    
    # Run migrations
    if migrations:
        print(f"\n🚀 Running {len(migrations)} migration(s)...\n")
        
        for i, migration in enumerate(migrations, 1):
            try:
                print(f"  [{i}/{len(migrations)}] Executing migration...")
                cursor.execute(migration)
                conn.commit()
                print(f"  ✅ Migration {i} successful")
            except psycopg2.Error as e:
                print(f"  ❌ Migration {i} failed: {e}")
                conn.rollback()
        
        print("\n✅ All migrations completed!")
    else:
        print("\n✅ Database is already up to date!")
    
    cursor.close()
    conn.close()
    
except psycopg2.Error as e:
    print(f"❌ Database error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
