// Simple deployment for enhanced contracts
const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting Enhanced Contract Deployment...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");
  
  // Get existing contract addresses
  const SOCIAL_ADDR = "0xf88B9e01A9B350E05cD8971DdDF7fC2c73910352";
  const MODERATOR_ADDR = "0x7f37417F66eA2b322CDF145DFd0b45ff1794bf36";
  
  console.log("Using existing SocialPosts:", SOCIAL_ADDR);
  console.log("Using existing Moderator:", MODERATOR_ADDR);
  
  const deployedContracts = {
    SocialPosts: SOCIAL_ADDR,
    Moderator: MODERATOR_ADDR
  };
  
  try {
    // Deploy ReputationSystem
    console.log("\n3️⃣ Deploying ReputationSystem...");
    const ReputationSystem = await ethers.getContractFactory("ReputationSystem");
    const reputationSystem = await ReputationSystem.deploy(SOCIAL_ADDR);
    await reputationSystem.waitForDeployment();
    const reputationAddr = await reputationSystem.getAddress();
    deployedContracts.ReputationSystem = reputationAddr;
    console.log("✅ ReputationSystem:", reputationAddr);
    
    // Deploy ReputationSBT
    console.log("\n4️⃣ Deploying ReputationSBT...");
    const ReputationSBT = await ethers.getContractFactory("ReputationSBT");
    const reputationSBT = await ReputationSBT.deploy(reputationAddr);
    await reputationSBT.waitForDeployment();
    const sbtAddr = await reputationSBT.getAddress();
    deployedContracts.ReputationSBT = sbtAddr;
    console.log("✅ ReputationSBT:", sbtAddr);
    
    // Deploy SOLToken
    console.log("\n5️⃣ Deploying SOLToken...");
    const SOLToken = await ethers.getContractFactory("SOLToken");
    const solToken = await SOLToken.deploy();
    await solToken.waitForDeployment();
    const tokenAddr = await solToken.getAddress();
    deployedContracts.SOLToken = tokenAddr;
    console.log("✅ SOLToken:", tokenAddr);
    
    // Deploy IncentiveSystem
    console.log("\n6️⃣ Deploying IncentiveSystem...");
    const IncentiveSystem = await ethers.getContractFactory("IncentiveSystem");
    const incentiveSystem = await IncentiveSystem.deploy(
      tokenAddr,
      reputationAddr,
      SOCIAL_ADDR
    );
    await incentiveSystem.waitForDeployment();
    const incentiveAddr = await incentiveSystem.getAddress();
    deployedContracts.IncentiveSystem = incentiveAddr;
    console.log("✅ IncentiveSystem:", incentiveAddr);
    
    // Transfer SOLToken ownership
    console.log("\n🔧 Transferring SOLToken ownership...");
    await solToken.transferOwnership(incentiveAddr);
    console.log("✅ SOLToken ownership transferred");
    
    // Deploy GovernanceSystem
    console.log("\n7️⃣ Deploying GovernanceSystem...");
    const GovernanceSystem = await ethers.getContractFactory("GovernanceSystem");
    const governanceSystem = await GovernanceSystem.deploy(
      reputationAddr,
      SOCIAL_ADDR
    );
    await governanceSystem.waitForDeployment();
    const governanceAddr = await governanceSystem.getAddress();
    deployedContracts.GovernanceSystem = governanceAddr;
    console.log("✅ GovernanceSystem:", governanceAddr);
    
    console.log("\n🎉 DEPLOYMENT COMPLETE!");
    console.log("📋 All Contract Addresses:");
    Object.entries(deployedContracts).forEach(([name, address]) => {
      console.log(`   ${name}: ${address}`);
    });
    
    console.log("\n📝 .env Updates:");
    console.log(`SOCIAL_POSTS_ADDRESS=${deployedContracts.SocialPosts}`);
    console.log(`MODERATOR_ADDRESS=${deployedContracts.Moderator}`);
    console.log(`REPUTATION_SYSTEM_ADDRESS=${deployedContracts.ReputationSystem}`);
    console.log(`REPUTATION_SBT_ADDRESS=${deployedContracts.ReputationSBT}`);
    console.log(`SOL_TOKEN_ADDRESS=${deployedContracts.SOLToken}`);
    console.log(`INCENTIVE_SYSTEM_ADDRESS=${deployedContracts.IncentiveSystem}`);
    console.log(`GOVERNANCE_SYSTEM_ADDRESS=${deployedContracts.GovernanceSystem}`);
    
  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
