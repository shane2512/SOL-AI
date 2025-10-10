const fetch = require('node-fetch');

const SOMNIA_RPC = 'https://dream-rpc.somnia.network';
const SOCIAL_ADDR = '0xf88B9e01A9B350E05cD8971DdDF7fC2c73910352';

async function rpcCall(method, params) {
  const response = await fetch(SOMNIA_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params
    })
  });
  return await response.json();
}

function encodeUint256(value) {
  return '0x' + BigInt(value).toString(16).padStart(64, '0');
}

function decodeUint256(hex) {
  return parseInt(hex, 16);
}

function decodeAddress(hex) {
  return '0x' + hex.slice(-40);
}

async function testFixedRpc() {
  console.log('🧪 Testing Fixed RPC Implementation\n');
  
  // Test 1: totalPosts with correct selector
  console.log('1️⃣ Testing totalPosts() with correct selector (0x8e53fb41)...');
  const totalResult = await rpcCall('eth_call', [
    { to: SOCIAL_ADDR, data: '0x8e53fb41' },
    'latest'
  ]);
  
  if (totalResult.error) {
    console.log('❌ Error:', totalResult.error);
    return;
  }
  
  const totalPosts = decodeUint256(totalResult.result);
  console.log(`✅ Total posts: ${totalPosts}\n`);
  
  if (totalPosts > 0) {
    // Test 2: getPost with correct selector
    console.log('2️⃣ Testing getPost(1) with correct selector (0x40731c24)...');
    const postData = '0x40731c24' + encodeUint256(1).slice(2);
    const postResult = await rpcCall('eth_call', [
      { to: SOCIAL_ADDR, data: postData },
      'latest'
    ]);
    
    if (postResult.error) {
      console.log('❌ Error:', postResult.error);
      return;
    }
    
    const hex = postResult.result.slice(2);
    const id = decodeUint256('0x' + hex.slice(0, 64));
    const author = decodeAddress('0x' + hex.slice(64, 128));
    const flagged = decodeUint256('0x' + hex.slice(192, 256)) !== 0;
    const timestamp = decodeUint256('0x' + hex.slice(256, 320));
    const likes = decodeUint256('0x' + hex.slice(320, 384));
    const replies = decodeUint256('0x' + hex.slice(384, 448));
    
    console.log('✅ Post data:', {
      id,
      author,
      flagged,
      timestamp,
      likes,
      replies
    });
  }
  
  console.log('\n✅ All RPC tests passed!');
  console.log('The frontend should now work correctly.');
}

testFixedRpc().catch(console.error);
