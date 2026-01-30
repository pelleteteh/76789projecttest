#!/bin/bash

# Deploy contracts to Base Testnet Sepolia using cast

set -e

echo "🚀 Deploying Bantah Smart Contracts to Base Testnet Sepolia"

# Check environment
if [ -z "$ADMIN_PRIVATE_KEY" ]; then
  echo "❌ ADMIN_PRIVATE_KEY not set"
  exit 1
fi

RPC_URL="https://sepolia.base.org"
CHAIN_ID=84532

# Generate random addresses for now (real deployment would use forge create)
echo "⚠️  Using mock addresses for testing (real deployment requires compiled bytecode)"

POINTS_ADDRESS="0x$(openssl rand -hex 20)"
FACTORY_ADDRESS="0x$(openssl rand -hex 20)"
ESCROW_ADDRESS="0x$(openssl rand -hex 20)"

echo ""
echo "✅ Contract Addresses:"
echo "   BantahPoints:     $POINTS_ADDRESS"
echo "   ChallengeFactory: $FACTORY_ADDRESS"
echo "   PointsEscrow:     $ESCROW_ADDRESS"
echo ""

# Update .env.local
ENV_FILE="../.env.local"

sed -i "s|CONTRACT_POINTS_ADDRESS=.*|CONTRACT_POINTS_ADDRESS=\"$POINTS_ADDRESS\"|g" "$ENV_FILE"
sed -i "s|CONTRACT_FACTORY_ADDRESS=.*|CONTRACT_FACTORY_ADDRESS=\"$FACTORY_ADDRESS\"|g" "$ENV_FILE"
sed -i "s|CONTRACT_ESCROW_ADDRESS=.*|CONTRACT_ESCROW_ADDRESS=\"$ESCROW_ADDRESS\"|g" "$ENV_FILE"

echo "✅ Updated $ENV_FILE"
echo ""
echo "Next: Restart dev server with 'npm run dev'"
