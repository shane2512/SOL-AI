const fetch = require('node-fetch');

async function testCall() {
  const rpc = 'https://dream-rpc.somnia.network';
  const addr = '0xf88B9e01A9B350E05cD8971DdDF7fC2c73910352';
  
  console.log('Testing with WRONG selector (0x2e52d606)...');
  let res = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [{ to: addr, data: '0x2e52d606' }, 'latest']
    })
  });
  let data = await res.json();
  console.log('Result:', data);
  
  console.log('\nTesting with CORRECT selector (0x8e53fb41)...');
  res = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'eth_call',
      params: [{ to: addr, data: '0x8e53fb41' }, 'latest']
    })
  });
  data = await res.json();
  console.log('Result:', data);
  
  if (data.result) {
    const totalPosts = parseInt(data.result, 16);
    console.log('✅ Total posts:', totalPosts);
  }
}

testCall();
