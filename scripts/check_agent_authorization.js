const { ethers } = require("ethers");
const ModeratorAbiFile = require("../app/contracts/abis/Moderator.json");
require('dotenv').config({ path: '../agent/.env' });

const SOMNIA_RPC = 'https://dream-rpc.somnia.network';
const MODERATOR_ADDR = '0x6F8234C0c0330193BaB7bc079AB74d109367C2ed';

// Get agent address from private key
const AGENT_PRIV = process.env.AGENT_PRIVATE_KEY;

async function checkAuthorization() {
  console.log('🔍 Checking Agent Authorization\n');
  
  const provider = new ethers.providers.JsonRpcProvider(SOMNIA_RPC);
  const ModeratorAbi = ModeratorAbiFile.abi || ModeratorAbiFile;
  const contract = new ethers.Contract(MODERATOR_ADDR, ModeratorAbi, provider);
  
  try {
    // Get agent address
    const wallet = new ethers.Wallet(AGENT_PRIV, provider);
    const agentAddress = wallet.address;
    
    console.log(`🤖 Agent Address: ${agentAddress}\n`);
    
    // Check balance
    const balance = await provider.getBalance(agentAddress);
    console.log(`💰 Agent Balance: ${ethers.utils.formatEther(balance)} ETH`);
    
    if (balance.eq(0)) {
      console.log(`   ❌ PROBLEM: Agent has NO gas!`);
      console.log(`   💡 Solution: Send testnet tokens to ${agentAddress}`);
    } else {
      console.log(`   ✅ Agent has gas for transactions`);
    }
    
    // Get owner
    console.log(`\n🔐 Checking Authorization...`);
    const owner = await contract.owner();
    console.log(`   Contract Owner: ${owner}`);
    console.log(`   Agent Address:  ${agentAddress}`);
    
    if (owner.toLowerCase() === agentAddress.toLowerCase()) {
      console.log(`\n✅ Agent IS the contract owner - fully authorized!`);
    } else {
      console.log(`\n⚠️ Agent is NOT the owner`);
      console.log(`   The agent wallet needs to be the deployer wallet`);
      console.log(`   OR the owner needs to authorize this agent`);
    }
    
    console.log(`\n📋 Summary:`);
    console.log(`   ✅ Agent has gas: ${ethers.utils.formatEther(balance)} ETH`);
    console.log(`   ${owner.toLowerCase() === agentAddress.toLowerCase() ? '✅' : '❌'} Agent is owner/authorized`);
    
    if (owner.toLowerCase() !== agentAddress.toLowerCase()) {
      console.log(`\n🔧 To fix: Use the owner wallet (${owner}) to:`);
      console.log(`   1. Transfer ownership to agent, OR`);
      console.log(`   2. Add agent as authorized moderator`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAuthorization();
