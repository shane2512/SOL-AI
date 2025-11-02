const axios = require('axios');

async function testModeration() {
    const text = "I hate you stupid idiot";
    
    console.log('🧪 Testing moderation API with detailed output...\n');
    console.log(`📝 Testing: "${text}"\n`);
    
    try {
        const response = await axios.post('http://localhost:5000/moderate', { text });
        console.log('Full Response:');
        console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

testModeration();
