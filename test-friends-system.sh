#!/bin/bash

# Friends System End-to-End Test Script
# Tests the complete friend request flow

echo "======================================"
echo "Friends System End-to-End Test"
echo "======================================"
echo ""

# Test Configuration
API_BASE_URL=${API_BASE_URL:-"http://localhost:3000"}
USER1_TOKEN=${USER1_TOKEN:-""}
USER2_TOKEN=${USER2_TOKEN:-""}
USER1_ID=${USER1_ID:-""}
USER2_ID=${USER2_ID:-""}

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper function to print colored output
print_test() {
  echo -e "${BLUE}→ $1${NC}"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_info() {
  echo -e "${YELLOW}ℹ $1${NC}"
}

# Check prerequisites
print_test "Checking prerequisites..."
if [ -z "$USER1_TOKEN" ] || [ -z "$USER2_TOKEN" ]; then
  print_error "Missing user tokens. Please set USER1_TOKEN and USER2_TOKEN environment variables."
  echo "Example:"
  echo "  export USER1_TOKEN='your-token-here'"
  echo "  export USER2_TOKEN='another-token-here'"
  exit 1
fi

if [ -z "$USER1_ID" ] || [ -z "$USER2_ID" ]; then
  print_error "Missing user IDs. Please set USER1_ID and USER2_ID environment variables."
  exit 1
fi

print_success "Tokens and user IDs are set"
echo ""

# Test 1: Send Friend Request
print_test "Test 1: Sending friend request from User1 to User2..."
FRIEND_REQUEST_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/friends/request" \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"targetUserId\": \"$USER2_ID\"}")

echo "$FRIEND_REQUEST_RESPONSE" | grep -q "error" && print_error "Friend request failed" || print_success "Friend request sent"
echo "Response: $FRIEND_REQUEST_RESPONSE"
echo ""

# Test 2: Get pending requests for User2
print_test "Test 2: Getting pending requests for User2..."
PENDING_REQUESTS=$(curl -s -X GET "$API_BASE_URL/api/friends/requests" \
  -H "Authorization: Bearer $USER2_TOKEN" \
  -H "Content-Type: application/json")

REQUEST_ID=$(echo "$PENDING_REQUESTS" | grep -oP '"id":"\K[^"]+' | head -1)

if [ -z "$REQUEST_ID" ]; then
  print_error "No pending requests found"
else
  print_success "Found pending request: $REQUEST_ID"
fi
echo "Response: $PENDING_REQUESTS"
echo ""

# Test 3: Accept Friend Request
if [ -n "$REQUEST_ID" ]; then
  print_test "Test 3: User2 accepting friend request..."
  ACCEPT_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/friends/accept/$REQUEST_ID" \
    -H "Authorization: Bearer $USER2_TOKEN" \
    -H "Content-Type: application/json")

  echo "$ACCEPT_RESPONSE" | grep -q "error" && print_error "Accept failed" || print_success "Friend request accepted"
  echo "Response: $ACCEPT_RESPONSE"
  echo ""

  # Test 4: Verify Friends List
  print_test "Test 4: Verifying User1's friends list includes User2..."
  FRIENDS_LIST=$(curl -s -X GET "$API_BASE_URL/api/friends" \
    -H "Authorization: Bearer $USER1_TOKEN" \
    -H "Content-Type: application/json")

  echo "$FRIENDS_LIST" | grep -q "$USER2_ID" && print_success "User2 found in User1's friends list" || print_error "User2 not in friends list"
  echo "Response: $FRIENDS_LIST"
  echo ""

  # Test 5: Check Friend Status
  print_test "Test 5: Checking friend status..."
  STATUS_RESPONSE=$(curl -s -X GET "$API_BASE_URL/api/friends/status/$USER2_ID" \
    -H "Authorization: Bearer $USER1_TOKEN" \
    -H "Content-Type: application/json")

  echo "$STATUS_RESPONSE" | grep -q "true" && print_success "Friendship status confirmed" || print_error "Friendship status check failed"
  echo "Response: $STATUS_RESPONSE"
fi

echo ""
echo -e "${GREEN}======================================"
echo "Tests Complete!"
echo "======================================${NC}"
echo ""
echo "Notes:"
echo "- Check Pusher for IN_APP notifications"
echo "- Check Firebase for PUSH notifications"
echo "- Verify buttons in ProfileCard show correct states"
echo "- Test from UI: /friends and /leaderboard"
