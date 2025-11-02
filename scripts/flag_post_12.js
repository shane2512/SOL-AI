require('dotenv').config({ path: '../agent/.env' });
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const MODERATOR_ADDR = process.env.MODERATOR_ADDRESS;
const AGENT_KEY = process.env.AGENT_PRIVATE_KEY;
const RPC_URL = process.env.SOMNIA_RPC_URL;

const moderatorAbi = JSON.parse(fs.readFileSync(path.join(__dirname, '../app/contracts/abis/Moderator.json'), 'utf8'));

async function flagPost12() {
    console.log('🚩 Flagging Post #12...\n');
    
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(AGENT_KEY, provider);
    const moderator = new ethers.Contract(MODERATOR_ADDR, moderatorAbi.abi || moderatorAbi, wallet);
    
    try {
        console.log(`Agent: ${wallet.address}`);
        console.log(`Post: #12 - "destroy kill everyone"`);
        console.log(`Toxicity: High (should be flagged)\n`);
        
        const tx = await moderator.flagPost(12, 8000, "toxic-bert");
        console.log(`📝 Transaction sent: ${tx.hash}`);
        console.log(`⏳ Waiting for confirmation...`);
        
        const receipt = await tx.wait();
        console.log(`✅ Post #12 flagged successfully!`);
        console.log(`   Block: ${receipt.blockNumber}`);
        console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

flagPost12();
