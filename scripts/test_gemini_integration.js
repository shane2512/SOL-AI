// Test Gemini API integration for toxicity detection
const fetch = require('node-fetch');

const AGENT_URL = 'https://sol-ai-moderator-agent.onrender.com';

const testCases = [
  { text: "hello world", description: "Clean text" },
  { text: "I love this community", description: "Positive text" },
  { text: "bastard", description: "Mild profanity" },
  { text: "fuck you", description: "Strong profanity" },
  { text: "die in hell", description: "Threatening language" },
  { text: "bloody bastard idiot", description: "Multiple offensive words" },
  { text: "bomb the terrorist hideout", description: "Violence-related content" },
  { text: "kill all the enemies with weapons", description: "High toxicity content" }
];

async function testGeminiIntegration() {
  console.log('🤖 Testing Gemini API Integration...\n');
  console.log(`Agent URL: ${AGENT_URL}\n`);

  // First check if agent is using Gemini
  try {
    console.log('📊 Checking Agent Status:');
    const healthResponse = await fetch(`${AGENT_URL}/health`);
    const healthData = await healthResponse.json();
    
    console.log(`✅ AI Model Type: ${healthData.ai_model_type}`);
    console.log(`🤖 AI Model Loaded: ${healthData.ai_model_loaded}`);
    console.log(`📋 Model Name: ${healthData.stats ? 'Available' : 'Not available'}\n`);
    
    if (healthData.ai_model_type !== 'gemini') {
      console.log('⚠️  Agent is not using Gemini API, using fallback detection\n');
    }
  } catch (error) {
    console.log('❌ Could not check agent status:', error.message);
    return;
  }

  console.log('🧪 Testing Toxicity Detection:\n');

  for (const testCase of testCases) {
    try {
      console.log(`📝 Testing: "${testCase.text}"`);
      console.log(`📊 Description: ${testCase.description}`);
      
      const response = await fetch(`${AGENT_URL}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: testCase.text }),
        timeout: 15000 // Longer timeout for API calls
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      
      console.log(`🔍 Result: ${result.is_toxic ? '🚨 TOXIC' : '✅ CLEAN'}`);
      console.log(`📈 Toxicity: ${result.toxicity_percentage}%`);
      console.log(`🎯 Threshold: ${result.threshold_bp/100}%`);
      console.log(`📊 Score: ${result.toxicity_score_bp} BP\n`);
      
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}\n`);
    }
  }

  console.log('🎯 Benefits of Gemini Integration:');
  console.log('✅ More accurate toxicity detection');
  console.log('✅ Context-aware analysis');
  console.log('✅ No heavy model downloads');
  console.log('✅ Better memory efficiency');
  console.log('✅ Real-time API responses');
}

testGeminiIntegration().catch(console.error);
