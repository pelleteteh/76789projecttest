#!/usr/bin/env node

/**
 * Mock Deployment - For Testing
 * Generates mock contract addresses for local testing
 * Real deployment would happen on Base Testnet Sepolia
 */

import * as fs from "fs";

// Generate realistic-looking contract addresses
function generateAddress() {
  return "0x" + Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join("");
}

const deploymentAddresses = {
  ChallengeFactory: generateAddress(),
  ChallengeEscrow: generateAddress(),
  Admin: "0xb843A2D0D4B9E628500d2E0f6f0382e063C14a95",
  Timestamp: new Date().toISOString(),
};

console.log("\n🚀 Bantah Smart Contracts - Mock Deployment");
console.log("📍 Network: Base Testnet Sepolia (84532)");
console.log("⚠️  NOTE: These are mock addresses for testing only");
console.log("📝 NOTE: BantahPoints are now managed off-chain\n");

// Update .env.local with the addresses
const envLocalPath = ".env.local";
let envContent = fs.readFileSync(envLocalPath, "utf-8");

// Replace contract addresses
envContent = envContent.replace(
  /CONTRACT_FACTORY_ADDRESS="[^"]*"/,
  `CONTRACT_FACTORY_ADDRESS="${deploymentAddresses.ChallengeFactory}"`
);
envContent = envContent.replace(
  /CONTRACT_ESCROW_ADDRESS="[^"]*"/,
  `CONTRACT_ESCROW_ADDRESS="${deploymentAddresses.ChallengeEscrow}"`
);

fs.writeFileSync(envLocalPath, envContent);

console.log("✅ Contract Addresses:");
console.log(`   ChallengeFactory: ${deploymentAddresses.ChallengeFactory}`);
console.log(`   ChallengeEscrow:  ${deploymentAddresses.ChallengeEscrow}\n`);

console.log("✅ Updated .env.local\n");
console.log("Next: Restart dev server with 'npm run dev'\n");
