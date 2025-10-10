# Fix Flagging Issue - Missing Environment Variables

## Problem
The agent logs show:
```
ENV: SOCIAL_POSTS_ADDRESS=None
ENV: MODERATOR_ADDRESS=None
```

This causes the monitoring loop to fail with:
```
Error in monitoring loop: Could not transact with/call contract function
```

## Solution
Add the missing environment variables to your Render service.

## Steps to Fix

### 1. Go to Render Dashboard
- Navigate to your agent service: https://dashboard.render.com/
- Click on your `sol-ai-moderator-agent` service
- Go to the **Environment** tab

### 2. Add Missing Variables
Add these two environment variables:

| Key | Value |
|-----|-------|
| `SOCIAL_POSTS_ADDRESS` | `0xf88B9e01A9B350E05cD8971DdDF7fC2c73910352` |
| `MODERATOR_ADDRESS` | `0x7f37417F66eA2b322CDF145DFd0b45ff1794bf36` |

### 3. Save and Redeploy
- Click **Save Changes**
- Render will automatically redeploy your service
- Wait 2-3 minutes for the deployment to complete

### 4. Verify the Fix
After redeployment, check the logs. You should see:
```
ENV: SOCIAL_POSTS_ADDRESS=0xf88B9e01A9B350E05cD8971DdDF7fC2c73910352
ENV: MODERATOR_ADDRESS=0x7f37417F66eA2b322CDF145DFd0b45ff1794bf36
```

And the monitoring should start successfully:
```
🔍 Monitoring active - No new posts (total: X)
```

### 5. Test Flagging
1. Go to your frontend: https://sol-ai-jade.vercel.app/
2. Create a post with toxic content (e.g., "I hate you stupid idiot")
3. Wait 15-30 seconds
4. The post should be flagged automatically

## Current Environment Variables
Based on your `.env.example`, you should have these set in Render:

**Required (Core):**
- ✅ `SOMNIA_RPC_URL` = `https://dream-rpc.somnia.network`
- ❌ `SOCIAL_POSTS_ADDRESS` = **MISSING - ADD THIS**
- ❌ `MODERATOR_ADDRESS` = **MISSING - ADD THIS**
- ✅ `AGENT_PRIVATE_KEY` = (your private key)
- ✅ `HF_TOKEN` = (your Hugging Face token)
- ✅ `GEMINI_API_KEY` = (your Gemini API key)

**Optional (Enhanced Features):**
- ✅ `REPUTATION_SYSTEM_ADDRESS` = `0x08Eadf0aB342F878e55bBF05f5CB0dc47fb451FA`
- ✅ `INCENTIVE_SYSTEM_ADDRESS` = `0xEa024B4A65c9A13267367bA9499839d4c6d9aC14`
- ✅ `GOVERNANCE_SYSTEM_ADDRESS` = `0x0fb8dF77cf5B9fe414f2137f9FBaD4712fcfEF60`

## Why This Happened
The enhanced contracts were added later, but the core contract addresses weren't migrated to Render's environment variables. The agent code defaults to `None` when these variables are missing, which causes the monitoring to fail silently.
