const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🔍 Verifying Contract Deployments on Somnia Testnet\n");

  const provider = new ethers.JsonRpcProvider(process.env.SOMNIA_RPC_URL);
  
  // Contract addresses from .env
  const contracts = {
    "SocialPosts (contracts/.env)": process.env.SOCIAL_POSTS_ADDRESS,
    "SocialPosts (app/.env.local)": "0x543D67754A05c60035f57DA9Dc7FA6685dCe6A8B",
    "Moderator": process.env.MODERATOR_ADDRESS,
    "ReputationSystem": process.env.REPUTATION_SYSTEM_ADDRESS,
    "ReputationSBT": process.env.REPUTATION_SBT_ADDRESS,
    "SOLToken": process.env.SOL_TOKEN_ADDRESS,
    "IncentiveSystem": process.env.INCENTIVE_SYSTEM_ADDRESS,
    "GovernanceSystem": process.env.GOVERNANCE_SYSTEM_ADDRESS
  };

  console.log("📋 Checking contract deployments...\n");

  for (const [name, address] of Object.entries(contracts)) {
    if (!address || address === "0x0000000000000000000000000000000000000000") {
      console.log(`❌ ${name}: Not configured`);
      continue;
    }

    try {
      const code = await provider.getCode(address);
      
      if (code === "0x" || code.length <= 2) {
        console.log(`❌ ${name}: ${address} - NO CODE (not deployed)`);
      } else {
        console.log(`✅ ${name}: ${address} - DEPLOYED (${code.length} bytes)`);
      }
    } catch (error) {
      console.log(`❌ ${name}: ${address} - ERROR: ${error.message}`);
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("\n🔍 Testing SocialPosts Contract Functions...\n");

  // Test both SocialPosts addresses
  const socialAddresses = [
    { name: "contracts/.env", address: process.env.SOCIAL_POSTS_ADDRESS },
    { name: "app/.env.local", address: "0x543D67754A05c60035f57DA9Dc7FA6685dCe6A8B" }
  ];

  for (const { name, address } of socialAddresses) {
    if (!address) continue;

    console.log(`\nTesting ${name}: ${address}`);
    console.log("-".repeat(70));

    try {
      const SocialPosts = await ethers.getContractAt("SocialPosts", address, provider);
      
      // Test basic functions
      const totalPosts = await SocialPosts.totalPosts();
      console.log(`✅ totalPosts(): ${totalPosts}`);

      // Test if it has the required functions for ReputationSystem
      try {
        const testAddress = "0x0000000000000000000000000000000000000001";
        const postCount = await SocialPosts.getUserPostCount(testAddress);
        console.log(`✅ getUserPostCount(): ${postCount} (function exists)`);
        
        const safeCount = await SocialPosts.getUserSafePostCount(testAddress);
        console.log(`✅ getUserSafePostCount(): ${safeCount} (function exists)`);
        
        const flaggedCount = await SocialPosts.getUserFlaggedPostCount(testAddress);
        console.log(`✅ getUserFlaggedPostCount(): ${flaggedCount} (function exists)`);
        
        console.log(`\n✅ This contract is COMPATIBLE with ReputationSystem!`);
      } catch (funcError) {
        console.log(`❌ Missing required functions: ${funcError.message}`);
        console.log(`⚠️  This contract is NOT compatible with ReputationSystem`);
      }
    } catch (error) {
      console.log(`❌ Cannot interact with contract: ${error.message}`);
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("\n📊 Summary and Recommendations:\n");

  // Determine which SocialPosts to use
  const contractsEnvAddress = process.env.SOCIAL_POSTS_ADDRESS;
  const appEnvAddress = "0x543D67754A05c60035f57DA9Dc7FA6685dCe6A8B";

  if (contractsEnvAddress !== appEnvAddress) {
    console.log("⚠️  ADDRESS MISMATCH DETECTED!");
    console.log(`   contracts/.env:  ${contractsEnvAddress}`);
    console.log(`   app/.env.local:  ${appEnvAddress}`);
    console.log(`   agent/.env:      ${appEnvAddress}`);
    console.log("");
    console.log("🔧 RECOMMENDED ACTION:");
    console.log("   1. Determine which SocialPosts contract is the correct one");
    console.log("   2. Update contracts/.env to match app/.env.local");
    console.log("   3. Redeploy ReputationSystem with correct SocialPosts address");
    console.log("");
  }

  // Check if ReputationSystem is deployed
  const repSystemAddress = process.env.REPUTATION_SYSTEM_ADDRESS;
  if (repSystemAddress) {
    try {
      const code = await provider.getCode(repSystemAddress);
      if (code !== "0x" && code.length > 2) {
        console.log("✅ ReputationSystem is deployed");
        console.log(`   Address: ${repSystemAddress}`);
        console.log("");
        console.log("🔧 TO FIX THE ISSUE:");
        console.log("   1. Update contracts/.env SOCIAL_POSTS_ADDRESS to match app/.env.local");
        console.log("   2. Run: npx hardhat run deploy-reputation.js --network somnia");
        console.log("   3. Update all .env files with new ReputationSystem address");
      } else {
        console.log("❌ ReputationSystem not deployed");
        console.log("");
        console.log("🚀 TO DEPLOY:");
        console.log("   1. Ensure contracts/.env has correct SOCIAL_POSTS_ADDRESS");
        console.log("   2. Run: npx hardhat run deploy-reputation.js --network somnia");
      }
    } catch (error) {
      console.log(`❌ Error checking ReputationSystem: ${error.message}`);
    }
  }

  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  });
