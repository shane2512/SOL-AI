const fetch = require('node-fetch');
const { ethers } = require("ethers");
const SocialPostsAbi = require("../app/contracts/abis/SocialPosts.json");
const ModeratorAbi = require("../app/contracts/abis/Moderator.json");
require('dotenv').config({ path: '../agent/.env' });

const AGENT_URL = 'https://sol-ai-moderator-agent.onrender.com';
const SOMNIA_RPC = 'https://dream-rpc.somnia.network';
const SOCIAL_ADDR = '0x543D67754A05c60035f57DA9Dc7FA6685dCe6A8B';
const MODERATOR_ADDR = '0x6F8234C0c0330193BaB7bc079AB74d109367C2ed';
const AGENT_PRIV = process.env.AGENT_PRIVATE_KEY;

async function forceScanAndFlag() {
  console.log('🚨 FORCE SCAN AND FLAG ALL TOXIC POSTS\n');
  
  const provider = new ethers.providers.JsonRpcProvider(SOMNIA_RPC);
  const socialContract = new ethers.Contract(SOCIAL_ADDR, SocialPostsAbi.abi || SocialPostsAbi, provider);
  
  const wallet = new ethers.Wallet(AGENT_PRIV, provider);
  const moderatorContract = new ethers.Contract(MODERATOR_ADDR, ModeratorAbi.abi || ModeratorAbi, wallet);
  
  try {
    const totalPosts = await socialContract.totalPosts();
    console.log(`📊 Total posts: ${totalPosts}\n`);
    
    for (let i = 1; i <= Number(totalPosts); i++) {
      const post = await socialContract.getPost(i);
      const postId = Number(post[0]);
      const content = post[2];
      const flagged = post[3];
      
      console.log(`\n📝 Post #${postId}: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`);
      console.log(`   Currently flagged: ${flagged ? '❌ YES' : '✅ NO'}`);
      
      if (flagged) {
        console.log(`   ⏭️  Already flagged, skipping`);
        continue;
      }
      
      // Check toxicity with agent
      console.log(`   🔍 Checking toxicity...`);
      const response = await fetch(`${AGENT_URL}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content })
      });
      
      const result = await response.json();
      const toxicityPercent = result.toxicity_percentage;
      const isToxic = result.is_toxic;
      
      console.log(`   📊 Toxicity: ${toxicityPercent.toFixed(1)}% (threshold: 25%)`);
      
      if (isToxic) {
        console.log(`   ⚠️  TOXIC! Flagging on-chain...`);
        
        try {
          // Flag the post
          const scoreBp = result.toxicity_score_bp;
          
          // Build transaction manually with higher gas
          const gasEstimate = await moderatorContract.estimateGas.flagPost(postId, scoreBp, "toxic-bert");
          const tx = await moderatorContract.flagPost(postId, scoreBp, "toxic-bert", {
            gasLimit: gasEstimate.mul(2), // 2x buffer
            gasPrice: ethers.utils.parseUnits('100', 'gwei')
          });
          
          console.log(`   📡 Transaction sent: ${tx.hash}`);
          
          const receipt = await tx.wait();
          console.log(`   ✅ Post #${postId} FLAGGED! (Gas used: ${receipt.gasUsed.toString()})`);
        } catch (flagError) {
          console.log(`   ❌ Failed to flag: ${flagError.message}`);
          if (flagError.reason) console.log(`      Reason: ${flagError.reason}`);
        }
      } else {
        console.log(`   ✅ Safe content, no action needed`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Scan complete!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

forceScanAndFlag();
