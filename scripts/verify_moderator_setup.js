const { ethers } = require("ethers");
const ModeratorAbi = require("../app/contracts/abis/Moderator.json");

const SOMNIA_RPC = 'https://dream-rpc.somnia.network';
const MODERATOR_ADDR = '0x6F8234C0c0330193BaB7bc079AB74d109367C2ed';
const EXPECTED_SOCIAL_ADDR = '0x543D67754A05c60035f57DA9Dc7FA6685dCe6A8B';

async function verifyModeratorSetup() {
  console.log('🔍 Verifying Moderator Contract Setup\n');
  
  const provider = new ethers.providers.JsonRpcProvider(SOMNIA_RPC);
  const contract = new ethers.Contract(MODERATOR_ADDR, ModeratorAbi.abi || ModeratorAbi, provider);
  
  try {
    console.log(`📝 Moderator Contract: ${MODERATOR_ADDR}\n`);
    
    // Get owner
    const owner = await contract.owner();
    console.log(`👤 Owner: ${owner}`);
    
    // Get social posts address
    const socialAddr = await contract.social();
    console.log(`📄 SocialPosts: ${socialAddr}`);
    console.log(`   Expected:    ${EXPECTED_SOCIAL_ADDR}`);
    
    if (socialAddr.toLowerCase() === EXPECTED_SOCIAL_ADDR.toLowerCase()) {
      console.log(`   ✅ Correct SocialPosts address!`);
    } else {
      console.log(`   ❌ WRONG SocialPosts address!`);
      console.log(`\n🚨 PROBLEM: Moderator is pointing to the WRONG SocialPosts contract!`);
      console.log(`   This is why it can't flag posts.`);
      console.log(`\n🔧 Solution: Deploy a NEW Moderator contract with correct SocialPosts address`);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

verifyModeratorSetup();
