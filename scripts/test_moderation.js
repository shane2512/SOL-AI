const fetch = require('node-fetch');

const AGENT_URL = 'https://sol-ai-moderator-agent.onrender.com';

async function testModeration() {
  console.log('🧪 Testing AI Moderation\n');
  
  const testCases = [
    { id: 1, content: "kill evryone" },
    { id: 2, content: "kill everyone" },
    { id: 3, content: "I will kill you" },
    { id: 4, content: "bomb the place" },
    { id: 5, content: "fuck you bastard" },
    { id: 6, content: "Hello, how are you?" },
    { id: 7, content: "This is a nice day" }
  ];
  
  console.log('Testing various content...\n');
  console.log('='.repeat(70));
  
  for (const test of testCases) {
    try {
      const response = await fetch(`${AGENT_URL}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: test.content
        })
      });
      
      const result = await response.json();
      
      const flag = result.is_toxic ? '❌ FLAG' : '✅ SAFE';
      const score = result.toxicity_percentage ? `${result.toxicity_percentage.toFixed(1)}%` : 'N/A';
      
      console.log(`${flag} | Score: ${score.padEnd(8)} | "${test.content}"`);
      
      if (result.reason) {
        console.log(`       Reason: ${result.reason}`);
      }
      
    } catch (error) {
      console.log(`❌ ERROR | "${test.content}" - ${error.message}`);
    }
  }
  
  console.log('='.repeat(70));
  console.log('\n💡 Threshold: 25% toxicity');
  console.log('   Posts above 25% should be flagged');
}

testModeration();
