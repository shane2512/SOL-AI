const { ethers } = require('ethers');
const fs = require('fs');

const SOCIAL_ADDR = "0x543D67754A05c60035f57DA9Dc7FA6685dCe6A8B";
const RPC_URL = "https://dream-rpc.somnia.network";

async function testContract() {
    console.log('🔍 Testing SocialPosts contract...\n');
    
    try {
        // Load ABI
        const abiPath = './app/contracts/abis/SocialPosts.json';
        const abiData = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
        const abi = Array.isArray(abiData) ? abiData : abiData.abi;
        
        console.log('✅ ABI loaded');
        
        // Connect to contract
        const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
        const contract = new ethers.Contract(SOCIAL_ADDR, abi, provider);
        
        console.log('✅ Contract connected');
        
        // Test read functions
        const totalPosts = await contract.totalPosts();
        console.log(`✅ Total posts: ${totalPosts.toString()}`);
        
        // Check if contract has createPost function
        const hasCreatePost = contract.interface.functions['createPost(string)'];
        console.log(`✅ createPost function exists: ${!!hasCreatePost}`);
        
        // Try to get a post
        if (totalPosts.toNumber() > 0) {
            const post = await contract.getPost(1);
            console.log(`✅ Can read posts`);
            console.log(`   Post 1: "${post[2]}"`);
        }
        
        console.log('\n✅ Contract is working correctly!');
        console.log('\n📝 The issue might be:');
        console.log('   1. Wrong network in MetaMask (should be Somnia Testnet)');
        console.log('   2. Insufficient gas/balance');
        console.log('   3. Contract paused or has restrictions');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testContract();
