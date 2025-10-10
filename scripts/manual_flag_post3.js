const fetch = require('node-fetch');

const AGENT_URL = 'https://sol-ai-moderator-agent.onrender.com';

async function manualFlagPost3() {
  console.log('🚨 Manually Triggering Agent to Flag Post #3\n');
  
  try {
    // The agent might have a manual flag endpoint
    console.log('📡 Checking if agent has manual flag capability...\n');
    
    // First, let's try calling /start to ensure monitoring is active
    console.log('1️⃣ Starting monitoring...');
    const startResponse = await fetch(`${AGENT_URL}/start`, {
      method: 'POST'
    });
    const startData = await startResponse.json();
    console.log(`   ${startData.message || JSON.stringify(startData)}\n`);
    
    // Check if there's a manual flag endpoint
    console.log('2️⃣ Checking available endpoints...');
    const rootResponse = await fetch(AGENT_URL);
    const rootData = await rootResponse.json();
    console.log(`   Status: ${rootData.status}`);
    console.log(`   Monitoring: ${rootData.monitoring}\n`);
    
    console.log('💡 The agent is running but not automatically processing posts.');
    console.log('\n📋 Possible reasons:');
    console.log('   1. Event monitoring loop failed to start');
    console.log('   2. Agent wallet has no gas for transactions');
    console.log('   3. Agent is not authorized as moderator in the contract');
    console.log('   4. Environment variables missing on Render');
    
    console.log('\n🔧 Next steps:');
    console.log('   1. Check Render logs for errors');
    console.log('   2. Verify agent wallet has testnet tokens');
    console.log('   3. Verify agent is authorized in Moderator contract');
    console.log('   4. Redeploy agent if needed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

manualFlagPost3();
