const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🚀 Deploying Reputation System Contracts to Somnia Testnet...\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  
  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "STT\n");

  if (balance === 0n) {
    throw new Error("❌ Deployer account has no balance. Please fund the account first.");
  }

  // Get existing contract addresses from .env
  const SOCIAL_POSTS_ADDRESS = process.env.SOCIAL_POSTS_ADDRESS;
  
  if (!SOCIAL_POSTS_ADDRESS) {
    throw new Error("❌ SOCIAL_POSTS_ADDRESS not found in .env file");
  }

  console.log("📋 Using existing contracts:");
  console.log("   SocialPosts:", SOCIAL_POSTS_ADDRESS);
  console.log("");

  // Deploy ReputationSystem
  console.log("📦 Deploying ReputationSystem...");
  const ReputationSystem = await ethers.getContractFactory("ReputationSystem");
  const reputationSystem = await ReputationSystem.deploy(SOCIAL_POSTS_ADDRESS);
  await reputationSystem.waitForDeployment();
  const reputationSystemAddress = await reputationSystem.getAddress();
  console.log("✅ ReputationSystem deployed to:", reputationSystemAddress);
  console.log("");

  // Deploy ReputationSBT
  console.log("📦 Deploying ReputationSBT...");
  const ReputationSBT = await ethers.getContractFactory("ReputationSBT");
  const reputationSBT = await ReputationSBT.deploy(reputationSystemAddress);
  await reputationSBT.waitForDeployment();
  const reputationSBTAddress = await reputationSBT.getAddress();
  console.log("✅ ReputationSBT deployed to:", reputationSBTAddress);
  console.log("");

  // Summary
  console.log("🎉 Deployment Complete!\n");
  console.log("📋 Contract Addresses:");
  console.log("=" .repeat(60));
  console.log("ReputationSystem:", reputationSystemAddress);
  console.log("ReputationSBT:   ", reputationSBTAddress);
  console.log("=" .repeat(60));
  console.log("");

  // Update .env instructions
  console.log("📝 Update your .env files with these addresses:\n");
  console.log("For contracts/.env:");
  console.log(`REPUTATION_SYSTEM_ADDRESS=${reputationSystemAddress}`);
  console.log(`REPUTATION_SBT_ADDRESS=${reputationSBTAddress}`);
  console.log("");
  
  console.log("For app/.env.local:");
  console.log(`NEXT_PUBLIC_REPUTATION_SYSTEM_ADDRESS=${reputationSystemAddress}`);
  console.log(`NEXT_PUBLIC_REPUTATION_SBT_ADDRESS=${reputationSBTAddress}`);
  console.log("");
  
  console.log("For agent/.env:");
  console.log(`REPUTATION_SYSTEM_ADDRESS=${reputationSystemAddress}`);
  console.log(`REPUTATION_SBT_ADDRESS=${reputationSBTAddress}`);
  console.log("");

  // Verification info
  console.log("🔍 To verify contracts on block explorer:");
  console.log(`npx hardhat verify --network somnia ${reputationSystemAddress} ${SOCIAL_POSTS_ADDRESS}`);
  console.log(`npx hardhat verify --network somnia ${reputationSBTAddress} ${reputationSystemAddress}`);
  console.log("");

  // Copy ABIs
  console.log("📄 Copying ABIs to frontend...");
  const fs = require('fs');
  const path = require('path');
  
  const artifactsDir = path.join(__dirname, 'artifacts', 'contracts');
  const abiDir = path.join(__dirname, '..', 'app', 'contracts', 'abis');
  
  // Ensure ABI directory exists
  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir, { recursive: true });
  }
  
  // Copy ReputationSystem ABI
  const repSystemArtifact = path.join(artifactsDir, 'ReputationSystem.sol', 'ReputationSystem.json');
  const repSystemDest = path.join(abiDir, 'ReputationSystem.json');
  if (fs.existsSync(repSystemArtifact)) {
    fs.copyFileSync(repSystemArtifact, repSystemDest);
    console.log("✅ ReputationSystem ABI copied");
  }
  
  // Copy ReputationSBT ABI
  const repSBTArtifact = path.join(artifactsDir, 'ReputationSBT.sol', 'ReputationSBT.json');
  const repSBTDest = path.join(abiDir, 'ReputationSBT.json');
  if (fs.existsSync(repSBTArtifact)) {
    fs.copyFileSync(repSBTArtifact, repSBTDest);
    console.log("✅ ReputationSBT ABI copied");
  }
  
  console.log("");
  console.log("✨ All done! Your reputation system is ready to use.");
  console.log("");
  console.log("🔄 Next steps:");
  console.log("1. Update .env files with the new addresses (see above)");
  console.log("2. Restart your frontend: cd app && npm run dev");
  console.log("3. Restart your agent: cd agent && python app.py");
  console.log("4. Test the reputation dashboard!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
