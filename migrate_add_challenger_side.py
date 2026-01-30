#!/usr/bin/env python3
"""
Database migration script to add challenger_side field to challenges table
for P2P challenge YES/NO side selection
"""
import os
import psycopg2
from psycopg2.extras import RealDictCursor
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_db_connection():
    """Get database connection from environment"""
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        print("❌ DATABASE_URL not found in environment")
        sys.exit(1)

    try:
        conn = psycopg2.connect(db_url)
        print("✅ Connected to database")
        return conn
    except Exception as e:
        print(f"❌ Failed to connect to database: {e}")
        sys.exit(1)

def add_challenger_side_column():
    """Add challenger_side column to challenges table"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Check if column already exists
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'challenges' AND column_name = 'challenger_side'
        """)

        if cursor.fetchone():
            print("⚠️  challenger_side column already exists")
            return

        # Add the column
        print("📝 Adding challenger_side column to challenges table...")
        cursor.execute("""
            ALTER TABLE challenges
            ADD COLUMN challenger_side VARCHAR(3) CHECK (challenger_side IN ('YES', 'NO'))
        """)

        # Create index for performance
        print("📝 Creating index on challenger_side...")
        cursor.execute("""
            CREATE INDEX idx_challenges_challenger_side ON challenges(challenger_side)
        """)

        conn.commit()
        print("✅ Successfully added challenger_side column")

        # Show current table structure
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'challenges'
            ORDER BY ordinal_position
        """)

        columns = cursor.fetchall()
        print("\n📋 Current challenges table structure:")
        for col in columns:
            print(f"  - {col['column_name']}: {col['data_type']} ({'NOT NULL' if col['is_nullable'] == 'NO' else 'NULL'})")

    except Exception as e:
        print(f"❌ Error during migration: {e}")
        conn.rollback()
        sys.exit(1)
    finally:
        cursor.close()
        conn.close()

def verify_migration():
    """Verify the migration was successful"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # Check a few sample challenges
        cursor.execute("""
            SELECT id, title, challenger, challenged, challenger_side, admin_created
            FROM challenges
            LIMIT 5
        """)

        challenges = cursor.fetchall()
        print(f"\n🔍 Sample challenges ({len(challenges)} found):")
        for challenge in challenges:
            side_info = f" [Side: {challenge['challenger_side']}]" if challenge['challenger_side'] else " [No side set]"
            admin_info = " [ADMIN]" if challenge['admin_created'] else " [P2P]"
            print(f"  ID {challenge['id']}: {challenge['title']}{side_info}{admin_info}")

    except Exception as e:
        print(f"❌ Error verifying migration: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    print("🚀 Starting database migration: Add challenger_side to challenges table")
    print("=" * 60)

    add_challenger_side_column()
    verify_migration()

    print("\n✅ Migration completed successfully!")
    print("📝 Next steps:")
    print("  1. Update the shared/schema.ts to include challenger_side field")
    print("  2. Update frontend to send side selection in challenge creation")
    print("  3. Update API to accept and store challenger_side")</content>
<parameter name="filePath">/workspaces/vbht567/migrate_add_challenger_side.py