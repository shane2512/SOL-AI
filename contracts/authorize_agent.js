const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("=".repeat(60));
  console.log("AUTHORIZE AGENT ON NEW MODERATOR CONTRACT");
  console.log("=".repeat(60));

  // Contract addresses from Render
  const MODERATOR_ADDRESS = "0x6F8234C0c0330193BaB7bc079AB74d109367C2ed";
  const AGENT_ADDRESS = "0xda4626FcE97748B7A78b613c754419c5e3FDAdCA";

  console.log(`\nModerator Contract: ${MODERATOR_ADDRESS}`);
  console.log(`Agent Address: ${AGENT_ADDRESS}`);

  // Get signer (contract owner)
  const [owner] = await ethers.getSigners();
  console.log(`\nOwner Address: ${owner.address}`);
  console.log(`Owner Balance: ${ethers.formatEther(await ethers.provider.getBalance(owner.address))} ETH`);

  // Get moderator contract
  const Moderator = await ethers.getContractFactory("Moderator");
  const moderator = Moderator.attach(MODERATOR_ADDRESS);

  // Check current owner
  try {
    const contractOwner = await moderator.owner();
    console.log(`\nContract Owner: ${contractOwner}`);
    
    if (contractOwner.toLowerCase() !== owner.address.toLowerCase()) {
      console.log("❌ ERROR: You are not the contract owner!");
      console.log(`   Contract owner: ${contractOwner}`);
      console.log(`   Your address: ${owner.address}`);
      process.exit(1);
    }
  } catch (error) {
    console.log("⚠️ Could not check owner:", error.message);
  }

  // Check if agent is authorized
  try {
    const isAuthorized = await moderator.agents(AGENT_ADDRESS);
    console.log(`\nAgent currently authorized: ${isAuthorized ? "✅ YES" : "❌ NO"}`);
    
    if (isAuthorized) {
      console.log("✅ Agent is already authorized! No action needed.");
      return;
    }
  } catch (error) {
    console.log("⚠️ Could not check agent authorization:", error.message);
  }

  // Authorize the agent (setAgent takes address and bool)
  console.log("\n🔧 Authorizing agent...");
  try {
    const tx = await moderator.setAgent(AGENT_ADDRESS, true);
    console.log(`📤 Transaction sent: ${tx.hash}`);
    
    console.log("⏳ Waiting for confirmation...");
    const receipt = await tx.wait();
    
    console.log(`✅ Agent authorized successfully!`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
    
    // Verify
    const isNowAuthorized = await moderator.agents(AGENT_ADDRESS);
    console.log(`\n✅ Verification: Agent is now authorized: ${isNowAuthorized ? "✅ YES" : "❌ NO"}`);
    
  } catch (error) {
    console.log("❌ Authorization failed:", error.message);
    if (error.data) {
      console.log("   Error data:", error.data);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("AUTHORIZATION COMPLETE");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
