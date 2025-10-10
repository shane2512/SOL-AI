# 🚀 Enhanced SOL AI Deployment Guide

## Prerequisites
- Node.js installed
- Hardhat setup
- Somnia testnet access
- Private key with testnet funds

## Step 1: Install Dependencies
```bash
cd contracts
npm install
```

## Step 2: Compile Contracts
```bash
npx hardhat compile
```

## Step 3: Deploy Enhanced Contracts
```bash
npx hardhat run deploy.js --network somnia
```

## Step 4: Update Environment Variables

After deployment, update the following files with the new contract addresses:

### contracts/.env
```env
SOCIAL_POSTS_ADDRESS=<deployed_address>
MODERATOR_ADDRESS=<deployed_address>
REPUTATION_SYSTEM_ADDRESS=<deployed_address>
REPUTATION_SBT_ADDRESS=<deployed_address>
SOL_TOKEN_ADDRESS=<deployed_address>
INCENTIVE_SYSTEM_ADDRESS=<deployed_address>
GOVERNANCE_SYSTEM_ADDRESS=<deployed_address>
```

### agent/.env
```env
REPUTATION_SYSTEM_ADDRESS=<deployed_address>
REPUTATION_SBT_ADDRESS=<deployed_address>
SOL_TOKEN_ADDRESS=<deployed_address>
INCENTIVE_SYSTEM_ADDRESS=<deployed_address>
GOVERNANCE_SYSTEM_ADDRESS=<deployed_address>
```

### app/.env.local
```env
NEXT_PUBLIC_REPUTATION_SYSTEM_ADDRESS=<deployed_address>
NEXT_PUBLIC_REPUTATION_SBT_ADDRESS=<deployed_address>
NEXT_PUBLIC_SOL_TOKEN_ADDRESS=<deployed_address>
NEXT_PUBLIC_INCENTIVE_SYSTEM_ADDRESS=<deployed_address>
NEXT_PUBLIC_GOVERNANCE_SYSTEM_ADDRESS=<deployed_address>
```

## Step 5: Generate ABIs
After deployment, copy the ABI files:
```bash
# Copy ABIs to frontend
cp artifacts/contracts/ReputationSystem.sol/ReputationSystem.json app/contracts/abis/
cp artifacts/contracts/ReputationSBT.sol/ReputationSBT.json app/contracts/abis/
cp artifacts/contracts/IncentiveSystem.sol/SOLToken.json app/contracts/abis/
cp artifacts/contracts/IncentiveSystem.sol/IncentiveSystem.json app/contracts/abis/
cp artifacts/contracts/GovernanceSystem.sol/GovernanceSystem.json app/contracts/abis/
```

## Step 6: Restart Services
```bash
# Restart agent
cd agent
python app.py

# Restart frontend
cd app
npm run dev
```

## 🎯 Enhanced Features Available After Deployment

### 🏆 Reputation System
- On-chain reputation tracking
- Tier-based user classification
- Reputation-based SBT minting

### 💰 Incentive System
- SOL token rewards for quality content
- Daily reward limits
- Reputation-based multipliers

### ⚖️ Governance System
- Community appeals for flagged content
- Reputation-weighted voting
- Transparent decision making

### 🤖 Enhanced AI Agent
- Multi-contract integration
- Automatic reputation updates
- Incentive distribution
- Governance event monitoring

## 🔧 Troubleshooting

### Contract Deployment Issues
- Ensure sufficient testnet funds
- Check network configuration
- Verify contract compilation

### ABI Issues
- Regenerate ABIs after compilation
- Ensure correct file paths
- Check contract addresses in .env files

### Agent Integration
- Verify all contract addresses in agent .env
- Check HF_TOKEN for AI model access
- Ensure proper network connectivity

## 📋 Contract Addresses Template

After deployment, your addresses should look like:
```
SocialPosts: 0x...
Moderator: 0x...
ReputationSystem: 0x...
ReputationSBT: 0x...
SOLToken: 0x...
IncentiveSystem: 0x...
GovernanceSystem: 0x...
```

Copy these to all .env files as specified above.
