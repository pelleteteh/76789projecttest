#!/usr/bin/env python3
"""
Migration script to fix challenge data inconsistencies:
1. Identify and fix challenges with wrong admin_created flag
2. Fix challenges with NULL payment_token_address
3. Backup data before making changes
4. Validate results
"""

import os
import sys
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
from urllib.parse import urlparse

# Known token addresses (lowercased for comparison)
KNOWN_TOKENS = {
    # ETH (native)
    "0x0000000000000000000000000000000000000000": "ETH",
    # USDC addresses (Base, Base Test, Polygon, Ethereum, Arbitrum)
    "0x833589fcd6edb6e08f4c7c32d4f71b3566da8860": "USDC",  # Base
    "0x1c7d4b3638f4dea3d3a4b9c8e5f7a6b2c3d4e5f6g": "USDC",  # Base Test
    "0x2791bca1f2de4661ed88a30c99a7a9449aa84174": "USDC",  # Polygon
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "USDC",  # Ethereum
    "0xff970a61a04b1ca14834a43f5de4533ebddb5fed": "USDC",  # Arbitrum
    # USDT addresses (Base, Polygon, Arbitrum, Ethereum)
    "0x3c499c542cef5e3811e1192ce70d8cc7d307b653": "USDT",  # Base
    "0xc2132d05d31c914a87c6611c10748aeb04b58e8f": "USDT",  # Polygon
    "0xfd086bc7cd5c481dcc9c85ffe45f54dc7c5437e9": "USDT",  # Arbitrum
    "0xdac17f958d2ee523a2206206994597c13d831ec7": "USDT",  # Ethereum
}

def get_db_connection():
    """Get database connection from DATABASE_URL"""
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("❌ DATABASE_URL not set in environment")
        sys.exit(1)
    
    # Parse the URL
    parsed = urlparse(db_url)
    conn = psycopg2.connect(
        host=parsed.hostname,
        port=parsed.port or 5432,
        database=parsed.path[1:],
        user=parsed.username,
        password=parsed.password,
        sslmode='require'
    )
    return conn

def backup_affected_records(conn, issues):
    """Create a backup of affected records"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = f"/workspaces/56yhggy6/server/migrations/backup_challenges_{timestamp}.json"
    
    with open(backup_file, 'w') as f:
        json.dump(issues, f, indent=2, default=str)
    
    print(f"✅ Backup created: {backup_file}")
    return backup_file

def identify_issues(conn):
    """Identify all data consistency issues"""
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    issues = {
        "wrong_admin_flag": [],
        "null_token_address": [],
        "invalid_token_address": [],
        "timestamp": datetime.now().isoformat()
    }
    
    # Issue 1: Open challenges with admin_created=true (should be false)
    print("\n🔍 Checking for open challenges with wrong admin_created flag...")
    cursor.execute("""
        SELECT id, title, status, admin_created, payment_token_address, 
               challenger, challenged, created_at
        FROM challenges
        WHERE status = 'open' AND admin_created = true
        ORDER BY created_at DESC
    """)
    
    wrong_admin = cursor.fetchall()
    issues["wrong_admin_flag"] = [dict(r) for r in wrong_admin]
    
    if wrong_admin:
        print(f"⚠️  Found {len(wrong_admin)} open challenges with admin_created=true:")
        for challenge in wrong_admin:
            print(f"   - ID {challenge['id']}: {challenge['title'][:50]}")
    else:
        print("✅ No open challenges with wrong admin_created flag")
    
    # Issue 2: Challenges with NULL payment_token_address
    print("\n🔍 Checking for challenges with NULL payment_token_address...")
    cursor.execute("""
        SELECT id, title, status, admin_created, payment_token_address,
               challenger, challenged, created_at
        FROM challenges
        WHERE payment_token_address IS NULL OR payment_token_address = ''
        ORDER BY created_at DESC
    """)
    
    null_tokens = cursor.fetchall()
    issues["null_token_address"] = [dict(r) for r in null_tokens]
    
    if null_tokens:
        print(f"⚠️  Found {len(null_tokens)} challenges with NULL/empty token address:")
        for challenge in null_tokens:
            is_admin = "ADMIN" if challenge['admin_created'] else "P2P"
            print(f"   - ID {challenge['id']} ({is_admin}): {challenge['title'][:50]}")
    else:
        print("✅ No challenges with NULL token address")
    
    # Issue 3: Challenges with invalid token addresses (not in known list)
    print("\n🔍 Checking for challenges with invalid token addresses...")
    cursor.execute("""
        SELECT DISTINCT payment_token_address
        FROM challenges
        WHERE payment_token_address IS NOT NULL 
        AND payment_token_address != ''
        ORDER BY payment_token_address
    """)
    
    all_tokens = cursor.fetchall()
    invalid_tokens = []
    
    for token_row in all_tokens:
        token = token_row['payment_token_address']
        if token and token.lower() not in KNOWN_TOKENS:
            invalid_tokens.append(token)
    
    if invalid_tokens:
        print(f"⚠️  Found {len(set(invalid_tokens))} unique unknown token addresses:")
        for token in set(invalid_tokens):
            # Count how many challenges use this token
            cursor.execute(
                "SELECT COUNT(*) as count FROM challenges WHERE payment_token_address = %s",
                (token,)
            )
            count = cursor.fetchone()['count']
            print(f"   - {token}: {count} challenges")
            issues["invalid_token_address"].append({
                "address": token,
                "count": count
            })
    else:
        print("✅ All token addresses are valid")
    
    cursor.close()
    return issues

def fix_issues(conn, issues):
    """Fix identified issues"""
    cursor = conn.cursor()
    fixes = {
        "admin_flag_fixed": 0,
        "token_address_fixed": 0,
        "errors": []
    }
    
    try:
        # Fix 1: Correct admin_created flag for open P2P challenges
        if issues["wrong_admin_flag"]:
            print(f"\n🔧 Fixing {len(issues['wrong_admin_flag'])} challenges with wrong admin_created flag...")
            for challenge in issues["wrong_admin_flag"]:
                try:
                    # Only fix if it's P2P (has challenger and challenged users)
                    if challenge['challenger'] and challenge['challenged']:
                        cursor.execute(
                            "UPDATE challenges SET admin_created = false WHERE id = %s",
                            (challenge['id'],)
                        )
                        fixes["admin_flag_fixed"] += 1
                        print(f"   ✓ Fixed ID {challenge['id']}")
                except Exception as e:
                    error_msg = f"   ❌ Error fixing ID {challenge['id']}: {str(e)}"
                    print(error_msg)
                    fixes["errors"].append(error_msg)
        
        # Fix 2: Set default token address for challenges with NULL
        if issues["null_token_address"]:
            print(f"\n🔧 Fixing {len(issues['null_token_address'])} challenges with NULL token address...")
            for challenge in issues["null_token_address"]:
                try:
                    # Default to ETH for all challenges
                    default_token = "0x0000000000000000000000000000000000000000"
                    cursor.execute(
                        "UPDATE challenges SET payment_token_address = %s WHERE id = %s",
                        (default_token, challenge['id'])
                    )
                    fixes["token_address_fixed"] += 1
                    print(f"   ✓ Fixed ID {challenge['id']} → ETH")
                except Exception as e:
                    error_msg = f"   ❌ Error fixing ID {challenge['id']}: {str(e)}"
                    print(error_msg)
                    fixes["errors"].append(error_msg)
        
        # Commit all changes
        conn.commit()
        print(f"\n✅ Database commit successful!")
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error during fixes, rolling back: {str(e)}")
        fixes["errors"].append(f"Transaction failed: {str(e)}")
    finally:
        cursor.close()
    
    return fixes

def validate_fixes(conn):
    """Validate that fixes were applied correctly"""
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    print("\n✔️ Validating fixes...")
    
    # Check 1: No more open challenges with admin_created=true
    cursor.execute("""
        SELECT COUNT(*) as count FROM challenges
        WHERE status = 'open' AND admin_created = true
    """)
    wrong_admin_count = cursor.fetchone()['count']
    
    if wrong_admin_count == 0:
        print("✅ Validation: No open challenges with admin_created=true")
    else:
        print(f"⚠️  Validation: Still {wrong_admin_count} open challenges with admin_created=true")
    
    # Check 2: No more NULL token addresses
    cursor.execute("""
        SELECT COUNT(*) as count FROM challenges
        WHERE payment_token_address IS NULL OR payment_token_address = ''
    """)
    null_count = cursor.fetchone()['count']
    
    if null_count == 0:
        print("✅ Validation: No challenges with NULL token address")
    else:
        print(f"⚠️  Validation: Still {null_count} challenges with NULL token address")
    
    # Check 3: Summary stats
    cursor.execute("""
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN admin_created = true THEN 1 ELSE 0 END) as admin_count,
            SUM(CASE WHEN admin_created = false THEN 1 ELSE 0 END) as p2p_count,
            SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count
        FROM challenges
    """)
    
    stats = cursor.fetchone()
    print(f"\n📊 Challenge Statistics:")
    print(f"   Total challenges: {stats['total']}")
    print(f"   Admin challenges: {stats['admin_count']}")
    print(f"   P2P challenges: {stats['p2p_count']}")
    print(f"   Open challenges: {stats['open_count']}")
    
    cursor.close()
    return {
        "wrong_admin_count": wrong_admin_count,
        "null_token_count": null_count,
        "stats": dict(stats)
    }

def main():
    """Main migration function"""
    print("=" * 60)
    print("🚀 Challenge Data Migration Script")
    print("=" * 60)
    
    try:
        # Connect to database
        print("\n📡 Connecting to database...")
        conn = get_db_connection()
        print("✅ Connected successfully")
        
        # Identify issues
        print("\n" + "=" * 60)
        print("PHASE 1: IDENTIFYING ISSUES")
        print("=" * 60)
        issues = identify_issues(conn)
        
        # Backup data
        print("\n" + "=" * 60)
        print("PHASE 2: BACKING UP DATA")
        print("=" * 60)
        backup_file = backup_affected_records(conn, issues)
        
        # Ask for confirmation
        total_issues = len(issues["wrong_admin_flag"]) + len(issues["null_token_address"])
        if total_issues == 0:
            print("\n✅ No issues found! Database is clean.")
            return
        
        print(f"\n⚠️  Total issues found: {total_issues}")
        response = input("\n🔄 Apply fixes? (yes/no): ").strip().lower()
        
        if response != 'yes':
            print("❌ Migration cancelled")
            conn.close()
            return
        
        # Fix issues
        print("\n" + "=" * 60)
        print("PHASE 3: FIXING ISSUES")
        print("=" * 60)
        fixes = fix_issues(conn, issues)
        
        print(f"\n📈 Migration Summary:")
        print(f"   Admin flag fixed: {fixes['admin_flag_fixed']}")
        print(f"   Token address fixed: {fixes['token_address_fixed']}")
        if fixes['errors']:
            print(f"   Errors: {len(fixes['errors'])}")
        
        # Validate fixes
        print("\n" + "=" * 60)
        print("PHASE 4: VALIDATING FIXES")
        print("=" * 60)
        validation = validate_fixes(conn)
        
        # Final report
        print("\n" + "=" * 60)
        print("✅ MIGRATION COMPLETE")
        print("=" * 60)
        print(f"\nBackup saved to: {backup_file}")
        print(f"\nChanges made:")
        print(f"  • {fixes['admin_flag_fixed']} admin_created flags corrected")
        print(f"  • {fixes['token_address_fixed']} token addresses set")
        
        if validation["wrong_admin_count"] == 0 and validation["null_token_count"] == 0:
            print("\n✅ All issues resolved!")
        else:
            print("\n⚠️  Some issues remain - manual review needed")
        
        conn.close()
        
    except Exception as e:
        print(f"\n❌ Fatal error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
