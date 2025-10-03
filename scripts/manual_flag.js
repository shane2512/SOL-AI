// Script to manually flag posts
const { ethers } = require('ethers');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../agent/.env') });

// Import contract ABIs
const ModeratorABI = require('../app/contracts/abis/Moderator.json');

const SOMNIA_RPC_URL = process.env.SOMNIA_RPC_URL;
const MODERATOR_ADDRESS = process.env.MODERATOR_ADDRESS;
const AGENT_PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY;

console.log('🔧 Configuration:');
console.log(`RPC URL: ${SOMNIA_RPC_URL}`);
console.log(`Moderator: ${MODERATOR_ADDRESS}`);
console.log(`Agent Key: ${AGENT_PRIVATE_KEY ? 'Present' : 'Missing'}\n`);

async function flagPost(postId, reason = "manual-moderation") {
  console.log(`🚩 Manually flagging post ${postId}...\n`);

  try {
    if (!AGENT_PRIVATE_KEY) {
      throw new Error('AGENT_PRIVATE_KEY not found in environment');
    }

    // Connect to network
    const provider = new ethers.JsonRpcProvider(SOMNIA_RPC_URL);
    const wallet = new ethers.Wallet(AGENT_PRIVATE_KEY, provider);
    
    console.log('✅ Connected to Somnia network');
    console.log(`🤖 Agent address: ${wallet.address}`);

    // Initialize moderator contract
    const moderatorContract = new ethers.Contract(MODERATOR_ADDRESS, ModeratorABI, wallet);

    // Check if agent is authorized (skip check for now, try to flag directly)
    console.log('⚠️ Skipping authorization check, attempting to flag directly');

    // Flag the post with high toxicity score (90%)
    const toxicityScore = 9000; // 90% toxicity
    
    console.log(`📝 Flagging post ${postId} with score ${toxicityScore} BP (${toxicityScore/100}%)`);
    
    // Estimate gas
    const gasEstimate = await moderatorContract.flagPost.estimateGas(
      postId, 
      toxicityScore, 
      reason
    );
    
    console.log(`⛽ Estimated gas: ${gasEstimate}`);

    // Send transaction
    const tx = await moderatorContract.flagPost(
      postId,
      toxicityScore,
      reason,
      {
        gasLimit: Math.floor(Number(gasEstimate) * 1.2), // 20% buffer
        gasPrice: ethers.parseUnits('100', 'gwei'),
      }
    );

    console.log(`📤 Transaction sent: ${tx.hash}`);
    console.log('⏳ Waiting for confirmation...');

    // Wait for confirmation
    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      console.log(`✅ Post ${postId} flagged successfully!`);
      console.log(`🔗 Transaction: ${tx.hash}`);
      console.log(`⛽ Gas used: ${receipt.gasUsed}`);
    } else {
      console.log(`❌ Transaction failed`);
    }

  } catch (error) {
    console.error('❌ Error flagging post:', error.message);
  }
}

// Get post ID from command line arguments
const postId = process.argv[2];
const reason = process.argv[3] || "manual-moderation";

if (!postId) {
  console.log('Usage: node manual_flag.js <postId> [reason]');
  console.log('Example: node manual_flag.js 1 "inappropriate-content"');
  process.exit(1);
}

// Run flagging
flagPost(parseInt(postId), reason).catch(console.error);
