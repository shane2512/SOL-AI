# 🛡️ SOL AI - Decentralized Social Media with AI Moderation

**SOL AI solves centralized content moderation by providing a decentralized social network with transparent AI-powered moderation, on-chain reputation, and community governance—eliminating censorship while maintaining content quality.**

## 🌟 Key Features

- **🔗 On-Chain Social Posts** - All posts stored immutably on blockchain
- **🤖 AI Content Moderation** - Autonomous AI agents using Gemini AI for toxicity detection
- **⚖️ Transparent Moderation** - All moderation decisions recorded on-chain with full transparency
- **🏆 Reputation System** - Earn reputation through quality content, lose it through violations
- **🎖️ Soulbound NFTs** - Non-transferable achievement badges for reputation milestones
- **💰 Token Rewards** - Earn SOL_AI tokens for creating quality content
- **🗳️ Community Governance** - Appeal moderation decisions through decentralized voting
- **📊 Real-Time Dashboard** - Live monitoring of AI agent activity and blockchain events
- **🎨 Modern UI** - Professional glassmorphism design with responsive layout

## 🏗️ Architecture

### Smart Contracts (Solidity)
- **SocialPosts** - Post creation, storage, and retrieval
- **Moderator** - AI agent authorization and content flagging
- **ReputationSystemV2** - User reputation tracking and tier management
- **ReputationSBT** - Soulbound token minting for achievements
- **SOLToken** - ERC-20 reward token
- **IncentiveSystem** - Token distribution and reward calculation
- **GovernanceSystem** - Community appeals and voting

### AI Agent (Python/Flask)
- **Gemini AI Integration** - Advanced content analysis
- **Autonomous Monitoring** - Continuous blockchain scanning
- **Multi-Model Fallback** - Reliable moderation with backup models
- **Gas Optimization** - Smart transaction management
- **RESTful API** - Status monitoring and control endpoints

### Frontend (Next.js/React)
- **Wallet Integration** - MetaMask connection
- **Real-Time Updates** - WebSocket event streaming
- **Profile Management** - Customizable user profiles
- **Post Feed** - Live content stream with moderation status
- **Event Logging** - Transparent activity monitoring
- **Responsive Design** - Mobile-first approach

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- MetaMask wallet
- Somnia testnet ETH ([Get testnet ETH](https://faucet.somnia.network))

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/SOL-AI.git
cd SOL-AI

# Install frontend dependencies
cd app
npm install

# Install agent dependencies
cd ../agents
pip install -r requirements.txt
```

### Configuration

Create environment files from examples:

**Frontend** (`app/.env.local`):
```env
NEXT_PUBLIC_SOCIAL_POSTS_ADDRESS=0x543D67754A05c60035f57DA9Dc7FA6685dCe6A8B
NEXT_PUBLIC_MODERATOR_ADDRESS=0x6F8234C0c0330193BaB7bc079AB74d109367C2ed
NEXT_PUBLIC_REPUTATION_SYSTEM_ADDRESS=0x998b918c100CaD31E2732b49Ca4e2507FC2BB2F0
NEXT_PUBLIC_REPUTATION_SBT_ADDRESS=0x86E0140075310710438A7aEC4EAeC5af0A1a604f
NEXT_PUBLIC_SOL_TOKEN_ADDRESS=0xC95F595431D815D8A1c6daE41dc06a1e38C1f5fA
NEXT_PUBLIC_INCENTIVE_SYSTEM_ADDRESS=0xD2F56c8E27e647224d4380565535D57fa5Bc27e0
NEXT_PUBLIC_GOVERNANCE_SYSTEM_ADDRESS=0x0fb8dF77cf5B9fe414f2137f9FBaD4712fcfEF60
NEXT_PUBLIC_SOMNIA_RPC_URL=https://dream-rpc.somnia.network
NEXT_PUBLIC_SOMNIA_WSS_URL=wss://dream-rpc.somnia.network/ws
NEXT_PUBLIC_CHAIN_ID=50312
NEXT_PUBLIC_AGENT_URL=https://sol-ai-moderator-agent.onrender.com
```

**AI Agent** (`agents/.env`):
```env
GEMINI_API_KEY=your_gemini_api_key
AGENT_PRIVATE_KEY=your_agent_private_key
SOCIAL_POSTS_ADDRESS=0x543D67754A05c60035f57DA9Dc7FA6685dCe6A8B
MODERATOR_ADDRESS=0x6F8234C0c0330193BaB7bc079AB74d109367C2ed
SOMNIA_RPC_URL=https://dream-rpc.somnia.network
```

### Running Locally

```bash
# Terminal 1: Start frontend
cd app
npm run dev
# Access at http://localhost:3000

# Terminal 2: Start AI agent
cd agents
python flagging_api.py
# Agent runs on http://localhost:5000
```

## 📋 Deployed Contract Addresses (Somnia Testnet)

| Contract | Address |
|----------|---------|
| **SocialPosts** | `0x543D67754A05c60035f57DA9Dc7FA6685dCe6A8B` |
| **Moderator** | `0x6F8234C0c0330193BaB7bc079AB74d109367C2ed` |
| **ReputationSystemV2** | `0x998b918c100CaD31E2732b49Ca4e2507FC2BB2F0` |
| **ReputationSBT** | `0x86E0140075310710438A7aEC4EAeC5af0A1a604f` |
| **SOLToken** | `0xC95F595431D815D8A1c6daE41dc06a1e38C1f5fA` |
| **IncentiveSystem** | `0xD2F56c8E27e647224d4380565535D57fa5Bc27e0` |
| **GovernanceSystem** | `0x0fb8dF77cf5B9fe414f2137f9FBaD4712fcfEF60` |

## 🌐 Network Configuration

- **Network**: Somnia Testnet
- **Chain ID**: 50312
- **RPC URL**: https://dream-rpc.somnia.network
- **WebSocket**: wss://dream-rpc.somnia.network/ws
- **Block Explorer**: https://explorer.somnia.network
- **Faucet**: https://faucet.somnia.network

### Add to MetaMask
```
Network Name: Somnia Testnet
RPC URL: https://dream-rpc.somnia.network
Chain ID: 50312
Currency Symbol: STM
```

## 🎮 Usage Guide

### For Users

1. **Connect Wallet**
   - Click "Connect Wallet" button
   - Approve MetaMask connection
   - Ensure you're on Somnia Testnet

2. **Create Posts**
   - Click "Create Post" button
   - Write content (max 280 characters)
   - Submit transaction
   - Wait for AI moderation

3. **View Content**
   - Browse post feed
   - See moderation status (✅ Safe / 🚩 Flagged)
   - Check your reputation score
   - View earned rewards

4. **Manage Profile**
   - Click profile in sidebar
   - Set display name and bio
   - View your stats and achievements
   - Check reputation tier

### For Developers

1. **Deploy Contracts**
   ```bash
   cd contracts
   npx hardhat run scripts/deploy.js --network somnia
   ```

2. **Authorize AI Agent**
   ```bash
   npx hardhat run scripts/authorize-agent.js --network somnia
   ```

3. **Monitor Agent**
   - Check agent status: `GET /health`
   - View moderation stats: `GET /stats`
   - Manual moderation: `POST /moderate`

## 🧠 AI Moderation System

### How It Works

1. **Content Analysis**
   - User creates post on blockchain
   - AI agent detects new post event
   - Gemini AI analyzes content for toxicity
   - Toxicity score calculated (0-100%)

2. **Moderation Decision**
   - Threshold: 25% toxicity
   - Above threshold → Post flagged
   - Below threshold → Post approved
   - Decision recorded on-chain

3. **Reputation Impact**
   - Safe posts: +2 reputation points
   - Flagged posts: -5 reputation points
   - Reputation affects rewards multiplier
   - Milestones unlock SBT achievements

### AI Models

- **Primary**: Gemini 1.5 Flash
- **Fallback**: Gemini 1.5 Pro
- **Detection**: Toxicity, hate speech, harassment, threats
- **Languages**: English (primary)

## 💎 Reputation & Rewards

### Reputation Tiers

| Tier | Points | Multiplier | Benefits |
|------|--------|------------|----------|
| **Newcomer** | 0-24 | 1.0x | Basic access |
| **Member** | 25-49 | 1.2x | +20% rewards |
| **Contributor** | 50-99 | 1.5x | +50% rewards |
| **Trusted** | 100-249 | 2.0x | Double rewards |
| **Leader** | 250+ | 3.0x | Triple rewards + SBT |

### Token Rewards

- **Base Reward**: 10 SOL_AI tokens per safe post
- **Reputation Multiplier**: Up to 3x for high reputation
- **Daily Cap**: 100 tokens per user
- **Distribution**: Automatic on post approval

### Soulbound NFTs

- **Non-transferable** achievement badges
- **Milestone-based** unlocking
- **On-chain proof** of reputation
- **Visual badges** in profile

## 🗳️ Governance & Appeals

### Appeal Process

1. User appeals flagged content
2. Stake required (prevents spam)
3. Community voting period (7 days)
4. Majority decision executed
5. Stake returned if appeal succeeds

### Voting Power

- Based on reputation tier
- Higher reputation = more voting weight
- Active participation rewarded
- Transparent vote counting

## 📁 Project Structure

```
SOL-AI/
├── contracts/              # Smart contracts
│   ├── contracts/         # Solidity source files
│   │   ├── SocialPosts.sol
│   │   ├── Moderator.sol
│   │   ├── ReputationSystemV2.sol
│   │   ├── ReputationSBT.sol
│   │   ├── SOLToken.sol
│   │   ├── IncentiveSystem.sol
│   │   └── GovernanceSystem.sol
│   ├── hardhat.config.js
│   └── .env.example
├── app/                   # Next.js frontend
│   ├── app/              # App router pages
│   ├── contracts/        # ABIs and contract configs
│   ├── public/           # Static assets
│   └── .env.local
├── agents/               # AI moderation agent
│   ├── flagging_api.py   # Flask API server
│   ├── requirements.txt
│   └── .env.example
├── render.yaml           # Render deployment config
└── README.md
```

## 🚀 Production Deployment

### Frontend (Vercel)

1. Connect GitHub repository
2. Set root directory: `app/`
3. Add environment variables
4. Deploy automatically on push

**Live URL**: [https://sol-ai.vercel.app](https://sol-ai.vercel.app)

### AI Agent (Render)

1. Create Background Worker
2. Use `render.yaml` configuration
3. Set environment variables
4. Deploy from GitHub

**Agent URL**: [https://sol-ai-moderator-agent.onrender.com](https://sol-ai-moderator-agent.onrender.com)

## 🔒 Security Considerations

- ✅ Private keys never committed to repository
- ✅ Environment variables for sensitive data
- ✅ Agent wallet has minimal permissions
- ✅ Smart contracts use OpenZeppelin libraries
- ✅ Rate limiting on API endpoints
- ✅ Input validation on all user data
- ✅ Reentrancy guards on token transfers
- ✅ Access control on admin functions

## 🧪 Testing

```bash
# Test smart contracts
cd contracts
npx hardhat test

# Test AI agent
cd agents
python -m pytest tests/

# Test frontend
cd app
npm run test
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📞 Contact & Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/yourusername/SOL-AI/issues)
- **Twitter**: [@SOL_AI_Platform](https://twitter.com/SOL_AI_Platform)
- **Discord**: [Join our community](https://discord.gg/sol-ai)
- **Email**: support@sol-ai.io

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Somnia Network** - High-performance blockchain infrastructure
- **Google Gemini** - Advanced AI content analysis
- **OpenZeppelin** - Secure smart contract libraries
- **Vercel** - Frontend hosting and deployment
- **Render** - AI agent hosting
- **Next.js** - React framework
- **Hardhat** - Ethereum development environment

---

**Built with ❤️ for a decentralized, transparent, and fair social media future**

*SOL AI - Where AI meets blockchain for better content moderation*
