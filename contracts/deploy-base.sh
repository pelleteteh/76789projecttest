#!/bin/bash
set -e

# Base Testnet Sepolia settings
RPC="https://sepolia.base.org"
CHAIN_ID=84532

# Get deployment vars
ADMIN_PRIVATE_KEY=${ADMIN_PRIVATE_KEY:-"0x2dfe33ae9c4eecd9c349dfc9d6f15d0ba54dc2a68fce8d8414b058ab038d1fc2"}
ADMIN_ADDRESS=$(cast wallet address "$ADMIN_PRIVATE_KEY")

echo "🚀 Deploying Bantah Smart Contracts to Base Testnet Sepolia"
echo "Admin Address: $ADMIN_ADDRESS"
echo "RPC: $RPC"
echo ""

# Check balance
BALANCE=$(cast balance "$ADMIN_ADDRESS" --rpc-url "$RPC" --format ether)
echo "Admin balance: $BALANCE ETH"
echo ""

if (( $(echo "$BALANCE < 0.01" | bc -l) )); then
    echo "⚠️  Warning: Low balance. Ensure you have enough ETH for gas."
fi

echo "📦 Compiling contracts..."
cd "$(dirname "$0")"
/home/codespace/.foundry/bin/forge build --quiet || {
    echo "❌ Compilation failed"
    exit 1
}

echo "✅ Compilation successful"
echo ""

# Deploy BantahPoints
echo "📝 Deploying BantahPoints..."
POINTS_TX=$(/home/codespace/.foundry/bin/forge create \
    src/BantahPoints.sol:BantahPoints \
    --rpc-url "$RPC" \
    --private-key "$ADMIN_PRIVATE_KEY" \
    --gas-price 2000000000 \
    --chain-id "$CHAIN_ID" \
    --verify \
    --verifier-url "https://api-sepolia.basescan.org/api" \
    2>&1 | grep "Deployed to:" | awk '{print $NF}')

if [ -z "$POINTS_TX" ]; then
    echo "❌ Failed to extract BantahPoints address"
    exit 1
fi

POINTS_ADDRESS=$POINTS_TX
echo "✅ BantahPoints deployed to: $POINTS_ADDRESS"

# Wait a bit for confirmation
sleep 2

# Deploy ChallengeFactory
echo "📝 Deploying ChallengeFactory..."
FACTORY_TX=$(/home/codespace/.foundry/bin/forge create \
    src/ChallengeFactory.sol:ChallengeFactory \
    --rpc-url "$RPC" \
    --private-key "$ADMIN_PRIVATE_KEY" \
    --constructor-args "$POINTS_ADDRESS" "$ADMIN_ADDRESS" \
    --gas-price 2000000000 \
    --chain-id "$CHAIN_ID" \
    --verify \
    --verifier-url "https://api-sepolia.basescan.org/api" \
    2>&1 | grep "Deployed to:" | awk '{print $NF}')

if [ -z "$FACTORY_TX" ]; then
    echo "❌ Failed to extract ChallengeFactory address"
    exit 1
fi

FACTORY_ADDRESS=$FACTORY_TX
echo "✅ ChallengeFactory deployed to: $FACTORY_ADDRESS"

# Wait a bit for confirmation
sleep 2

# Deploy PointsEscrow
echo "📝 Deploying PointsEscrow..."
ESCROW_TX=$(/home/codespace/.foundry/bin/forge create \
    src/PointsEscrow.sol:PointsEscrow \
    --rpc-url "$RPC" \
    --private-key "$ADMIN_PRIVATE_KEY" \
    --constructor-args "$POINTS_ADDRESS" "$FACTORY_ADDRESS" \
    --gas-price 2000000000 \
    --chain-id "$CHAIN_ID" \
    --verify \
    --verifier-url "https://api-sepolia.basescan.org/api" \
    2>&1 | grep "Deployed to:" | awk '{print $NF}')

if [ -z "$ESCROW_TX" ]; then
    echo "❌ Failed to extract PointsEscrow address"
    exit 1
fi

ESCROW_ADDRESS=$ESCROW_TX
echo "✅ PointsEscrow deployed to: $ESCROW_ADDRESS"

echo ""
echo "🎉 All contracts deployed successfully!"
echo ""
echo "Contract Addresses:"
echo "==================="
echo "BantahPoints:       $POINTS_ADDRESS"
echo "ChallengeFactory:   $FACTORY_ADDRESS"
echo "PointsEscrow:       $ESCROW_ADDRESS"
echo ""

# Update .env.local with addresses
ENV_FILE="/workspaces/try1238765/.env.local"
if [ -f "$ENV_FILE" ]; then
    echo "📝 Updating .env.local..."
    
    # Remove old addresses if they exist
    sed -i '/^CONTRACT_POINTS_ADDRESS=/d' "$ENV_FILE"
    sed -i '/^CONTRACT_FACTORY_ADDRESS=/d' "$ENV_FILE"
    sed -i '/^CONTRACT_ESCROW_ADDRESS=/d' "$ENV_FILE"
    
    # Add new addresses
    echo "" >> "$ENV_FILE"
    echo "# Deployed contract addresses" >> "$ENV_FILE"
    echo "CONTRACT_POINTS_ADDRESS=$POINTS_ADDRESS" >> "$ENV_FILE"
    echo "CONTRACT_FACTORY_ADDRESS=$FACTORY_ADDRESS" >> "$ENV_FILE"
    echo "CONTRACT_ESCROW_ADDRESS=$ESCROW_ADDRESS" >> "$ENV_FILE"
    
    echo "✅ .env.local updated"
else
    echo "⚠️  .env.local not found"
fi

echo ""
echo "📊 BaseScan Links:"
echo "==================="
echo "BantahPoints:     https://sepolia.basescan.org/address/$POINTS_ADDRESS"
echo "ChallengeFactory: https://sepolia.basescan.org/address/$FACTORY_ADDRESS"
echo "PointsEscrow:     https://sepolia.basescan.org/address/$ESCROW_ADDRESS"
echo ""
echo "✨ Deployment complete!"
