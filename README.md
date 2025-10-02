# 🛡️ AI Social Moderator

A decentralized social media platform with AI-powered content moderation built on Somnia testnet.

## 🌟 Features

- **On-chain Social Posts**: Create and view posts stored on blockchain
- **AI Content Moderation**: Automatic toxicity detection using HuggingFace models
- **Real-time Flagging**: AI agent automatically flags harmful content
- **Transparent Moderation**: All moderation actions are recorded on-chain
- **Modern UI**: Beautiful glassmorphism design with smooth animations
- **Live Event Logging**: Real-time monitoring of blockchain events

## 🏗️ Architecture

### Smart Contracts
- **SocialPosts.sol**: Manages post creation and storage
- **Moderator.sol**: Handles AI agent authorization and flagging

### AI Agent
- **Python-based**: Monitors blockchain for new posts
- **HuggingFace Integration**: Uses `unitary/toxic-bert` model
- **Automatic Flagging**: Flags posts above 50% toxicity threshold
- **Gas Optimization**: Smart gas estimation and retry logic

### Frontend
- **Next.js**: React-based web application
- **Ethers.js**: Blockchain interaction
- **Real-time Events**: WebSocket connection for live updates
- **Responsive Design**: Modern glassmorphism UI

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- Python 3.8+
- MetaMask wallet
- Somnia testnet ETH

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd SOL-AI
```

2. **Install dependencies**
```bash
# Frontend
cd app
npm install

# Agent
cd ../agent
pip install -r requirements.txt
```

3. **Configure environment**
```bash
# Copy environment files
cp contracts/.env.example contracts/.env
cp app/.env.example app/.env
cp agent/.env.example agent/.env

# Update with your values
```

4. **Deploy contracts** (if needed)
```bash
cd contracts
npx hardhat run scripts/deploy.js --network somnia
```

5. **Start the application**
```bash
# Terminal 1: Frontend
cd app
npm run dev

# Terminal 2: AI Agent
cd agent
python agent.py
```

## 📋 Configuration

### Environment Variables

**Contracts (.env)**
```
PRIVATE_KEY=your_private_key
SOMNIA_RPC_URL=https://dream-rpc.somnia.network
```

**Frontend (app/.env)**
```
NEXT_PUBLIC_SOCIAL_POSTS_ADDRESS=contract_address
NEXT_PUBLIC_MODERATOR_ADDRESS=contract_address
NEXT_PUBLIC_SOMNIA_RPC_URL=https://dream-rpc.somnia.network
NEXT_PUBLIC_SOMNIA_WSS_URL=wss://dream-rpc.somnia.network/ws
```

**Agent (agent/.env)**
```
AGENT_PRIVATE_KEY=agent_private_key
SOCIAL_POSTS_ADDRESS=contract_address
MODERATOR_ADDRESS=contract_address
SOMNIA_RPC_URL=https://dream-rpc.somnia.network
```

## 🔧 Usage

1. **Connect Wallet**: Connect MetaMask to Somnia testnet
2. **Create Posts**: Write and submit posts to the blockchain
3. **AI Moderation**: Watch the AI agent automatically moderate content
4. **View Events**: Click the floating button to see live event logs
5. **Monitor Status**: Posts show as ✅ Safe or 🚩 Flagged

## 🧠 AI Model

- **Model**: `unitary/toxic-bert`
- **Threshold**: 50% toxicity score
- **Languages**: English
- **Categories**: Toxicity, severe toxicity, obscene, threat, insult, identity attack

## 🌐 Network Details

- **Blockchain**: Somnia Testnet
- **Chain ID**: 50312
- **RPC**: https://dream-rpc.somnia.network
- **WebSocket**: wss://dream-rpc.somnia.network/ws

## 📁 Project Structure

```
SOL-AI/
├── contracts/          # Smart contracts
│   ├── contracts/      # Solidity files
│   ├── scripts/        # Deployment scripts
│   └── .env           # Contract environment
├── app/               # Next.js frontend
│   ├── app/           # App router pages
│   ├── contracts/     # Contract ABIs
│   └── .env          # Frontend environment
├── agent/             # Python AI agent
│   ├── agent.py       # Main agent script
│   ├── requirements.txt
│   └── .env          # Agent environment
└── README.md
```

## 🛠️ Development

### Adding New Features
1. Update smart contracts if needed
2. Redeploy contracts to testnet
3. Update frontend with new contract addresses
4. Restart AI agent with new configuration

### Testing
- Test posts with various content types
- Monitor agent logs for proper flagging
- Check event logs for real-time updates

## 🚨 Security Notes

- Never commit private keys to version control
- Use environment variables for sensitive data
- Agent private key should have minimal permissions
- Test thoroughly on testnet before mainnet

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Somnia Network for the testnet
- HuggingFace for the AI models
- OpenZeppelin for secure contracts
- Next.js and React teams

---

Built with ❤️ for decentralized content moderation
