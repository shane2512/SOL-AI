// Verify contract deployment with raw RPC calls
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
  
  const data = await response.json();
  return data;
}

async function verifyDeployment() {
  console.log('🔍 Verifying Contract Deployment\n');
  console.log(`RPC: ${SOMNIA_RPC}`);
  console.log(`Contract: ${SOCIAL_ADDR}\n`);
  
  try {
    // 1. Check network
    console.log('1️⃣ Checking network...');
    const chainId = await rpcCall('eth_chainId', []);
    console.log('Response:', JSON.stringify(chainId, null, 2));
    
    if (chainId.error) {
      console.log('❌ Network error:', chainId.error);
      return;
    }
    console.log(`✅ Chain ID: ${parseInt(chainId.result, 16)}\n`);
    
    // 2. Check contract code
    console.log('2️⃣ Checking contract code...');
    const code = await rpcCall('eth_getCode', [SOCIAL_ADDR, 'latest']);
    console.log('Response:', JSON.stringify(code, null, 2));
    
    if (code.error) {
      console.log('❌ Error getting code:', code.error);
      return;
    }
    
    if (code.result === '0x' || code.result.length <= 2) {
      console.log('❌ No contract at this address!');
      console.log('The contract may not be deployed or the address is wrong.\n');
      return;
    }
    console.log(`✅ Contract code exists (${code.result.length} bytes)\n`);
    
    // 3. Try calling totalPosts
    console.log('3️⃣ Calling totalPosts()...');
    const totalPostsSelector = '0x2e52d606'; // totalPosts() function selector
    const callResult = await rpcCall('eth_call', [
      {
        to: SOCIAL_ADDR,
        data: totalPostsSelector
      },
      'latest'
    ]);
    
    console.log('Response:', JSON.stringify(callResult, null, 2));
    
    if (callResult.error) {
      console.log('❌ Call failed:', callResult.error);
      console.log('\nPossible issues:');
      console.log('- Contract ABI mismatch');
      console.log('- Wrong contract address');
      console.log('- Contract not properly initialized');
      return;
    }
    
    const totalPosts = parseInt(callResult.result, 16);
    console.log(`✅ Total posts: ${totalPosts}\n`);
    
    console.log('✅ Contract is working correctly!');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

verifyDeployment().catch(console.error);
