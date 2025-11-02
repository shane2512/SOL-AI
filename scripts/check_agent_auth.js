require('dotenv').config({ path: '../agent/.env' });
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const MODERATOR_ADDR = process.env.MODERATOR_ADDRESS || "0x6F8234C0c0330193BaB7bc079AB74d109367C2ed";
const AGENT_KEY = process.env.AGENT_PRIVATE_KEY || "bca1a949dd18c49712217e3cea297f00d80ed2177de7d8d0048c0c358a0dae44";
const RPC_URL = process.env.SOMNIA_RPC_URL || "https://dream-rpc.somnia.network";

const moderatorAbi = JSON.parse(fs.readFileSync(path.join(__dirname, '../app/contracts/abis/Moderator.json'), 'utf8'));

async function checkAuth() {
    console.log('🔍 Checking agent authorization...\n');
    
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(AGENT_KEY, provider);
    const moderator = new ethers.Contract(MODERATOR_ADDR, moderatorAbi.abi || moderatorAbi, provider);
    
    console.log(`Agent Address: ${wallet.address}`);
    console.log(`Moderator Contract: ${MODERATOR_ADDR}\n`);
    
    try {
        const isAuthorized = await moderator.agents(wallet.address);
        console.log(`Authorization Status: ${isAuthorized ? '✅ AUTHORIZED' : '❌ NOT AUTHORIZED'}`);
        
        if (!isAuthorized) {
            console.log('\n⚠️ PROBLEM: Agent is NOT authorized!');
            console.log('📝 Solution: Run the authorization script from contracts folder:');
            console.log('   cd contracts');
            console.log('   node authorize_agent.js');
        } else {
            console.log('\n✅ Agent is properly authorized and can flag posts!');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkAuth();
