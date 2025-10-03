// Detailed agent status check with error handling
const fetch = require('node-fetch');

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || 'https://sol-ai-moderator-agent.onrender.com';

async function detailedCheck() {
  console.log('🔍 Detailed AI Agent Analysis...\n');
  console.log(`Agent URL: ${AGENT_URL}\n`);

  try {
    // 1. Check basic health
    console.log('1️⃣ Health Check:');
    const healthResponse = await fetch(`${AGENT_URL}/health`, { timeout: 10000 });
    const healthData = await healthResponse.json();
    
    console.log(`✅ Status: ${healthData.status}`);
    console.log(`🌐 Web3 Connected: ${healthData.web3_connected}`);
    console.log(`📄 Contracts Loaded: ${healthData.contracts_loaded}`);
    console.log(`🤖 AI Model Loaded: ${healthData.ai_model_loaded}`);
    console.log(`👤 Agent Account: ${healthData.agent_account}`);
    console.log(`📊 Monitoring Active: ${healthData.monitoring_active}\n`);

    // 2. Try to start monitoring with detailed error handling
    console.log('2️⃣ Starting Monitoring:');
    try {
      const startResponse = await fetch(`${AGENT_URL}/start`, {
        method: 'POST',
        timeout: 15000
      });
      
      const startText = await startResponse.text();
      console.log(`Response Status: ${startResponse.status}`);
      console.log(`Response: ${startText}`);
      
      if (startResponse.ok) {
        const startData = JSON.parse(startText);
        console.log('✅ Monitoring started successfully!');
        console.log('📊 Result:', JSON.stringify(startData, null, 2));
      } else {
        console.log('❌ Failed to start monitoring');
        console.log('Error response:', startText);
      }
    } catch (startError) {
      console.log('❌ Error starting monitoring:', startError.message);
    }

    // 3. Check stats after attempting to start
    console.log('\n3️⃣ Updated Stats:');
    const statsResponse = await fetch(`${AGENT_URL}/stats`, { timeout: 10000 });
    const statsData = await statsResponse.json();
    console.log('📊 Current Stats:', JSON.stringify(statsData, null, 2));

    // 4. Test moderation endpoint
    console.log('\n4️⃣ Testing Moderation:');
    try {
      const moderateResponse = await fetch(`${AGENT_URL}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'This is a test message' }),
        timeout: 10000
      });
      
      if (moderateResponse.ok) {
        const moderateData = await moderateResponse.json();
        console.log('✅ Moderation test successful:');
        console.log('📊 Result:', JSON.stringify(moderateData, null, 2));
      } else {
        console.log('❌ Moderation test failed');
      }
    } catch (moderateError) {
      console.log('❌ Moderation test error:', moderateError.message);
    }

  } catch (error) {
    console.log('❌ Agent check failed:', error.message);
  }
}

detailedCheck().catch(console.error);
