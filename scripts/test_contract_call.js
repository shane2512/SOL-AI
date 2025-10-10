// Test direct contract call to diagnose the issue
const { ethers } = require('ethers');
require('dotenv').config({ path: '../contracts/.env' });

const SOMNIA_RPC = 'https://dream-rpc.somnia.network';
const SOCIAL_ADDR = '0xf88B9e01A9B350E05cD8971DdDF7fC2c73910352';

// Minimal ABI for totalPosts
const MINIMAL_ABI = [
  "function totalPosts() view returns (uint256)"
];

async function testContract() {
  console.log('🔍 Testing Contract Call...\n');
  console.log(`RPC URL: ${SOMNIA_RPC}`);
  console.log(`Contract: ${SOCIAL_ADDR}\n`);

  try {
    // Create provider
    console.log('1️⃣ Creating provider...');
    const provider = new ethers.providers.JsonRpcProvider(SOMNIA_RPC);
    
    // Test connection
    console.log('2️⃣ Testing connection...');
    const network = await provider.getNetwork();
    console.log(`✅ Connected to network: ${network.name} (chainId: ${network.chainId})\n`);
    
    // Check if contract exists
    console.log('3️⃣ Checking contract code...');
    const code = await provider.getCode(SOCIAL_ADDR);
    console.log(`Contract code length: ${code.length} bytes`);
    
    if (code === '0x' || code.length <= 2) {
      console.log('❌ ERROR: No contract deployed at this address!');
      console.log('The contract address may be incorrect or not deployed on this network.\n');
      return;
    }
    console.log('✅ Contract exists at address\n');
    
    // Create contract instance
    console.log('4️⃣ Creating contract instance...');
    const contract = new ethers.Contract(SOCIAL_ADDR, MINIMAL_ABI, provider);
    
    // Call totalPosts
    console.log('5️⃣ Calling totalPosts()...');
    const total = await contract.totalPosts();
    console.log(`✅ Total posts: ${total.toString()}\n`);
    
    // Try to get a post if any exist
    if (total.gt(0)) {
      console.log('6️⃣ Fetching first post...');
      const getPostAbi = [
        "function getPost(uint256) view returns (uint256, address, string, bool, uint256, uint256, uint256)"
      ];
      const contractWithGetPost = new ethers.Contract(SOCIAL_ADDR, getPostAbi, provider);
      const post = await contractWithGetPost.getPost(1);
      console.log('✅ First post:', {
        id: post[0].toString(),
        author: post[1],
        content: post[2],
        flagged: post[3],
        timestamp: post[4].toString(),
        likes: post[5].toString(),
        replies: post[6].toString()
      });
    }
    
    console.log('\n✅ All tests passed!');
    
  } catch (error) {
    console.log('\n❌ Error occurred:');
    console.log('Error message:', error.message);
    console.log('Error code:', error.code);
    if (error.reason) console.log('Reason:', error.reason);
    if (error.transaction) console.log('Transaction:', error.transaction);
    console.log('\nFull error:', error);
  }
}

testContract().catch(console.error);
