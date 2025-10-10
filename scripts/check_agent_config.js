const fetch = require('node-fetch');

const AGENT_URL = 'https://sol-ai-moderator-agent.onrender.com';

async function checkAgentConfig() {
  console.log('🔍 Checking AI Agent Configuration\n');
  
  try {
    const response = await fetch(`${AGENT_URL}/health`);
    const data = await response.json();
    
    console.log('📋 Agent Status:');
    console.log(`   Status: ${data.status}`);
    console.log(`   Running: ${data.running ? '✅ YES' : '❌ NO'}`);
    console.log(`   Posts Processed: ${data.posts_processed || 0}`);
    console.log(`   Last Check: ${data.last_check || 'Never'}`);
    
    console.log('\n📝 Contract Addresses:');
    console.log(`   SocialPosts: ${data.social_posts_address || 'Not available'}`);
    console.log(`   Moderator: ${data.moderator_address || 'Not available'}`);
    
    console.log('\n🎯 Expected Addresses (NEW):');
    console.log(`   SocialPosts: 0x543D67754A05c60035f57DA9Dc7FA6685dCe6A8B`);
    console.log(`   Moderator: 0x6F8234C0c0330193BaB7bc079AB74d109367C2ed`);
    
    if (data.social_posts_address) {
      if (data.social_posts_address.toLowerCase() === '0x543D67754A05c60035f57DA9Dc7FA6685dCe6A8B'.toLowerCase()) {
        console.log('\n✅ Agent is using the CORRECT contract addresses!');
      } else {
        console.log('\n❌ Agent is using OLD contract addresses!');
        console.log('   ACTION NEEDED: Update agent/.env and redeploy to Render');
      }
    } else {
      console.log('\n⚠️ Cannot verify contract addresses from health endpoint');
    }
    
  } catch (error) {
    console.error('❌ Error connecting to agent:', error.message);
    console.log('\n⚠️ Agent might be offline or unreachable');
  }
}

checkAgentConfig();
