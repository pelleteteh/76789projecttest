#!/usr/bin/env python3
import os
import sys
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor

load_dotenv()
db_url = os.getenv('DATABASE_URL')

if not db_url:
    print("❌ DATABASE_URL not set")
    sys.exit(1)

try:
    # Parse connection string
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    print("\n🔄 Step 1: Migrating amount columns to NUMERIC...\n")
    
    migrations = [
        'ALTER TABLE challenges ALTER COLUMN amount TYPE numeric(38, 18)',
        'ALTER TABLE admin_challenges ALTER COLUMN amount TYPE numeric(38, 18)',
        'ALTER TABLE admin_challenge_participants ALTER COLUMN amount TYPE numeric(38, 18)',
        'ALTER TABLE payouts ALTER COLUMN amount TYPE numeric(38, 18)',
        'ALTER TABLE payout_records ALTER COLUMN amount TYPE numeric(38, 18)',
    ]
    
    for migration in migrations:
        try:
            cursor.execute(migration)
            conn.commit()
            print(f"✅ {migration[:60]}...")
        except psycopg2.Error as e:
            if 'already' in str(e).lower():
                print(f"⏭️  {migration[:60]}... (already done)")
            else:
                print(f"⚠️  {migration[:60]}...")
            conn.rollback()
    
    print("\n🔄 Step 2: Updating challenge amounts from stakeAmountWei...\n")
    
    # Get challenges with amount = 0
    cursor.execute("""
        SELECT id, title, stake_amount_wei, payment_token_address, amount
        FROM challenges
        WHERE amount = 0 AND stake_amount_wei IS NOT NULL AND admin_created = false
        ORDER BY id
    """)
    
    challenges = cursor.fetchall()
    print(f"📊 Found {len(challenges)} P2P challenges with amount = 0\n")
    
    updated = 0
    
    for row in challenges:
        challenge_id = row['id']
        title = row['title']
        stake_amount_wei = int(row['stake_amount_wei'])
        token_address = row['payment_token_address']
        
        # Check if ETH (zero address)
        is_eth = token_address == '0x0000000000000000000000000000000000000000'
        
        if is_eth:
            # ETH: amount = stakeAmountWei * 2 (total pool)
            calculated_amount = stake_amount_wei * 2
        else:
            # USDC/USDT: amount = stakeAmountWei * 2
            calculated_amount = stake_amount_wei * 2
        
        # Convert to decimal for display
        if is_eth:
            display_amount = calculated_amount / 1e18
        else:
            display_amount = calculated_amount / 1e6
        
        print(f"ID {challenge_id}: \"{title}\"")
        print(f"  stakeAmountWei: {stake_amount_wei}")
        print(f"  Calculated amount: {calculated_amount}")
        print(f"  Display: {display_amount}")
        
        # Update in database
        try:
            cursor.execute("""
                UPDATE challenges
                SET amount = %s
                WHERE id = %s
            """, (calculated_amount, challenge_id))
            conn.commit()
            print(f"  ✅ Updated\n")
            updated += 1
        except psycopg2.Error as e:
            print(f"  ❌ Error: {e}\n")
            conn.rollback()
    
    print(f"\n✅ Updated {updated}/{len(challenges)} challenges")
    
    # Verify updates
    print("\n📋 Verification - Updated challenges:\n")
    cursor.execute("""
        SELECT id, title, amount, stake_amount_wei, payment_token_address
        FROM challenges
        WHERE id IN (30, 31, 32, 33)
        ORDER BY id
    """)
    
    for row in cursor.fetchall():
        amount = float(row['amount']) if row['amount'] else 0
        is_eth = row['payment_token_address'] == '0x0000000000000000000000000000000000000000'
        
        if is_eth:
            display = amount / 1e18
            currency = 'ETH'
        else:
            display = amount / 1e6
            currency = 'USDC/USDT'
        
        print(f"ID {row['id']}: \"{row['title']}\"")
        print(f"  Amount (wei): {row['amount']}")
        print(f"  Amount ({currency}): {display:.10f}")
        print()
    
    cursor.close()
    conn.close()
    print("✅ Migration and update complete!")

except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
