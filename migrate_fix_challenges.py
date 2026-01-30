#!/usr/bin/env python3
"""
Migration script to fix challenge data inconsistencies:
1. Fix admin_created flag for open P2P challenges (should be false)
2. Populate null payment_token_address values with USDC Base address
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
USDC_BASE_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b3566dA8860"

def connect_db():
    """Connect to PostgreSQL database."""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        print("✓ Connected to database")
        return conn
    except Exception as e:
        print(f"✗ Failed to connect to database: {e}")
        exit(1)

def get_before_stats(conn):
    """Get stats before migration."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        # Count open challenges with admin_created=true
        cur.execute("""
            SELECT COUNT(*) as count FROM challenges 
            WHERE status = 'open' AND admin_created = true AND challenged IS NOT NULL
        """)
        bad_admin_flags = cur.fetchone()['count']
        
        # Count challenges with null payment_token_address
        cur.execute("""
            SELECT COUNT(*) as count FROM challenges 
            WHERE payment_token_address IS NULL
        """)
        null_tokens = cur.fetchone()['count']
        
        # Sample of bad data
        cur.execute("""
            SELECT id, status, admin_created, payment_token_address, challenger, challenged 
            FROM challenges 
            WHERE status = 'open' AND admin_created = true AND challenged IS NOT NULL
            LIMIT 5
        """)
        bad_samples = cur.fetchall()
        
        cur.execute("""
            SELECT id, status, admin_created, payment_token_address 
            FROM challenges 
            WHERE payment_token_address IS NULL
            LIMIT 5
        """)
        null_samples = cur.fetchall()
        
        return {
            'bad_admin_flags': bad_admin_flags,
            'null_tokens': null_tokens,
            'bad_samples': bad_samples,
            'null_samples': null_samples
        }

def migrate(conn):
    """Run migration to fix data."""
    with conn.cursor() as cur:
        # Fix 1: Set admin_created=false for open P2P challenges (have both challenger and challenged)
        print("\n📝 Fixing admin_created flag for open P2P challenges...")
        cur.execute("""
            UPDATE challenges 
            SET admin_created = false
            WHERE status = 'open' AND admin_created = true AND challenged IS NOT NULL
        """)
        affected_rows = cur.rowcount
        print(f"   ✓ Updated {affected_rows} challenges with corrected admin_created flag")
        
        # Fix 2: Populate null payment_token_address with USDC Base
        print("\n📝 Populating null payment_token_address values...")
        cur.execute(f"""
            UPDATE challenges 
            SET payment_token_address = '{USDC_BASE_ADDRESS}'
            WHERE payment_token_address IS NULL
        """)
        affected_rows = cur.rowcount
        print(f"   ✓ Updated {affected_rows} challenges with USDC Base address")
        
        conn.commit()

def get_after_stats(conn):
    """Get stats after migration."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        # Count remaining issues
        cur.execute("""
            SELECT COUNT(*) as count FROM challenges 
            WHERE status = 'open' AND admin_created = true AND challenged IS NOT NULL
        """)
        remaining_bad = cur.fetchone()['count']
        
        cur.execute("""
            SELECT COUNT(*) as count FROM challenges 
            WHERE payment_token_address IS NULL
        """)
        remaining_null = cur.fetchone()['count']
        
        # Overall challenge stats
        cur.execute("""
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN admin_created = true THEN 1 END) as admin_challenges,
                COUNT(CASE WHEN admin_created = false THEN 1 END) as p2p_challenges,
                COUNT(CASE WHEN payment_token_address IS NOT NULL THEN 1 END) as with_tokens,
                COUNT(CASE WHEN payment_token_address IS NULL THEN 1 END) as null_tokens
            FROM challenges
        """)
        stats = cur.fetchone()
        
        return {
            'remaining_bad': remaining_bad,
            'remaining_null': remaining_null,
            'stats': stats
        }

def main():
    print("🔄 Starting Challenge Data Migration")
    print("=" * 60)
    
    conn = connect_db()
    
    try:
        # Show before stats
        print("\n📊 Before Migration Stats:")
        before = get_before_stats(conn)
        print(f"   • Open challenges with admin_created=true: {before['bad_admin_flags']}")
        print(f"   • Challenges with null payment_token: {before['null_tokens']}")
        
        if before['bad_samples']:
            print("\n   Sample bad admin_created flags:")
            for row in before['bad_samples']:
                print(f"      - ID {row['id']}: status={row['status']}, admin_created={row['admin_created']}, challenger={row['challenger'][:8]}..., challenged={row['challenged'][:8] if row['challenged'] else 'None'}...")
        
        if before['null_samples']:
            print("\n   Sample null payment_token entries:")
            for row in before['null_samples']:
                print(f"      - ID {row['id']}: status={row['status']}, token={row['payment_token_address']}")
        
        # Run migration
        print("\n" + "=" * 60)
        print("🚀 Running Migration...")
        migrate(conn)
        
        # Show after stats
        print("\n" + "=" * 60)
        print("\n📊 After Migration Stats:")
        after = get_after_stats(conn)
        print(f"   • Remaining bad admin_created flags: {after['remaining_bad']}")
        print(f"   • Remaining null payment_tokens: {after['remaining_null']}")
        print(f"\n   Overall Challenge Statistics:")
        stats = after['stats']
        print(f"      - Total challenges: {stats['total']}")
        print(f"      - Admin-created challenges: {stats['admin_challenges']}")
        print(f"      - P2P challenges: {stats['p2p_challenges']}")
        print(f"      - Challenges with tokens: {stats['with_tokens']}")
        print(f"      - Challenges with null tokens: {stats['null_tokens']}")
        
        # Summary
        print("\n" + "=" * 60)
        if after['remaining_bad'] == 0 and after['remaining_null'] == 0:
            print("✅ Migration completed successfully! All issues fixed.")
        else:
            print("⚠️  Migration completed with remaining issues:")
            if after['remaining_bad'] > 0:
                print(f"   - {after['remaining_bad']} challenges still have incorrect admin_created flag")
            if after['remaining_null'] > 0:
                print(f"   - {after['remaining_null']} challenges still have null payment_token")
        
        print("=" * 60)
        
    except Exception as e:
        print(f"\n✗ Migration failed: {e}")
        conn.rollback()
        exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    main()
