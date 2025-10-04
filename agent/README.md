# SOL AI Moderator Agent

A smart content moderation agent powered by Google's Gemini 1.5 Flash AI model for the SOL AI social platform.

## 🔧 Recent Fixes

### Gemini 1.5 Flash Integration Issues Fixed

1. **Model Name Consistency**: Fixed inconsistent model name handling that was causing confusion
2. **Response Parsing**: Improved parsing of Gemini API responses with regex-based number extraction
3. **Error Handling**: Enhanced error handling with detailed logging and graceful fallbacks
4. **Flagging Logic**: Improved flagging functionality with better debugging and visual indicators
5. **Test Endpoints**: Added dedicated test endpoints for debugging Gemini integration

## 🚀 Setup

### 1. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Blockchain Configuration
SOMNIA_RPC_URL=https://dream-rpc.somnia.network
CHAIN_ID=50312

# Contract Addresses (get these from your deployment)
SOCIAL_POSTS_ADDRESS=0xYourSocialPostsContractAddress
MODERATOR_ADDRESS=0xYourModeratorContractAddress

# Agent Private Key (NO 0x prefix)
AGENT_PRIVATE_KEY=your_agent_private_key_here

# AI Model Configuration
MODEL_NAME=gemini-1.5-flash
TOXICITY_THRESHOLD_BP=2500

# Gemini AI API Key (required)
GEMINI_API_KEY=your_gemini_api_key_here
```

### 2. Get Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add it to your `.env` file

### 3. Install Dependencies

```bash
pip install flask flask-cors web3 python-dotenv google-generativeai
```

### 4. Run the Agent

```bash
python app.py
```

## 🧪 Testing

### Manual Testing

Use the test script to verify everything is working:

```bash
python test_moderation.py
```

### API Endpoints

#### Health Check
```bash
GET /health
```

#### Test Gemini Directly
```bash
POST /test-gemini
{
  "text": "Your test content here"
}
```

#### Moderate Content
```bash
POST /moderate
{
  "text": "Content to moderate"
}
```

#### Start/Stop Monitoring
```bash
POST /start    # Start monitoring blockchain
POST /stop     # Stop monitoring
```

## 🎯 How It Works

### Toxicity Scoring

The agent uses Gemini 1.5 Flash to analyze content toxicity on a 0-100 scale:

- **0-25**: Safe/Clean content
- **26-50**: Mildly inappropriate
- **51-75**: Moderately toxic
- **76-100**: Highly toxic/harmful

### Flagging Threshold

- Default threshold: **2500 BP (25%)**
- Content scoring above threshold gets flagged on-chain
- Threshold is configurable via `TOXICITY_THRESHOLD_BP`

### Monitoring Process

1. **Continuous Monitoring**: Checks for new posts every 15 seconds
2. **AI Analysis**: Each post is analyzed by Gemini 1.5 Flash
3. **Smart Flagging**: Toxic content is automatically flagged on-chain
4. **Fallback System**: Falls back to keyword detection if Gemini fails

## 🔍 Debugging

### Check Agent Status
```bash
curl http://localhost:5000/health
```

### Test Gemini Integration
```bash
curl -X POST http://localhost:5000/test-gemini \
  -H "Content-Type: application/json" \
  -d '{"text": "This is a test message"}'
```

### View Diagnostics
```bash
curl http://localhost:5000/diagnostics
```

## 🚨 Troubleshooting

### Common Issues

1. **Gemini API Key Invalid**
   - Verify your API key is correct
   - Check if you have Gemini API access enabled

2. **Contract Not Found**
   - Ensure contract addresses are correct
   - Verify contracts are deployed on the right network

3. **Agent Account Issues**
   - Check private key format (no 0x prefix)
   - Ensure account has sufficient funds for gas

4. **Flagging Not Working**
   - Check if monitoring is active (`/health` endpoint)
   - Verify threshold configuration
   - Test with known toxic content

### Logs

The agent provides detailed logging:
- ✅ Success indicators
- 🚨 Toxic content detection
- ❌ Error messages
- ⚠️ Warnings

## 📊 Performance

- **Response Time**: ~1-2 seconds per moderation
- **Accuracy**: High accuracy with Gemini 1.5 Flash
- **Throughput**: Can handle continuous monitoring
- **Fallback**: Keyword detection if AI fails

## 🔐 Security

- Environment variables for sensitive data
- No API keys in code
- Secure blockchain transaction signing
- Rate limiting friendly

## 📈 Monitoring

The agent tracks:
- Posts processed
- Posts flagged
- Success/error rates
- Last check timestamp

Access stats via `/stats` endpoint.
