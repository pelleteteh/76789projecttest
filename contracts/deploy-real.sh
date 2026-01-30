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
echo "⏳ Checking balance..."
BALANCE=$(cast balance "$ADMIN_ADDRESS" --rpc-url "$RPC" --format ether 2>/dev/null || echo "0")
echo "Admin balance: $BALANCE ETH"

if (( $(echo "$BALANCE < 0.05" | bc -l) )); then
    echo "❌ Error: Insufficient balance. Need at least 0.05 ETH for deployment"
    exit 1
fi

echo ""

cd "$(dirname "$0")"

echo "📦 Compiling contracts..."
/home/codespace/.foundry/bin/forge build --quiet 2>/dev/null || {
    echo "❌ Compilation failed"
    exit 1
}
echo "✅ Contracts compiled"
echo ""

# Get compiled bytecodes and ABIs
POINTS_BYTECODE=$(jq -r '.bytecode.object' artifacts/BantahPoints.sol/BantahPoints.json)
POINTS_ABI=$(jq '.abi' artifacts/BantahPoints.sol/BantahPoints.json)

FACTORY_BYTECODE=$(jq -r '.bytecode.object' artifacts/ChallengeFactory.sol/ChallengeFactory.json)
FACTORY_ABI=$(jq '.abi' artifacts/ChallengeFactory.sol/ChallengeFactory.json)

ESCROW_BYTECODE=$(jq -r '.bytecode.object' artifacts/PointsEscrow.sol/PointsEscrow.json)
ESCROW_ABI=$(jq '.abi' artifacts/PointsEscrow.sol/PointsEscrow.json)

# Deploy BantahPoints
echo "📝 Deploying BantahPoints..."
POINTS_RESULT=$(cast send \
    --rpc-url "$RPC" \
    --private-key "$ADMIN_PRIVATE_KEY" \
    --create "$POINTS_BYTECODE" \
    2>&1)

POINTS_ADDRESS=$(echo "$POINTS_RESULT" | grep -oP '(?<=Deployed to: )0x[a-fA-F0-9]{40}' || echo "")

if [ -z "$POINTS_ADDRESS" ]; then
    echo "Attempting to extract from transaction..."
    TX_HASH=$(echo "$POINTS_RESULT" | grep -oP '(?<=transactionHash)[": ]+\K0x[a-fA-F0-9]{64}' | head -1)
    if [ ! -z "$TX_HASH" ]; then
        echo "Transaction: $TX_HASH"
        sleep 3
        POINTS_ADDRESS=$(cast receipt "$TX_HASH" --rpc-url "$RPC" | grep -oP '(?<=contractAddress: )0x[a-fA-F0-9]{40}' || echo "")
    fi
fi

if [ -z "$POINTS_ADDRESS" ]; then
    echo "❌ Failed to deploy BantahPoints"
    echo "Response: $POINTS_RESULT"
    exit 1
fi

echo "✅ BantahPoints deployed to: $POINTS_ADDRESS"
sleep 2

# Deploy ChallengeFactory with encoded constructor args
echo "📝 Deploying ChallengeFactory..."
# Encode constructor args: address _pointsToken, address _admin
FACTORY_ARGS=$(cast abi-encode \
    "constructor(address,address)" \
    "$POINTS_ADDRESS" \
    "$ADMIN_ADDRESS")

FACTORY_CREATE_BYTECODE="$FACTORY_BYTECODE$FACTORY_ARGS"

FACTORY_RESULT=$(cast send \
    --rpc-url "$RPC" \
    --private-key "$ADMIN_PRIVATE_KEY" \
    --create "$FACTORY_CREATE_BYTECODE" \
    2>&1)

FACTORY_ADDRESS=$(echo "$FACTORY_RESULT" | grep -oP '(?<=Deployed to: )0x[a-fA-F0-9]{40}' || echo "")

if [ -z "$FACTORY_ADDRESS" ]; then
    TX_HASH=$(echo "$FACTORY_RESULT" | grep -oP '(?<=transactionHash)[": ]+\K0x[a-fA-F0-9]{64}' | head -1)
    if [ ! -z "$TX_HASH" ]; then
        sleep 3
        FACTORY_ADDRESS=$(cast receipt "$TX_HASH" --rpc-url "$RPC" | grep -oP '(?<=contractAddress: )0x[a-fA-F0-9]{40}' || echo "")
    fi
fi

if [ -z "$FACTORY_ADDRESS" ]; then
    echo "❌ Failed to deploy ChallengeFactory"
    echo "Response: $FACTORY_RESULT"
    exit 1
fi

echo "✅ ChallengeFactory deployed to: $FACTORY_ADDRESS"
sleep 2

# Deploy PointsEscrow with encoded constructor args
echo "📝 Deploying PointsEscrow..."
# Encode constructor args: address _pointsToken, address _challengeFactory
ESCROW_ARGS=$(cast abi-encode \
    "constructor(address,address)" \
    "$POINTS_ADDRESS" \
    "$FACTORY_ADDRESS")

ESCROW_CREATE_BYTECODE="$ESCROW_BYTECODE$ESCROW_ARGS"

ESCROW_RESULT=$(cast send \
    --rpc-url "$RPC" \
    --private-key "$ADMIN_PRIVATE_KEY" \
    --create "$ESCROW_CREATE_BYTECODE" \
    2>&1)

ESCROW_ADDRESS=$(echo "$ESCROW_RESULT" | grep -oP '(?<=Deployed to: )0x[a-fA-F0-9]{40}' || echo "")

if [ -z "$ESCROW_ADDRESS" ]; then
    TX_HASH=$(echo "$ESCROW_RESULT" | grep -oP '(?<=transactionHash)[": ]+\K0x[a-fA-F0-9]{64}' | head -1)
    if [ ! -z "$TX_HASH" ]; then
        sleep 3
        ESCROW_ADDRESS=$(cast receipt "$TX_HASH" --rpc-url "$RPC" | grep -oP '(?<=contractAddress: )0x[a-fA-F0-9]{40}' || echo "")
    fi
fi

if [ -z "$ESCROW_ADDRESS" ]; then
    echo "❌ Failed to deploy PointsEscrow"
    echo "Response: $ESCROW_RESULT"
    exit 1
fi

echo "✅ PointsEscrow deployed to: $ESCROW_ADDRESS"
sleep 2

# Call setPointsManager on BantahPoints
echo "📝 Setting PointsManager to ChallengeFactory..."
SET_MANAGER=$(cast encode-function-signature "setPointsManager(address)")
SET_MANAGER_ARGS=$(cast abi-encode "setPointsManager(address)" "$FACTORY_ADDRESS")
FULL_CALLDATA="$SET_MANAGER$SET_MANAGER_ARGS"

cast send \
    --rpc-url "$RPC" \
    --private-key "$ADMIN_PRIVATE_KEY" \
    "$POINTS_ADDRESS" \
    "$FULL_CALLDATA" \
    > /dev/null 2>&1 || echo "⚠️  setPointsManager call may have failed, continuing..."

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
    sed -i '/^CONTRACT_POINTS_ADDRESS=/d' "$ENV_FILE" 2>/dev/null || true
    sed -i '/^CONTRACT_FACTORY_ADDRESS=/d' "$ENV_FILE" 2>/dev/null || true
    sed -i '/^CONTRACT_ESCROW_ADDRESS=/d' "$ENV_FILE" 2>/dev/null || true
    
    # Add new addresses
    echo "" >> "$ENV_FILE"
    echo "# Real deployed contract addresses on Base Testnet Sepolia" >> "$ENV_FILE"
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
