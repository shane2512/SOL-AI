// Test agent moderation with various toxicity levels
const fetch = require('node-fetch');

const AGENT_URL = 'https://sol-ai-moderator-agent.onrender.com';

const testCases = [
  { text: "hello world", expected: false, description: "Clean text" },
  { text: "bastard", expected: false, description: "20% toxicity (below 25% threshold)" },
  { text: "fuck", expected: true, description: "30% toxicity (above 25% threshold)" },
  { text: "die", expected: true, description: "30% toxicity (above 25% threshold)" },
  { text: "bloody bastard", expected: true, description: "35% toxicity (above 25% threshold)" },
  { text: "bomb the place", expected: true, description: "30% toxicity (above 25% threshold)" },
  { text: "kill the terrorist", expected: true, description: "55% toxicity (well above threshold)" }
];

async function testModeration() {
  console.log('🧪 Testing Agent Moderation Logic...\n');
  console.log(`Agent URL: ${AGENT_URL}\n`);

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    try {
      console.log(`📝 Testing: "${testCase.text}"`);
      console.log(`📊 Expected: ${testCase.expected ? 'TOXIC' : 'CLEAN'} (${testCase.description})`);
      
      const response = await fetch(`${AGENT_URL}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: testCase.text }),
        timeout: 10000
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      
      console.log(`🔍 Result: ${result.is_toxic ? 'TOXIC' : 'CLEAN'} (${result.toxicity_percentage}% toxicity)`);
      console.log(`🎯 Threshold: ${result.threshold_bp} BP (${result.threshold_bp/100}%)`);
      
      if (result.is_toxic === testCase.expected) {
        console.log('✅ PASS\n');
        passed++;
      } else {
        console.log('❌ FAIL - Expected different result\n');
        failed++;
      }
      
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}\n`);
      failed++;
    }
  }

  console.log('📊 Test Results:');
  console.log(`✅ Passed: ${passed}/${testCases.length}`);
  console.log(`❌ Failed: ${failed}/${testCases.length}`);
  console.log(`📈 Success Rate: ${((passed/testCases.length)*100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n⚠️  Some tests failed. This might indicate:');
    console.log('1. Agent threshold is not set to 25% (2500 BP)');
    console.log('2. Keyword detection logic needs adjustment');
    console.log('3. Environment variables not updated on Render');
  } else {
    console.log('\n🎉 All tests passed! Agent moderation is working correctly.');
  }
}

testModeration().catch(console.error);
