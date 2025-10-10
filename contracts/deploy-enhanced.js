// Simple deployment script for enhanced SOL AI contracts
// Run with: node deploy-enhanced.js

const { ethers } = require("ethers");
const fs = require("fs");
require("dotenv").config();

// Contract ABIs (you'll need to compile first to get these)
const contractSources = {
  SocialPosts: "./artifacts/contracts/SocialPosts.sol/SocialPosts.json",
  Moderator: "./artifacts/contracts/Moderator.sol/Moderator.json", 
  ReputationSystem: "./artifacts/contracts/ReputationSystem.sol/ReputationSystem.json",
  ReputationSBT: "./artifacts/contracts/ReputationSBT.sol/ReputationSBT.json",
  SOLToken: "./artifacts/contracts/IncentiveSystem.sol/SOLToken.json",
  IncentiveSystem: "./artifacts/contracts/IncentiveSystem.sol/IncentiveSystem.json",
  GovernanceSystem: "./artifacts/contracts/GovernanceSystem.sol/GovernanceSystem.json"
};

async function deploy() {
  console.log("🚀 Deploying Enhanced SOL AI Contracts...");
  
  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(process.env.SOMNIA_RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY_DEPLOYER, provider);
  
  console.log(`📋 Deployer: ${wallet.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(await provider.getBalance(wallet.address))} ETH`);
  
  const deployedContracts = {};
  
  try {
    // Load compiled contracts
    const contracts = {};
    for (const [name, path] of Object.entries(contractSources)) {
      if (fs.existsSync(path)) {
        const artifact = JSON.parse(fs.readFileSync(path, 'utf8'));
        contracts[name] = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
      } else {
        console.log(`⚠️ ${name} artifact not found at ${path}`);
      }
    }
    
    // Deploy contracts in order
    console.log("1️⃣ Deploying SocialPosts...");
    const socialPosts = await contracts.SocialPosts.deploy(wallet.address);
    await socialPosts.waitForDeployment();
    deployedContracts.SocialPosts = await socialPosts.getAddress();
    console.log(`   ✅ SocialPosts: ${deployedContracts.SocialPosts}`);
    
    console.log("2️⃣ Deploying Moderator...");
    const moderator = await contracts.Moderator.deploy(deployedContracts.SocialPosts, wallet.address);
    await moderator.waitForDeployment();
    deployedContracts.Moderator = await moderator.getAddress();
    console.log(`   ✅ Moderator: ${deployedContracts.Moderator}`);
    
    // Continue with other contracts...
    // (Add remaining deployments here)
    
    // Generate .env content
    console.log("\n📝 Add these to your .env files:");
    console.log("=" * 40);
    Object.entries(deployedContracts).forEach(([name, address]) => {
      const envName = name.replace(/([A-Z])/g, '_$1').toUpperCase().replace(/^_/, '') + '_ADDRESS';
      console.log(`${envName}=${address}`);
    });
    
  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
  }
}

if (require.main === module) {
  deploy().catch(console.error);
}

module.exports = { deploy };
