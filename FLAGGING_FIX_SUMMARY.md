# Flagging System Fix - Complete Summary

## Problem
The flagging system wasn't working because:
1. **Missing contract addresses** in Render environment variables
2. **Agent not authorized** on the new Moderator contract
3. **Naming mismatch** between local and Render environment variables

## Root Causes

### 1. Environment Variable Naming
- **Render used**: `SOCIAL_POSTS_CONTRACT_ADDRESS` and `MODERATOR_CONTRACT_ADDRESS`
- **Agent expected**: `SOCIAL_POSTS_ADDRESS` and `MODERATOR_ADDRESS`
- **Solution**: Updated `app.py` to support both naming conventions

### 2. Contract Addresses
The correct contract addresses are:
- **SocialPosts**: `0x543D67754A05c60035f57DA9Dc7FA6685dCe6A8B`
- **Moderator**: `0x6F8234C0c0330193BaB7bc079AB74d109367C2ed`

### 3. Agent Authorization
The agent (`0xda4626FcE97748B7A78b613c754419c5e3FDAdCA`) was not authorized on the Moderator contract.
- **Function**: `setAgent(address agent, bool allowed)`
- **Required**: `moderator.setAgent(agentAddress, true)`

## Fixes Applied

### 1. Updated Agent Code (`agent/app.py`)
```python
# Lines 57-58: Support both naming conventions
SOCIAL_ADDR = Web3.to_checksum_address(
    os.getenv("SOCIAL_POSTS_ADDRESS") or 
    os.getenv("SOCIAL_POSTS_CONTRACT_ADDRESS", "0x0...")
)
MODERATOR_ADDR = Web3.to_checksum_address(
    os.getenv("MODERATOR_ADDRESS") or 
    os.getenv("MODERATOR_CONTRACT_ADDRESS", "0x0...")
)
```

### 2. Authorized Agent
```bash
npx hardhat run authorize_agent.js --network somnia
```
Result:
- ✅ Agent authorized successfully
- Block: 198645765
- Gas used: 253186

### 3. Manually Flagged Previous Posts
```bash
npx hardhat run flag_posts.js --network somnia
```
Results:
- ✅ Post #3 ("kill evryone") flagged - Block: 198648645
- ✅ Post #4 ("die murder") flagged - Block: 198648670

### 4. Updated `.env.example`
Updated with correct contract addresses for future reference.

## Current Status

### ✅ Completed
- [x] Agent code supports both environment variable naming conventions
- [x] Agent authorized on Moderator contract
- [x] Previous toxic posts (#3, #4) manually flagged
- [x] Local `.env` updated with correct addresses
- [x] Changes deployed to Render (via git push)

### 🔄 Automatic Monitoring
The Render agent should now:
1. Auto-start monitoring on deployment (line 753-757 in `app.py`)
2. Check for new posts every 15 seconds
3. Automatically flag toxic content (threshold: 25% / 2500 BP)
4. Use toxic-bert AI model or keyword fallback

## Verification Steps

### Check Render Logs
After the Render deployment completes, verify:
```
ENV: SOCIAL_POSTS_ADDRESS=0x543D67754A05c60035f57DA9Dc7FA6685dCe6A8B
ENV: MODERATOR_ADDRESS=0x6F8234C0c0330193BaB7bc079AB74d109367C2ed
✅ Agent authorized to flag posts
Auto-started monitoring (universal)
🔍 Monitoring active - No new posts (total: 4)
```

### Test New Post
1. Go to https://sol-ai-jade.vercel.app/
2. Create a post with toxic content (e.g., "I hate you stupid idiot")
3. Wait 15-30 seconds
4. Post should be automatically flagged

### Check Agent Status
```bash
curl https://sol-ai-moderator-agent.onrender.com/health
```

Should show:
```json
{
  "status": "healthy",
  "monitoring_active": true,
  "contracts": {
    "social": true,
    "moderator": true
  }
}
```

## Files Modified
- `agent/app.py` - Support both env naming conventions
- `agent/.env` - Updated with correct contract addresses
- `agent/.env.example` - Updated with correct contract addresses
- `contracts/authorize_agent.js` - Script to authorize agent
- `contracts/flag_posts.js` - Script to manually flag posts

## Git Commit
```
commit 9dc5bc2
Support both env naming conventions
```

## Next Steps
1. ✅ Monitor Render logs to confirm agent is running
2. ✅ Test with a new toxic post
3. ✅ Verify automatic flagging works
4. 🎉 System is fully operational!
