#!/usr/bin/env python3
"""
Database migration script to apply all pending Drizzle migrations
"""
import os
import psycopg2
from psycopg2.extras import RealDictCursor
import sys
import json
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_db_connection():
    """Get database connection from environment"""
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        print("❌ DATABASE_URL not found in environment")
        print("   Make sure .env file exists and contains DATABASE_URL")
        sys.exit(1)

    try:
        conn = psycopg2.connect(db_url)
        print("✅ Connected to database")
        return conn
    except Exception as e:
        print(f"❌ Failed to connect to database: {e}")
        sys.exit(1)

def get_applied_migrations():
    """Get list of already applied migrations from journal"""
    journal_path = Path('./migrations/meta/_journal.json')
    if not journal_path.exists():
        print("⚠️  Migration journal not found")
        return []
    
    try:
        with open(journal_path, 'r') as f:
            journal = json.load(f)
            applied = [entry['tag'] for entry in journal.get('entries', [])]
            print(f"📋 Applied migrations: {applied}")
            return applied
    except Exception as e:
        print(f"⚠️  Could not read journal: {e}")
        return []

def get_pending_migrations():
    """Get list of migration files that haven't been applied yet"""
    migrations_dir = Path('./migrations')
    applied = get_applied_migrations()
    
    # Define migration order - dependencies first
    migration_order = [
        '0000_gray_harrier',
        '0001_phase_3_payouts',
        '0002_add_cover_image_url',
        '0003_add_bonus_amount',
        '0004_add_admin_wallet',
        '0005_add_challenge_id_to_notifications',
        '0006_add_p2p_blockchain_fields',
        # phase3-blockchain has parsing issues - manually created what we need
        # '0007_create_user_wallet_addresses' - ALREADY CREATED
        '0008_add_challenger_side',
    ]
    
    pending = []
    for tag in migration_order:
        if tag not in applied:
            # Find the migration file for this tag
            mig_files = list(migrations_dir.glob(f'{tag}.sql'))
            if mig_files:
                pending.append((tag, mig_files[0]))
    
    print(f"\n📁 Found {len(pending)} pending migrations")
    for tag, path in pending:
        print(f"   - {tag}")
    
    return pending

def apply_migration(conn, cursor, migration_file):
    """Apply a single migration file"""
    try:
        with open(migration_file, 'r') as f:
            content = f.read()
        
        # Split by the statement breakpoint marker used by Drizzle
        # If no breakpoint is found, treat the whole file as one statement
        if '--> statement-breakpoint' in content:
            statements = content.split('--> statement-breakpoint')
            statements = [s.strip() for s in statements if s.strip()]
        else:
            # For files without statement-breakpoint (like phase3-blockchain.sql)
            # Split by semicolons but preserve comments
            lines = []
            current_statement = []
            for line in content.split('\n'):
                stripped = line.strip()
                # Skip empty lines and comments at the start of a line
                if not stripped or stripped.startswith('--'):
                    if stripped and not stripped.startswith('--'):
                        current_statement.append(line)
                    continue
                current_statement.append(line)
                if stripped.endswith(';'):
                    statement_text = '\n'.join(current_statement).strip()
                    if statement_text and not statement_text.startswith('--'):
                        lines.append(statement_text)
                    current_statement = []
            
            # Add any remaining statement
            if current_statement:
                statement_text = '\n'.join(current_statement).strip()
                if statement_text and not statement_text.startswith('--'):
                    lines.append(statement_text)
            
            # Filter and clean statements
            statements = [s for s in lines if s.strip() and not s.strip().startswith('--')]
        
        print(f"\n📝 Applying {migration_file.stem}...")
        print(f"   Found {len(statements)} SQL statements")
        
        skipped_count = 0
        applied_count = 0
        failed_count = 0
        
        for i, statement in enumerate(statements, 1):
            if not statement.strip():
                continue
            
            try:
                cursor.execute(statement)
                applied_count += 1
                print(f"   ✓ Statement {i}/{len(statements)}")
            except Exception as e:
                # Some statements may fail if they already exist
                error_str = str(e).lower()
                error_code = str(e)
                
                # Codes for "already exists"
                if "already exists" in error_str or "42p07" in error_str:
                    skipped_count += 1
                    print(f"   ⚠️  Statement {i}/{len(statements)}: Already exists")
                    # Need to rollback failed statement to continue
                    conn.rollback()
                # Code for "column does not exist" - try to skip for phase3-blockchain
                elif migration_file.stem == 'phase3-blockchain' and ('does not exist' in error_str or '42703' in error_code):
                    skipped_count += 1
                    print(f"   ⚠️  Statement {i}/{len(statements)}: Skipped (dependency not met)")
                    conn.rollback()
                # Skip duplicate key violations
                elif "duplicate" in error_str or "unique" in error_str:
                    skipped_count += 1
                    print(f"   ⚠️  Statement {i}/{len(statements)}: Duplicate/Unique constraint")
                    conn.rollback()
                else:
                    failed_count += 1
                    print(f"   ✗ Statement {i}/{len(statements)}: {error_code[:80]}")
                    conn.rollback()
                    if migration_file.stem != 'phase3-blockchain':
                        # Only fail on non-phase3 migrations
                        raise
        
        # Commit this migration
        conn.commit()
        print(f"✅ {migration_file.stem} applied (applied: {applied_count}, skipped: {skipped_count}, failed: {failed_count})")
        return True
    
    except Exception as e:
        print(f"❌ Failed to apply migration: {e}")
        return False

def main():
    print("🚀 Database Migration Tool\n")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        pending = get_pending_migrations()
        
        if not pending:
            print("\n✅ All migrations are already applied!")
            return
        
        print(f"\n⏳ Applying {len(pending)} pending migrations...\n")
        
        for tag, migration_file in pending:
            if not apply_migration(conn, cursor, migration_file):
                print(f"\n❌ Failed at migration: {tag}")
                cursor.close()
                conn.close()
                sys.exit(1)
        
        print("\n✅ All migrations applied successfully!")
        
        # Verify by listing tables
        cursor.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' ORDER BY table_name
        """)
        tables = cursor.fetchall()
        print(f"\n📊 Database now contains {len(tables)} tables:")
        for table in tables:
            print(f"   - {table[0]}")
        
    except Exception as e:
        print(f"\n❌ Error during migration: {e}")
        conn.rollback()
        sys.exit(1)
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    main()
