const { ethers } = require("ethers");
const SocialPostsAbi = require("../app/contracts/abis/SocialPosts.json");

const SOMNIA_RPC = 'https://dream-rpc.somnia.network';
const SOCIAL_ADDR = '0x543D67754A05c60035f57DA9Dc7FA6685dCe6A8B'; // NEW CONTRACT

async function checkUsernames() {
  console.log('🔍 Checking On-Chain Usernames\n');
  console.log(`Contract: ${SOCIAL_ADDR}\n`);
  
  const provider = new ethers.providers.JsonRpcProvider(SOMNIA_RPC);
  const contract = new ethers.Contract(SOCIAL_ADDR, SocialPostsAbi.abi, provider);
  
  try {
    // Get total posts
    const totalPosts = await contract.totalPosts();
    console.log(`📊 Total posts: ${totalPosts}\n`);
    
    // Get unique authors
    const authors = new Set();
    for (let i = 1; i <= Number(totalPosts); i++) {
      try {
        const post = await contract.getPost(i);
        authors.add(post[1]); // author is at index 1
      } catch (e) {
        console.error(`Error getting post ${i}:`, e.message);
      }
    }
    
    console.log(`👥 Found ${authors.size} unique authors\n`);
    console.log('=' .repeat(60));
    
    // Check username for each author
    for (const author of authors) {
      try {
        const username = await contract.getUsername(author);
        if (username && username.trim() !== '') {
          console.log(`✅ ${author}`);
          console.log(`   Username: "${username}"`);
        } else {
          console.log(`⚠️  ${author}`);
          console.log(`   Username: (not set)`);
        }
        console.log('');
      } catch (error) {
        console.log(`❌ ${author}`);
        console.log(`   Error: ${error.message}`);
        console.log('');
      }
    }
    
    console.log('=' .repeat(60));
    console.log('\n💡 Tip: Users need to set their username in Profile → Edit → Save');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkUsernames();
