require('dotenv').config({ path: '../contracts/.env' });
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const SOCIAL_ADDR = "0x543D67754A05c60035f57DA9Dc7FA6685dCe6A8B";
const MODERATOR_ADDR = "0x6F8234C0c0330193BaB7bc079AB74d109367C2ed";
const RPC_URL = "https://dream-rpc.somnia.network";

// Load ABIs
const socialAbi = JSON.parse(fs.readFileSync(path.join(__dirname, '../app/contracts/abis/SocialPosts.json'), 'utf8'));
const moderatorAbi = JSON.parse(fs.readFileSync(path.join(__dirname, '../app/contracts/abis/Moderator.json'), 'utf8'));

async function checkPosts() {
    console.log('🔍 Checking all posts on blockchain...\n');
    
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const social = new ethers.Contract(SOCIAL_ADDR, socialAbi.abi || socialAbi, provider);
    
    try {
        const totalPosts = await social.totalPosts();
        console.log(`📊 Total posts: ${totalPosts.toString()}\n`);
        
        for (let i = 1; i <= totalPosts; i++) {
            try {
                const post = await social.getPost(i);
                const [id, author, content, flagged, timestamp] = post;
                
                console.log(`\n📝 Post #${i}:`);
                console.log(`   Author: ${author}`);
                console.log(`   Content: "${content}"`);
                console.log(`   Flagged: ${flagged ? '🚩 YES' : '✅ NO'}`);
                console.log(`   Timestamp: ${new Date(timestamp * 1000).toLocaleString()}`);
            } catch (err) {
                console.log(`❌ Error reading post #${i}:`, err.message);
            }
        }
        
        // Count flagged vs safe
        let flaggedCount = 0;
        let safeCount = 0;
        
        for (let i = 1; i <= totalPosts; i++) {
            try {
                const post = await social.getPost(i);
                if (post[3]) flaggedCount++;
                else safeCount++;
            } catch (err) {}
        }
        
        console.log(`\n\n📊 Summary:`);
        console.log(`   Total: ${totalPosts}`);
        console.log(`   Safe: ${safeCount} ✅`);
        console.log(`   Flagged: ${flaggedCount} 🚩`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkPosts();
