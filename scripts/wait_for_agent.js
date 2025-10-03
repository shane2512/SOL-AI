// Wait for agent to come back online after deployment
const fetch = require('node-fetch');

const AGENT_URL = 'https://sol-ai-moderator-agent.onrender.com';
const MAX_ATTEMPTS = 20;
const DELAY_MS = 15000; // 15 seconds

async function waitForAgent() {
  console.log('⏳ Waiting for agent to come back online after deployment...\n');
  
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/${MAX_ATTEMPTS}...`);
      
      const response = await fetch(`${AGENT_URL}/health`, {
        timeout: 10000
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Agent is back online!');
        console.log('📊 Status:', JSON.stringify(data, null, 2));
        
        // Try to start monitoring
        console.log('\n🚀 Attempting to start monitoring...');
        try {
          const startResponse = await fetch(`${AGENT_URL}/start`, {
            method: 'POST',
            timeout: 10000
          });
          
          if (startResponse.ok) {
            const startData = await startResponse.json();
            console.log('✅ Monitoring started successfully!');
            console.log('📊 Result:', JSON.stringify(startData, null, 2));
          } else {
            const errorText = await startResponse.text();
            console.log('❌ Failed to start monitoring:', errorText);
          }
        } catch (startError) {
          console.log('❌ Error starting monitoring:', startError.message);
        }
        
        return;
      } else {
        console.log(`❌ HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.log(`❌ ${error.message}`);
    }
    
    if (attempt < MAX_ATTEMPTS) {
      console.log(`⏳ Waiting ${DELAY_MS/1000} seconds before next attempt...\n`);
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }
  
  console.log('❌ Agent did not come back online within the timeout period');
}

waitForAgent().catch(console.error);
