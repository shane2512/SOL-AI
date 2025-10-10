const fetch = require('node-fetch');

const AGENT_URL = 'https://sol-ai-moderator-agent.onrender.com';

async function verifyAgent() {
  console.log('🔍 Verifying AI Agent Status\n');
  
  try {
    // Check root endpoint
    console.log('📡 Checking root endpoint...');
    const rootResponse = await fetch(AGENT_URL);
    const rootData = await rootResponse.json();
    
    console.log('✅ Root Endpoint Response:');
    console.log(`   Service: ${rootData.service}`);
    console.log(`   Status: ${rootData.status}`);
    console.log(`   Monitoring: ${rootData.monitoring ? '✅ ACTIVE' : '❌ INACTIVE'}`);
    console.log(`   Model: ${rootData.model}`);
    console.log(`   Threshold: ${rootData.threshold_bp} BP (${rootData.threshold_bp / 100}%)`);
    console.log(`   Features: ${rootData.features.join(', ')}`);
    
    // Now trigger the agent to check for posts
    console.log('\n🚀 Triggering agent to check for posts...');
    
    // The agent should auto-monitor, but let's manually trigger a check
    const moderateResponse = await fetch(`${AGENT_URL}/moderate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        post_id: 3,
        content: "kill evryone"
      })
    });
    
    const moderateData = await moderateResponse.json();
    console.log('\n📊 Moderation Result for Post #3:');
    console.log(`   Should Flag: ${moderateData.should_flag ? '❌ YES' : '✅ NO'}`);
    console.log(`   Toxicity Score: ${moderateData.toxicity_score || 'N/A'}`);
    console.log(`   Reason: ${moderateData.reason || 'N/A'}`);
    
    if (moderateData.should_flag) {
      console.log('\n✅ Agent correctly identifies post #3 as toxic!');
      console.log('   Now checking if it flagged it on-chain...');
      
      // Wait a moment for transaction
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check if post is flagged on-chain
      const { ethers } = require("ethers");
      const SocialPostsAbi = require("../app/contracts/abis/SocialPosts.json");
      
      const provider = new ethers.providers.JsonRpcProvider('https://dream-rpc.somnia.network');
      const contract = new ethers.Contract('0x543D67754A05c60035f57DA9Dc7FA6685dCe6A8B', SocialPostsAbi.abi, provider);
      
      const post = await contract.getPost(3);
      console.log(`\n📝 Post #3 On-Chain Status:`);
      console.log(`   Flagged: ${post[3] ? '❌ YES' : '✅ NO'}`);
      
      if (!post[3]) {
        console.log('\n⚠️ Post is NOT flagged on-chain yet!');
        console.log('   Possible reasons:');
        console.log('   1. Agent wallet has no gas');
        console.log('   2. Agent is not authorized as moderator');
        console.log('   3. Transaction failed');
        console.log('\n💡 Check Render logs for transaction errors');
      } else {
        console.log('\n🎉 Post successfully flagged on-chain!');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

verifyAgent();
