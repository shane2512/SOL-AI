const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🚀 Deploying Incentive System Contracts...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "STT\n");

  // Get existing contract addresses
  const REPUTATION_SYSTEM_ADDRESS = process.env.REPUTATION_SYSTEM_ADDRESS;
  const SOCIAL_POSTS_ADDRESS = process.env.SOCIAL_POSTS_ADDRESS;
  
  if (!REPUTATION_SYSTEM_ADDRESS || !SOCIAL_POSTS_ADDRESS) {
    throw new Error("❌ Required contract addresses not found in .env");
  }

  console.log("📋 Using existing contracts:");
  console.log("   ReputationSystem:", REPUTATION_SYSTEM_ADDRESS);
  console.log("   SocialPosts:", SOCIAL_POSTS_ADDRESS);
  console.log("");

  // Deploy SOLToken
  console.log("📦 Deploying SOLToken...");
  const SOLToken = await ethers.getContractFactory("SOLToken");
  const solToken = await SOLToken.deploy();
  await solToken.waitForDeployment();
  const solTokenAddress = await solToken.getAddress();
  console.log("✅ SOLToken deployed to:", solTokenAddress);
  console.log("");

  // Deploy IncentiveSystem
  console.log("📦 Deploying IncentiveSystem...");
  const IncentiveSystem = await ethers.getContractFactory("IncentiveSystem");
  const incentiveSystem = await IncentiveSystem.deploy(
    solTokenAddress,
    REPUTATION_SYSTEM_ADDRESS,
    SOCIAL_POSTS_ADDRESS
  );
  await incentiveSystem.waitForDeployment();
  const incentiveSystemAddress = await incentiveSystem.getAddress();
  console.log("✅ IncentiveSystem deployed to:", incentiveSystemAddress);
  console.log("");

  // Transfer SOLToken ownership to IncentiveSystem so it can mint rewards
  console.log("🔄 Transferring SOLToken ownership to IncentiveSystem...");
  const transferTx = await solToken.transferOwnership(incentiveSystemAddress);
  await transferTx.wait();
  console.log("✅ Ownership transferred!");
  console.log("");

  // Summary
  console.log("🎉 Deployment Complete!\n");
  console.log("📋 Contract Addresses:");
  console.log("=".repeat(60));
  console.log("SOLToken:        ", solTokenAddress);
  console.log("IncentiveSystem: ", incentiveSystemAddress);
  console.log("=".repeat(60));
  console.log("");

  // Update .env instructions
  console.log("📝 Update your .env files:\n");
  console.log("For contracts/.env:");
  console.log(`SOL_TOKEN_ADDRESS=${solTokenAddress}`);
  console.log(`INCENTIVE_SYSTEM_ADDRESS=${incentiveSystemAddress}`);
  console.log("");
  
  console.log("For app/.env.local:");
  console.log(`NEXT_PUBLIC_SOL_TOKEN_ADDRESS=${solTokenAddress}`);
  console.log(`NEXT_PUBLIC_INCENTIVE_SYSTEM_ADDRESS=${incentiveSystemAddress}`);
  console.log("");
  
  console.log("For agent/.env:");
  console.log(`SOL_TOKEN_ADDRESS=${solTokenAddress}`);
  console.log(`INCENTIVE_SYSTEM_ADDRESS=${incentiveSystemAddress}`);
  console.log("");

  // Copy ABIs
  console.log("📄 Copying ABIs to frontend...");
  const fs = require('fs');
  const path = require('path');
  
  const artifactsDir = path.join(__dirname, 'artifacts', 'contracts');
  const abiDir = path.join(__dirname, '..', 'app', 'contracts', 'abis');
  
  const solTokenArtifact = path.join(artifactsDir, 'IncentiveSystem.sol', 'SOLToken.json');
  const solTokenDest = path.join(abiDir, 'SOLToken.json');
  if (fs.existsSync(solTokenArtifact)) {
    fs.copyFileSync(solTokenArtifact, solTokenDest);
    console.log("✅ SOLToken ABI copied");
  }
  
  const incentiveArtifact = path.join(artifactsDir, 'IncentiveSystem.sol', 'IncentiveSystem.json');
  const incentiveDest = path.join(abiDir, 'IncentiveSystem.json');
  if (fs.existsSync(incentiveArtifact)) {
    fs.copyFileSync(incentiveArtifact, incentiveDest);
    console.log("✅ IncentiveSystem ABI copied");
  }
  
  console.log("");
  console.log("✨ Token rewards system ready!");
  console.log("");
  console.log("🎮 How to earn SOLAI tokens:");
  console.log("1. Create safe posts (not flagged by AI)");
  console.log("2. Open Reputation Dashboard");
  console.log("3. Click 'Claim Rewards'");
  console.log("4. Approve transaction");
  console.log("5. Receive SOLAI tokens!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
