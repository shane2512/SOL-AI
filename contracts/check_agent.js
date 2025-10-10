const { ethers } = require("hardhat");

async function main() {
  const MODERATOR_ADDRESS = "0x6F8234C0c0330193BaB7bc079AB74d109367C2ed";
  
  const Moderator = await ethers.getContractFactory("Moderator");
  const moderator = Moderator.attach(MODERATOR_ADDRESS);
  
  console.log("Checking Moderator contract...");
  console.log(`Address: ${MODERATOR_ADDRESS}\n`);
  
  try {
    const isAuthorized = await moderator.agents("0xda4626FcE97748B7A78b613c754419c5e3FDAdCA");
    console.log(`Agent Authorized: ${isAuthorized}`);
  } catch (error) {
    console.log(`Error checking agent: ${error.message}`);
  }
  
  try {
    const owner = await moderator.owner();
    console.log(`Contract Owner: ${owner}`);
  } catch (error) {
    console.log(`Error getting owner: ${error.message}`);
  }
  
  try {
    const socialAddress = await moderator.social();
    console.log(`Social Contract: ${socialAddress}`);
    console.log(`Expected: 0x543D67754A05c60035f57DA9Dc7FA6685dCe6A8B`);
    console.log(`Match: ${socialAddress.toLowerCase() === "0x543D67754A05c60035f57DA9Dc7FA6685dCe6A8B".toLowerCase()}`);
  } catch (error) {
    console.log(`Error getting social address: ${error.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
