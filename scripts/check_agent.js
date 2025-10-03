// Script to check if the agent is running
const fetch = require('node-fetch');

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || 'https://sol-ai-moderator-agent.onrender.com';

async function checkAgent() {
  console.log('🤖 Checking AI Agent Status...\n');
  console.log(`Agent URL: ${AGENT_URL}\n`);

  try {
    // Check health endpoint
    console.log('📡 Checking /health endpoint...');
    const healthResponse = await fetch(`${AGENT_URL}/health`, {
      method: 'GET',
      timeout: 10000
    });

    if (!healthResponse.ok) {
      throw new Error(`HTTP ${healthResponse.status}: ${healthResponse.statusText}`);
    }

    const healthData = await healthResponse.json();
    console.log('✅ Agent is responding!');
    console.log('📊 Health Status:', JSON.stringify(healthData, null, 2));

    // Check stats endpoint
    console.log('\n📈 Checking /stats endpoint...');
    const statsResponse = await fetch(`${AGENT_URL}/stats`, {
      method: 'GET',
      timeout: 10000
    });

    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      console.log('📊 Agent Statistics:', JSON.stringify(statsData, null, 2));
    } else {
      console.log('⚠️ Stats endpoint not available');
    }

    // Try to start monitoring
    console.log('\n🚀 Attempting to start monitoring...');
    const startResponse = await fetch(`${AGENT_URL}/start`, {
      method: 'POST',
      timeout: 10000
    });

    if (startResponse.ok) {
      const startData = await startResponse.json();
      console.log('✅ Monitoring start result:', JSON.stringify(startData, null, 2));
    } else {
      console.log('⚠️ Could not start monitoring');
    }

  } catch (error) {
    console.log('❌ Agent is not responding or not running');
    console.log('Error:', error.message);
    console.log('\n🔧 Possible issues:');
    console.log('1. Agent not deployed to Render');
    console.log('2. Agent URL is incorrect');
    console.log('3. Agent crashed or failed to start');
    console.log('4. Network connectivity issues');
  }
}

checkAgent().catch(console.error);
