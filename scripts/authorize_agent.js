const { ethers } = require("ethers");
const ModeratorAbi = require("../app/contracts/abis/Moderator.json");
require('dotenv').config({ path: '../agent/.env' });

const SOMNIA_RPC = 'https://dream-rpc.somnia.network';
const MODERATOR_ADDR = '0x6F8234C0c0330193BaB7bc079AB74d109367C2ed';
const AGENT_PRIV = process.env.AGENT_PRIVATE_KEY;

async function authorizeAgent() {
  console.log('🔐 Authorizing Agent in Moderator Contract\n');
  
  const provider = new ethers.providers.JsonRpcProvider(SOMNIA_RPC);
  const wallet = new ethers.Wallet(AGENT_PRIV, provider);
  const contract = new ethers.Contract(MODERATOR_ADDR, ModeratorAbi.abi || ModeratorAbi, wallet);
  
  try {
    const agentAddress = wallet.address;
    console.log(`🤖 Agent Address: ${agentAddress}`);
    
    // Check if already authorized
    const isAuthorized = await contract.agents(agentAddress);
    console.log(`   Currently authorized: ${isAuthorized ? '✅ YES' : '❌ NO'}\n`);
    
    if (isAuthorized) {
      console.log('✅ Agent is already authorized!');
      return;
    }
    
    // Authorize the agent
    console.log('📡 Authorizing agent...');
    const tx = await contract.setAgent(agentAddress, true, {
      gasLimit: 100000,
      gasPrice: ethers.utils.parseUnits('100', 'gwei')
    });
    
    console.log(`   Transaction sent: ${tx.hash}`);
    console.log('   Waiting for confirmation...');
    
    const receipt = await tx.wait();
    console.log(`\n✅ Agent authorized successfully!`);
    console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
    console.log(`   Block: ${receipt.blockNumber}`);
    
    // Verify
    const isNowAuthorized = await contract.agents(agentAddress);
    console.log(`\n🔍 Verification: ${isNowAuthorized ? '✅ AUTHORIZED' : '❌ FAILED'}`);
    
    if (isNowAuthorized) {
      console.log('\n🎉 Agent can now flag posts!');
      console.log('   Run: node force_scan_and_flag.js');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.reason) console.error(`   Reason: ${error.reason}`);
  }
}

authorizeAgent();
