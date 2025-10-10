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

function decodePost(result) {
  try {
    let hex = result.slice(2);
    
    // Check if result is wrapped in a tuple offset
    const possibleOffset = parseInt('0x' + hex.slice(0, 64), 16) * 2;
    if (possibleOffset === 64) {
      hex = hex.slice(64);
    }
    
    // Parse fields
    const id = parseInt('0x' + hex.slice(0, 64), 16);
    const author = '0x' + hex.slice(64 + 24, 128);
    const contentOffset = parseInt('0x' + hex.slice(128, 192), 16) * 2;
    const flagged = parseInt('0x' + hex.slice(192, 256), 16) !== 0;
    
    // Decode content
    const contentLengthHex = hex.slice(contentOffset, contentOffset + 64);
    const contentLength = parseInt('0x' + contentLengthHex, 16) * 2;
    const contentHex = hex.slice(contentOffset + 64, contentOffset + 64 + contentLength);
    
    let content = '';
    for (let i = 0; i < contentHex.length; i += 2) {
      const charCode = parseInt(contentHex.substr(i, 2), 16);
      if (charCode > 0) {
        content += String.fromCharCode(charCode);
      }
    }
    
    return { id, author, content, flagged, success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function checkAll34Posts() {
  console.log('🔍 Checking All 34 Posts\n');
  
  // Get total posts
  const totalResult = await rpcCall('eth_call', [
    { to: SOCIAL_ADDR, data: '0x8e53fb41' },
    'latest'
  ]);
  
  const totalPosts = parseInt(totalResult.result, 16);
  console.log(`📊 Total posts on chain: ${totalPosts}\n`);
  
  let successCount = 0;
  let failCount = 0;
  let emptyContent = 0;
  
  for (let i = 1; i <= totalPosts; i++) {
    const postData = '0x40731c24' + encodeUint256(i).slice(2);
    const postResult = await rpcCall('eth_call', [
      { to: SOCIAL_ADDR, data: postData },
      'latest'
    ]);
    
    const post = decodePost(postResult.result);
    
    if (post.success) {
      successCount++;
      const status = post.flagged ? '❌ FLAGGED' : '✅ SAFE';
      const contentPreview = post.content ? post.content.substring(0, 40) : '(empty)';
      console.log(`Post ${i}: ${status} - "${contentPreview}"`);
      
      if (!post.content || post.content.trim() === '') {
        emptyContent++;
        console.log(`   ⚠️ WARNING: Empty content!`);
      }
    } else {
      failCount++;
      console.log(`Post ${i}: ❌ DECODE FAILED - ${post.error}`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('Summary:');
  console.log(`✅ Successfully decoded: ${successCount}`);
  console.log(`❌ Failed to decode: ${failCount}`);
  console.log(`⚠️ Empty content: ${emptyContent}`);
  console.log('='.repeat(50));
}

checkAll34Posts().catch(console.error);
