const fetch = require('node-fetch');

const AGENT_URL = 'https://sol-ai-moderator-agent.onrender.com';

async function startAgent() {
  console.log('🚀 Starting AI Moderator Agent...\n');
  
  try {
    // Start the agent
    console.log('📡 Sending start request...');
    const startResponse = await fetch(`${AGENT_URL}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const startData = await startResponse.json();
    
    console.log('✅ Start Response:', startData.message || startData);
    
    // Wait a bit for agent to initialize
    console.log('\n⏳ Waiting 3 seconds for agent to initialize...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check health
    console.log('\n🔍 Checking agent health...');
    const healthResponse = await fetch(`${AGENT_URL}/health`);
    const healthData = await healthResponse.json();
    
    console.log('\n📋 Agent Status:');
    console.log(`   Status: ${healthData.status}`);
    console.log(`   Running: ${healthData.running ? '✅ YES' : '❌ NO'}`);
    console.log(`   Posts Processed: ${healthData.posts_processed || 0}`);
    console.log(`   Last Check: ${healthData.last_check || 'Never'}`);
    
    if (healthData.social_posts_address) {
      console.log('\n📝 Contract Addresses:');
      console.log(`   SocialPosts: ${healthData.social_posts_address}`);
      console.log(`   Moderator: ${healthData.moderator_address || 'Not available'}`);
      
      // Verify correct addresses
      const expectedSocial = '0x543D67754A05c60035f57DA9Dc7FA6685dCe6A8B';
      const expectedModerator = '0x6F8234C0c0330193BaB7bc079AB74d109367C2ed';
      
      if (healthData.social_posts_address.toLowerCase() === expectedSocial.toLowerCase()) {
        console.log('\n✅ Agent is using CORRECT SocialPosts address!');
      } else {
        console.log('\n❌ Agent is using WRONG SocialPosts address!');
        console.log(`   Expected: ${expectedSocial}`);
        console.log(`   Got: ${healthData.social_posts_address}`);
        console.log('\n⚠️ You need to REDEPLOY the agent on Render with updated .env');
      }
    }
    
    if (healthData.running) {
      console.log('\n🎉 Agent is now running and monitoring for posts!');
      console.log('   It should process post #3 within the next minute...');
    } else {
      console.log('\n⚠️ Agent started but not running. Check Render logs for errors.');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n💡 Possible issues:');
    console.log('   1. Agent service is down on Render');
    console.log('   2. Agent needs to be redeployed with new .env variables');
    console.log('   3. Network connectivity issue');
  }
}

startAgent();
