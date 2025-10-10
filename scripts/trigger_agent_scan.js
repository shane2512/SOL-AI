const fetch = require('node-fetch');
const { ethers } = require("ethers");
const SocialPostsAbi = require("../app/contracts/abis/SocialPosts.json");

const AGENT_URL = 'https://sol-ai-moderator-agent.onrender.com';
const SOMNIA_RPC = 'https://dream-rpc.somnia.network';
const SOCIAL_ADDR = '0x543D67754A05c60035f57DA9Dc7FA6685dCe6A8B';

async function triggerAgentScan() {
  console.log('🚀 Triggering Agent to Scan All Posts\n');
  
  const provider = new ethers.providers.JsonRpcProvider(SOMNIA_RPC);
  const contract = new ethers.Contract(SOCIAL_ADDR, SocialPostsAbi.abi, provider);
  
  try {
    // Get total posts
    const totalPosts = await contract.totalPosts();
    console.log(`📊 Total posts on chain: ${totalPosts}\n`);
    
    // Check each post and send to agent if not flagged
    for (let i = 1; i <= Number(totalPosts); i++) {
      const post = await contract.getPost(i);
      const postId = Number(post[0]);
      const content = post[2];
      const flagged = post[3];
      
      console.log(`\nPost #${postId}: "${content.substring(0, 40)}${content.length > 40 ? '...' : ''}"`);
      console.log(`   Flagged: ${flagged ? '❌ YES' : '✅ NO'}`);
      
      if (!flagged) {
        // Send to agent for moderation
        console.log(`   🔍 Sending to agent for analysis...`);
        
        const response = await fetch(`${AGENT_URL}/moderate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: content })
        });
        
        const result = await response.json();
        console.log(`   📊 Toxicity: ${result.toxicity_percentage.toFixed(1)}%`);
        
        if (result.is_toxic) {
          console.log(`   ⚠️ SHOULD BE FLAGGED! (threshold: 25%)`);
          console.log(`   💡 Agent needs to flag this on-chain`);
        } else {
          console.log(`   ✅ Safe content`);
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('\n💡 The agent detected toxic posts but hasn\'t flagged them on-chain.');
    console.log('   This means the monitoring loop is not running automatically.');
    console.log('\n🔧 Solution: The agent needs to actively monitor PostCreated events');
    console.log('   and flag posts automatically when they are created.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

triggerAgentScan();
