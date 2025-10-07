const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying Enhanced SOL AI Contracts...");
  console.log("=" * 50);

  // Get deployer
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  
  console.log("📋 Deployment Info:");
  console.log(`  Deployer: ${deployer.address}`);
  console.log(`  Balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`  Network: ${(await ethers.provider.getNetwork()).name}`);
  console.log(`  Chain ID: ${(await ethers.provider.getNetwork()).chainId}`);
  console.log("");

  const deployedContracts = {};

  try {
    // 1. Deploy SocialPosts first (needed by other contracts)
    console.log("1️⃣ Deploying SocialPosts...");
    const SocialPosts = await ethers.getContractFactory("SocialPosts");
    const socialPosts = await SocialPosts.deploy(deployer.address); // temporary moderator
    await socialPosts.waitForDeployment();
    const socialPostsAddr = await socialPosts.getAddress();
    deployedContracts.SocialPosts = socialPostsAddr;
    console.log(`   ✅ SocialPosts: ${socialPostsAddr}`);

    // 2. Deploy Moderator
    console.log("2️⃣ Deploying Moderator...");
    const Moderator = await ethers.getContractFactory("Moderator");
    const moderator = await Moderator.deploy(socialPostsAddr, deployer.address);
    await moderator.waitForDeployment();
    const moderatorAddr = await moderator.getAddress();
    deployedContracts.Moderator = moderatorAddr;
    console.log(`   ✅ Moderator: ${moderatorAddr}`);

    // Update SocialPosts moderator
    console.log("   🔧 Setting moderator in SocialPosts...");
    await socialPosts.setModerator(moderatorAddr);
    console.log("   ✅ Moderator updated in SocialPosts");

    // 3. Deploy ReputationSystem
    console.log("3️⃣ Deploying ReputationSystem...");
    const ReputationSystem = await ethers.getContractFactory("ReputationSystem");
    const reputationSystem = await ReputationSystem.deploy(socialPostsAddr);
    await reputationSystem.waitForDeployment();
    const reputationAddr = await reputationSystem.getAddress();
    deployedContracts.ReputationSystem = reputationAddr;
    console.log(`   ✅ ReputationSystem: ${reputationAddr}`);

    // 4. Deploy ReputationSBT
    console.log("4️⃣ Deploying ReputationSBT...");
    const ReputationSBT = await ethers.getContractFactory("ReputationSBT");
    const reputationSBT = await ReputationSBT.deploy(reputationAddr);
    await reputationSBT.waitForDeployment();
    const sbtAddr = await reputationSBT.getAddress();
    deployedContracts.ReputationSBT = sbtAddr;
    console.log(`   ✅ ReputationSBT: ${sbtAddr}`);

    // 5. Deploy SOLToken
    console.log("5️⃣ Deploying SOLToken...");
    const SOLToken = await ethers.getContractFactory("SOLToken");
    const solToken = await SOLToken.deploy();
    await solToken.waitForDeployment();
    const tokenAddr = await solToken.getAddress();
    deployedContracts.SOLToken = tokenAddr;
    console.log(`   ✅ SOLToken: ${tokenAddr}`);

    // 6. Deploy IncentiveSystem
    console.log("6️⃣ Deploying IncentiveSystem...");
    const IncentiveSystem = await ethers.getContractFactory("IncentiveSystem");
    const incentiveSystem = await IncentiveSystem.deploy(
      tokenAddr,
      reputationAddr,
      socialPostsAddr
    );
    await incentiveSystem.waitForDeployment();
    const incentiveAddr = await incentiveSystem.getAddress();
    deployedContracts.IncentiveSystem = incentiveAddr;
    console.log(`   ✅ IncentiveSystem: ${incentiveAddr}`);

    // Transfer SOLToken ownership to IncentiveSystem
    console.log("   🔧 Transferring SOLToken ownership...");
    await solToken.transferOwnership(incentiveAddr);
    console.log("   ✅ SOLToken ownership transferred to IncentiveSystem");

    // 7. Deploy GovernanceSystem
    console.log("7️⃣ Deploying GovernanceSystem...");
    const GovernanceSystem = await ethers.getContractFactory("GovernanceSystem");
    const governanceSystem = await GovernanceSystem.deploy(
      reputationAddr,
      socialPostsAddr
    );
    await governanceSystem.waitForDeployment();
    const governanceAddr = await governanceSystem.getAddress();
    deployedContracts.GovernanceSystem = governanceAddr;
    console.log(`   ✅ GovernanceSystem: ${governanceAddr}`);

    // Save deployment info
    const deploymentInfo = {
      ...deployedContracts,
      deployer: deployer.address,
      network: (await ethers.provider.getNetwork()).name,
      chainId: Number((await ethers.provider.getNetwork()).chainId),
      timestamp: new Date().toISOString(),
      gasUsed: "Estimated total gas usage logged above"
    };

    // Write to deployment file
    const deploymentPath = path.join(__dirname, "deployments", "latest.json");
    fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

    console.log("\n🎉 DEPLOYMENT COMPLETE!");
    console.log("=" * 50);
    console.log("📋 Contract Addresses:");
    Object.entries(deployedContracts).forEach(([name, address]) => {
      console.log(`   ${name}: ${address}`);
    });
    
    console.log(`\n💾 Deployment info saved to: ${deploymentPath}`);
    
    // Generate .env updates
    console.log("\n📝 Add these to your .env files:");
    console.log("=" * 30);
    console.log(`SOCIAL_POSTS_ADDRESS=${deployedContracts.SocialPosts}`);
    console.log(`MODERATOR_ADDRESS=${deployedContracts.Moderator}`);
    console.log(`REPUTATION_SYSTEM_ADDRESS=${deployedContracts.ReputationSystem}`);
    console.log(`REPUTATION_SBT_ADDRESS=${deployedContracts.ReputationSBT}`);
    console.log(`SOL_TOKEN_ADDRESS=${deployedContracts.SOLToken}`);
    console.log(`INCENTIVE_SYSTEM_ADDRESS=${deployedContracts.IncentiveSystem}`);
    console.log(`GOVERNANCE_SYSTEM_ADDRESS=${deployedContracts.GovernanceSystem}`);

    return deployedContracts;

  } catch (error) {
    console.error("\n❌ DEPLOYMENT FAILED!");
    console.error("Error:", error.message);
    if (error.transaction) {
      console.error("Transaction hash:", error.transaction.hash);
    }
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
