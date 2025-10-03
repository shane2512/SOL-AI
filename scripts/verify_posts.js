// Script to verify posts and their flagging status
const { ethers } = require('ethers');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../app/.env') });

// Import contract ABIs
const SocialPostsABI = require('../app/contracts/abis/SocialPosts.json');
const ModeratorABI = require('../app/contracts/abis/Moderator.json');

const SOMNIA_RPC_URL = process.env.NEXT_PUBLIC_SOMNIA_RPC_URL;
const SOCIAL_POSTS_ADDRESS = process.env.NEXT_PUBLIC_SOCIAL_POSTS_ADDRESS;
const MODERATOR_ADDRESS = process.env.NEXT_PUBLIC_MODERATOR_ADDRESS;

console.log('🔧 Configuration:');
console.log(`RPC URL: ${SOMNIA_RPC_URL}`);
console.log(`Social Posts: ${SOCIAL_POSTS_ADDRESS}`);
console.log(`Moderator: ${MODERATOR_ADDRESS}\n`);

async function verifyPosts() {
  console.log('🔍 Verifying Posts and Flagging Status...\n');

  try {
    // Connect to network
    const provider = new ethers.JsonRpcProvider(SOMNIA_RPC_URL);
    console.log('✅ Connected to Somnia network');

    // Initialize contracts
    const socialContract = new ethers.Contract(SOCIAL_POSTS_ADDRESS, SocialPostsABI, provider);
    const moderatorContract = new ethers.Contract(MODERATOR_ADDRESS, ModeratorABI, provider);

    // Get total posts
    const totalPosts = await socialContract.totalPosts();
    console.log(`📊 Total posts: ${totalPosts}\n`);

    if (totalPosts == 0) {
      console.log('ℹ️ No posts found');
      return;
    }

    // Check each post
    for (let i = 1; i <= totalPosts; i++) {
      try {
        console.log(`--- Post ${i} ---`);
        
        // Get post details
        const post = await socialContract.getPost(i);
        // Contract returns: [id, author, content, flagged] (no timestamp in this version)
        const [id, author, content, flagged] = post;

        console.log(`📝 Content: "${content}"`);
        console.log(`👤 Author: ${author}`);
        console.log(`🚩 Flagged: ${flagged ? '✅ YES' : '❌ NO'}`);

        // Analyze content for toxicity (same logic as agent)
        const toxicityScore = analyzeToxicity(content);
        const shouldBeFlagged = toxicityScore >= 2500; // 25% threshold (lowered)
        
        console.log(`🧠 Toxicity Score: ${toxicityScore} BP (${(toxicityScore/100).toFixed(1)}%)`);
        console.log(`🎯 Should be flagged: ${shouldBeFlagged ? '✅ YES' : '❌ NO'}`);

        // Check if flagging is correct
        if (flagged === shouldBeFlagged) {
          console.log(`✅ CORRECT: Flagging status matches toxicity analysis`);
        } else if (shouldBeFlagged && !flagged) {
          console.log(`⚠️  ISSUE: Post should be flagged but isn't (Agent may need to process this)`);
        } else if (!shouldBeFlagged && flagged) {
          console.log(`⚠️  ISSUE: Post is flagged but shouldn't be (May be manually flagged)`);
        }

        console.log(''); // Empty line for readability
      } catch (error) {
        console.log(`❌ Error checking post ${i}:`, error.message);
      }
    }

    // Check agent authorization
    console.log('--- Agent Authorization Check ---');
    try {
      const isAuthorized = await moderatorContract.authorizedAgents(process.env.AGENT_PRIVATE_KEY ? 
        ethers.computeAddress('0x' + process.env.AGENT_PRIVATE_KEY) : '0x0');
      console.log(`🤖 Agent authorized: ${isAuthorized ? '✅ YES' : '❌ NO'}`);
    } catch (error) {
      console.log('❌ Could not check agent authorization:', error.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Toxicity analysis function (enhanced with missing keywords)
function analyzeToxicity(text) {
  const toxic_keywords = {
    'high': ['kill', 'die', 'murder', 'suicide', 'terrorist', 'bomb', 'weapon', 'fuck'],
    'medium': ['hate', 'stupid', 'idiot', 'moron', 'loser', 'pathetic', 'disgusting', 'bastard', 'bloody'],
    'low': ['damn', 'hell', 'crap', 'sucks', 'annoying', 'boring']
  };
  
  const lowerText = text.toLowerCase();
  let score = 500; // Base score (5%)
  
  // Check for high toxicity keywords
  for (const keyword of toxic_keywords.high) {
    if (lowerText.includes(keyword)) {
      score += 2500; // Add 25% per high-toxicity word
    }
  }
  
  // Check for medium toxicity keywords  
  for (const keyword of toxic_keywords.medium) {
    if (lowerText.includes(keyword)) {
      score += 1500; // Add 15% per medium-toxicity word
    }
  }
      
  // Check for low toxicity keywords
  for (const keyword of toxic_keywords.low) {
    if (lowerText.includes(keyword)) {
      score += 800; // Add 8% per low-toxicity word
    }
  }
  
  // Cap at 9500 (95%)
  return Math.min(score, 9500);
}

// Run verification
verifyPosts().catch(console.error);
