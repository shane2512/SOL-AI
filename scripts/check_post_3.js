const { ethers } = require("ethers");
const SocialPostsAbi = require("../app/contracts/abis/SocialPosts.json");

const SOMNIA_RPC = 'https://dream-rpc.somnia.network';
const SOCIAL_ADDR = '0x543D67754A05c60035f57DA9Dc7FA6685dCe6A8B'; // NEW CONTRACT

async function checkPost3() {
  console.log('🔍 Checking Post #3\n');
  
  const provider = new ethers.providers.JsonRpcProvider(SOMNIA_RPC);
  const contract = new ethers.Contract(SOCIAL_ADDR, SocialPostsAbi.abi, provider);
  
  try {
    const post = await contract.getPost(3);
    
    console.log('📝 Post Details:');
    console.log(`   ID: ${post[0]}`);
    console.log(`   Author: ${post[1]}`);
    console.log(`   Content: "${post[2]}"`);
    console.log(`   Flagged: ${post[3] ? '❌ YES' : '✅ NO'}`);
    console.log(`   Timestamp: ${new Date(Number(post[4]) * 1000).toLocaleString()}`);
    console.log(`   Likes: ${post[5]}`);
    console.log(`   Replies: ${post[6]}`);
    
    console.log('\n🤖 AI Analysis:');
    
    // Check for toxic keywords
    const content = post[2].toLowerCase();
    const toxicKeywords = ['kill', 'murder', 'bomb', 'terrorist', 'die', 'hate', 'fuck', 'bastard', 'idiot', 'stupid'];
    const foundKeywords = toxicKeywords.filter(keyword => content.includes(keyword));
    
    if (foundKeywords.length > 0) {
      console.log(`   ⚠️ Contains toxic keywords: ${foundKeywords.join(', ')}`);
      console.log(`   ⚠️ This post SHOULD be flagged!`);
    } else {
      console.log(`   ✅ No toxic keywords detected`);
    }
    
    if (!post[3] && foundKeywords.length > 0) {
      console.log('\n❌ ISSUE: Post contains toxic content but is NOT flagged!');
      console.log('   Possible reasons:');
      console.log('   1. AI agent is not running');
      console.log('   2. AI agent is using old contract address');
      console.log('   3. AI agent has not processed this post yet');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkPost3();
