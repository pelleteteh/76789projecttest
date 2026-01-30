#!/usr/bin/env python3
"""
Database Migration Script for Bantah Platform
Migrates Supabase PostgreSQL database to include missing columns
Run with: python migrate_database.py
"""

import psycopg2
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    print("❌ ERROR: DATABASE_URL not found in .env file")
    sys.exit(1)

def run_migration():
    """Run database migrations"""
    try:
        # Connect to database
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        print(f"✅ Connected to Supabase PostgreSQL")
        print(f"   Database: {conn.info.dbname}")
        
        migrations = [
            {
                "name": "Add challenge_id to points_transactions",
                "sql": """
                    ALTER TABLE IF EXISTS public.points_transactions
                    ADD COLUMN IF NOT EXISTS challenge_id integer REFERENCES public.challenges(id) ON DELETE SET NULL;
                """
            },
            {
                "name": "Add blockchain_tx_hash to points_transactions",
                "sql": """
                    ALTER TABLE IF EXISTS public.points_transactions
                    ADD COLUMN IF NOT EXISTS blockchain_tx_hash text;
                """
            },
            {
                "name": "Create index on points_transactions.challenge_id",
                "sql": """
                    CREATE INDEX IF NOT EXISTS idx_points_transactions_challenge_id 
                    ON public.points_transactions(challenge_id);
                """
            },
            {
                "name": "Create index on points_transactions.user_id",
                "sql": """
                    CREATE INDEX IF NOT EXISTS idx_points_transactions_user_id 
                    ON public.points_transactions(user_id);
                """
            },
            {
                "name": "Add acceptance_timestamp to challenges",
                "sql": """
                    ALTER TABLE IF EXISTS public.challenges
                    ADD COLUMN IF NOT EXISTS acceptance_timestamp timestamp without time zone;
                """
            },
            {
                "name": "Add resolution_timestamp to challenges",
                "sql": """
                    ALTER TABLE IF EXISTS public.challenges
                    ADD COLUMN IF NOT EXISTS resolution_timestamp timestamp without time zone;
                """
            },
            {
                "name": "Add resolution_tx_hash to challenges",
                "sql": """
                    ALTER TABLE IF EXISTS public.challenges
                    ADD COLUMN IF NOT EXISTS resolution_tx_hash text;
                """
            },
            {
                "name": "Add on_chain_resolved to challenges",
                "sql": """
                    ALTER TABLE IF EXISTS public.challenges
                    ADD COLUMN IF NOT EXISTS on_chain_resolved boolean DEFAULT false;
                """
            },
            {
                "name": "Add acceptor_transaction_hash to challenges",
                "sql": """
                    ALTER TABLE IF EXISTS public.challenges
                    ADD COLUMN IF NOT EXISTS acceptor_transaction_hash text;
                """
            },
            {
                "name": "Add creator_transaction_hash to challenges",
                "sql": """
                    ALTER TABLE IF EXISTS public.challenges
                    ADD COLUMN IF NOT EXISTS creator_transaction_hash text;
                """
            },
        ]
        
        # Run each migration
        for migration in migrations:
            try:
                print(f"\n▶️  {migration['name']}...")
                cursor.execute(migration['sql'])
                conn.commit()
                print(f"   ✅ Success")
            except Exception as e:
                # Column might already exist, that's fine
                if "already exists" in str(e) or "already in use" in str(e):
                    print(f"   ℹ️  Already exists - skipping")
                else:
                    print(f"   ⚠️  Warning: {str(e)[:100]}")
        
        # Verify schema
        print(f"\n🔍 Verifying schema...")
        
        # Check points_transactions columns
        cursor.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'points_transactions' AND table_schema = 'public'
            ORDER BY ordinal_position;
        """)
        columns = cursor.fetchall()
        print(f"\n   points_transactions columns:")
        for col in columns:
            print(f"   - {col[0]}")
        
        # Check challenges columns
        cursor.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'challenges' AND table_schema = 'public'
            ORDER BY ordinal_position;
        """)
        columns = cursor.fetchall()
        print(f"\n   challenges columns:")
        for col in columns:
            print(f"   - {col[0]}")
        
        cursor.close()
        conn.close()
        
        print(f"\n✅ Migration completed successfully!")
        return True
        
    except psycopg2.OperationalError as e:
        print(f"❌ Connection error: {e}")
        return False
    except Exception as e:
        print(f"❌ Migration error: {e}")
        return False

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)
