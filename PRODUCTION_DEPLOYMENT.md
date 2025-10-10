# 🚀 SOL AI Production Deployment Guide

## 📋 Prerequisites
- Vercel account for frontend deployment
- Render account for agent deployment
- All contracts deployed (✅ Complete)
- Environment variables configured (✅ Complete)

## 🎯 Deployment Steps

### 1. Deploy Frontend to Vercel

```bash
cd app
npm run build
```

**Vercel Environment Variables:**
```env
NEXT_PUBLIC_SOMNIA_RPC_URL=https://dream-rpc.somnia.network
NEXT_PUBLIC_SOMNIA_WSS_URL=wss://dream-rpc.somnia.network/ws
NEXT_PUBLIC_CHAIN_ID=50312
NEXT_PUBLIC_SOCIAL_POSTS_ADDRESS=0xf88B9e01A9B350E05cD8971DdDF7fC2c73910352
NEXT_PUBLIC_MODERATOR_ADDRESS=0x7f37417F66eA2b322CDF145DFd0b45ff1794bf36
NEXT_PUBLIC_REPUTATION_SYSTEM_ADDRESS=0x08Eadf0aB342F878e55bBF05f5CB0dc47fb451FA
NEXT_PUBLIC_REPUTATION_SBT_ADDRESS=0x6A7d8b62693866cAAd79761d49D7b62f0D008514
NEXT_PUBLIC_SOL_TOKEN_ADDRESS=0x69769614f5346E27411E65F8B0A45B7d9e050f17
NEXT_PUBLIC_INCENTIVE_SYSTEM_ADDRESS=0xEa024B4A65c9A13267367bA9499839d4c6d9aC14
NEXT_PUBLIC_GOVERNANCE_SYSTEM_ADDRESS=0x0fb8dF77cf5B9fe414f2137f9FBaD4712fcfEF60
NEXT_PUBLIC_AGENT_URL=https://sol-ai-moderator-agent.onrender.com
```

### 2. Deploy Enhanced Agent to Render

**Render Environment Variables:**
```env
SOMNIA_RPC_URL=https://dream-rpc.somnia.network
SOMNIA_WSS_URL=wss://dream-rpc.somnia.network/ws
CHAIN_ID=50312
SOCIAL_POSTS_ADDRESS=0xf88B9e01A9B350E05cD8971DdDF7fC2c73910352
MODERATOR_ADDRESS=0x7f37417F66eA2b322CDF145DFd0b45ff1794bf36
REPUTATION_SYSTEM_ADDRESS=0x08Eadf0aB342F878e55bBF05f5CB0dc47fb451FA
REPUTATION_SBT_ADDRESS=0x6A7d8b62693866cAAd79761d49D7b62f0D008514
SOL_TOKEN_ADDRESS=0x69769614f5346E27411E65F8B0A45B7d9e050f17
INCENTIVE_SYSTEM_ADDRESS=0xEa024B4A65c9A13267367bA9499839d4c6d9aC14
GOVERNANCE_SYSTEM_ADDRESS=0x0fb8dF77cf5B9fe414f2137f9FBaD4712fcfEF60
AGENT_PRIVATE_KEY=your_agent_private_key_here
HF_TOKEN=your_huggingface_token_here
MODEL_NAME=unitary/toxic-bert
TOXICITY_THRESHOLD_BP=2500
```

### 3. Test Complete System

#### Frontend Features:
- ✅ Wallet connection (MetaMask)
- ✅ Post creation and feed
- ✅ AI moderation with flagged content
- ✅ Real-time event logging
- ✅ Profile customization
- ✅ Search and filtering
- 🆕 **Reputation Dashboard** - View user reputation, tiers, and SBTs
- 🆕 **Governance Panel** - Create and vote on appeals
- 🆕 **Token Rewards** - Claim SOL tokens for quality content

#### Agent Features:
- ✅ AI content moderation (toxic-bert)
- ✅ Real-time post monitoring
- 🆕 **Reputation Updates** - Automatic reputation calculation
- 🆕 **Incentive Distribution** - Token rewards for safe posts
- 🆕 **Governance Integration** - Appeal processing

### 4. Verification Checklist

**Frontend (Vercel):**
- [ ] App loads without errors
- [ ] Wallet connection works
- [ ] Post creation functions
- [ ] Reputation dashboard displays data
- [ ] Governance panel accessible
- [ ] All contract addresses correct

**Agent (Render):**
- [ ] Agent starts successfully
- [ ] All contracts detected
- [ ] Monitoring active
- [ ] Reputation updates working
- [ ] Incentive distribution functional

**Integration:**
- [ ] Posts get moderated automatically
- [ ] Reputation updates after moderation
- [ ] Token rewards distributed
- [ ] Appeals can be created
- [ ] Real-time events working

## 🔧 Troubleshooting

### Common Issues:

1. **Contract ABI Errors**
   - Ensure all ABI files copied to `app/contracts/abis/`
   - Check contract addresses in environment variables

2. **Agent Connection Issues**
   - Verify all contract addresses in agent .env
   - Check HF_TOKEN for AI model access
   - Ensure sufficient testnet funds

3. **Frontend Contract Errors**
   - Check browser console for specific errors
   - Verify MetaMask network (Somnia testnet)
   - Confirm contract addresses match deployment

### Monitoring:

- **Agent Status**: `https://your-agent-url.onrender.com/health`
- **Agent Stats**: `https://your-agent-url.onrender.com/stats`
- **Frontend**: Check browser console for errors

## 🎉 Success Metrics

When everything is working:
- Users can create posts and see them moderated
- Reputation scores update based on content quality
- Token rewards are distributed for safe posts
- Community can appeal flagged content
- All features work seamlessly together

## 📱 User Flow

1. **Connect Wallet** → MetaMask integration
2. **Create Profile** → Customize display name and bio
3. **Post Content** → AI moderation in real-time
4. **Earn Reputation** → Based on content quality
5. **Claim Rewards** → SOL tokens for safe posts
6. **Participate in Governance** → Appeal unfair flags
7. **Mint SBTs** → Reputation-based achievements

Your complete Web3 social media platform with AI moderation, reputation system, token incentives, and community governance is now live! 🚀
