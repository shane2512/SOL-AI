const { ethers } = require("hardhat");

async function main() {
  const MODERATOR_ADDRESS = "0x6F8234C0c0330193BaB7bc079AB74d109367C2ed";
  const SOCIAL_ADDRESS = "0x543D67754A05c60035f57DA9Dc7FA6685dCe6A8B";
  
  console.log("=" * 60);
  console.log("FLAGGING POSTS");
  console.log("=".repeat(60));
  
  const [signer] = await ethers.getSigners();
  console.log(`\nSigner: ${signer.address}`);
  
  const Moderator = await ethers.getContractFactory("Moderator");
  const moderator = Moderator.attach(MODERATOR_ADDRESS);
  
  const SocialPosts = await ethers.getContractFactory("SocialPosts");
  const social = SocialPosts.attach(SOCIAL_ADDRESS);
  
  // Get total posts
  const totalPosts = await social.totalPosts();
  console.log(`Total posts: ${totalPosts}`);
  
  // Flag last two posts
  const postsToFlag = [3, 4];
  
  for (const postId of postsToFlag) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Flagging Post #${postId}`);
    console.log("=".repeat(60));
    
    try {
      // Get post details
      const post = await social.getPost(postId);
      console.log(`Author: ${post[1]}`);
      console.log(`Content: "${post[2]}"`);
      console.log(`Already flagged: ${post[3]}`);
      
      if (post[3]) {
        console.log("⚠️ Post already flagged, skipping");
        continue;
      }
      
      // Flag the post
      const scoreBp = 5000; // 50%
      const model = "manual-flag";
      
      console.log(`\nFlagging with score: ${scoreBp} BP (${scoreBp/100}%)`);
      
      const tx = await moderator.flagPost(postId, scoreBp, model);
      console.log(`📤 Transaction sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`✅ Post flagged successfully!`);
      console.log(`   Block: ${receipt.blockNumber}`);
      console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
      
    } catch (error) {
      console.log(`❌ Error flagging post ${postId}:`);
      console.log(`   ${error.message}`);
      if (error.data) {
        console.log(`   Data: ${error.data}`);
      }
    }
  }
  
  console.log(`\n${"=".repeat(60)}`);
  console.log("FLAGGING COMPLETE");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
