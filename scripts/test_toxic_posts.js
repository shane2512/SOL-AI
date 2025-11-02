const axios = require('axios');

async function testModeration() {
    const posts = [
        "destroy kill everyone",
        "I hate you stupid idiot",
        "Hello world, nice day!",
        "die murder"
    ];
    
    console.log('🧪 Testing moderation API...\n');
    
    for (const text of posts) {
        try {
            const response = await axios.post('http://localhost:5000/moderate', { text });
            const { toxic, score_bp, model } = response.data;
            
            console.log(`📝 Text: "${text}"`);
            console.log(`   Toxic: ${toxic ? '🚩 YES' : '✅ NO'}`);
            console.log(`   Score: ${score_bp} BP (${(score_bp/100).toFixed(1)}%)`);
            console.log(`   Model: ${model}`);
            console.log(`   Threshold: 2500 BP (25%)`);
            console.log(`   ${toxic ? '❌ WOULD BE FLAGGED' : '✅ WOULD PASS'}\n`);
        } catch (error) {
            console.error(`❌ Error testing "${text}":`, error.message);
        }
    }
}

testModeration();
