#!/bin/bash
# Diagnostic script to check why challenges aren't showing

echo "🔍 Checking Challenge Creation Flow..."
echo ""

# Get the latest challenges from database
echo "📊 Database Check:"
psql $DATABASE_URL -c "
  SELECT 
    id, 
    title, 
    status, 
    challenger, 
    created_at::text,
    creator_transaction_hash as tx
  FROM challenges 
  ORDER BY created_at DESC 
  LIMIT 5;
" 2>/dev/null

echo ""
echo "📊 Challenge Status Breakdown:"
psql $DATABASE_URL -c "
  SELECT 
    status, 
    COUNT(*) as count 
  FROM challenges 
  GROUP BY status 
  ORDER BY count DESC;
" 2>/dev/null

echo ""
echo "📊 What Will Be Displayed (status = 'open' OR 'active' OR 'pending' OR 'completed'):"
psql $DATABASE_URL -c "
  SELECT 
    id, 
    title, 
    status, 
    challenger
  FROM challenges 
  WHERE status IN ('open', 'active', 'pending', 'completed')
  ORDER BY created_at DESC 
  LIMIT 5;
" 2>/dev/null

echo ""
echo "⚠️ Challenges NOT Displayed (other statuses):"
psql $DATABASE_URL -c "
  SELECT 
    id, 
    title, 
    status, 
    challenger
  FROM challenges 
  WHERE status NOT IN ('open', 'active', 'pending', 'completed')
  ORDER BY created_at DESC 
  LIMIT 5;
" 2>/dev/null

echo ""
echo "✅ To debug further:"
echo "   1. Create a new challenge"
echo "   2. Check server logs: npm run dev 2>&1 | grep 'POST /api/challenges/create-p2p'"
echo "   3. Check API response: curl http://localhost:5000/api/challenges/debug/status"
echo "   4. Check if challenge appears in: curl http://localhost:5000/api/challenges/public"
