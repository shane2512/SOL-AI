// Simple test to verify contract connection
const { JsonRpcProvider, Contract } = require('ethers');

const SOMNIA_RPC = 'https://dream-rpc.somnia.network';
const SOCIAL_ADDR = '0xf88B9e01A9B350E05cD8971DdDF7fC2c73910352';

// Minimal ABI for testing
const SOCIAL_ABI = [
  "function totalPosts() view returns (uint256)",
  "function getPost(uint256 id) view returns (tuple(uint256 id, address author, string content, bool flagged))"
];

async function testConnection() {
  try {
    console.log('🔄 Testing contract connection...');
    
    const provider = new JsonRpcProvider(SOMNIA_RPC);
    console.log('✅ Provider created');
    
    // Test network connection
    const network = await provider.getNetwork();
    console.log('🌐 Network:', network.chainId.toString());
    
    // Test contract
    const contract = new Contract(SOCIAL_ADDR, SOCIAL_ABI, provider);
    console.log('📄 Contract created');
    
    // Test contract call
    const total = await contract.totalPosts();
    console.log('📊 Total posts:', total.toString());
    
    if (total > 0) {
      const post = await contract.getPost(1);
      console.log('📖 First post:', {
        id: post.id.toString(),
        author: post.author,
        content: post.content.substring(0, 50) + '...',
        flagged: post.flagged
      });
    }
    
    console.log('✅ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testConnection();
