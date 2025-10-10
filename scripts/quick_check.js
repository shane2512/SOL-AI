const fetch = require('node-fetch');

async function quickCheck() {
  const rpc = 'https://dream-rpc.somnia.network';
  const addr = '0xf88B9e01A9B350E05cD8971DdDF7fC2c73910352';
  
  console.log('Checking contract at:', addr);
  
  const res = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_getCode',
      params: [addr, 'latest']
    })
  });
  
  const data = await res.json();
  
  if (data.result === '0x') {
    console.log('❌ NO CONTRACT DEPLOYED AT THIS ADDRESS');
    console.log('You need to redeploy the contracts!');
  } else {
    console.log('✅ Contract exists, code length:', data.result.length);
  }
}

quickCheck();
