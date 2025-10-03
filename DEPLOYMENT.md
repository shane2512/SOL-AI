# 🚀 Deployment Guide

This project uses a **dual-deployment architecture**:
- **Frontend**: Deployed on Vercel
- **AI Agent**: Deployed on Render

## 📋 Prerequisites

1. **Vercel Account**: [vercel.com](https://vercel.com)
2. **Render Account**: [render.com](https://render.com)
3. **Git Repository**: Push your code to GitHub/GitLab
4. **Environment Variables**: Prepare your contract addresses and private keys

## 🎯 Frontend Deployment (Vercel)

### Method 1: Vercel Dashboard
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your Git repository
4. **Configure Project**:
   - **Root Directory**: Leave empty (uses root)
   - **Build Command**: `cd app && npm run build`
   - **Output Directory**: `app/.next`
   - **Install Command**: `cd app && npm install`

5. **Environment Variables**:
   ```
   NEXT_PUBLIC_SOCIAL_POSTS_ADDRESS=0xf88B9e01A9B350E05cD8971DdDF7fC2c73910352
   NEXT_PUBLIC_MODERATOR_ADDRESS=0x7f37417F66eA2b322CDF145DFd0b45ff1794bf36
   NEXT_PUBLIC_SOMNIA_CHAIN_ID=50312
   NEXT_PUBLIC_SOMNIA_RPC_URL=https://dream-rpc.somnia.network
   NEXT_PUBLIC_SOMNIA_WSS_URL=wss://dream-rpc.somnia.network/ws
   NEXT_PUBLIC_AGENT_URL=https://your-render-app.onrender.com
   ```

6. Click "Deploy"

### Method 2: Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Set environment variables
vercel env add NEXT_PUBLIC_SOCIAL_POSTS_ADDRESS
vercel env add NEXT_PUBLIC_MODERATOR_ADDRESS
vercel env add NEXT_PUBLIC_SOMNIA_CHAIN_ID
vercel env add NEXT_PUBLIC_SOMNIA_RPC_URL
vercel env add NEXT_PUBLIC_SOMNIA_WSS_URL

# Deploy to production
vercel --prod
```

## 🤖 Agent Deployment (Render)

### Method 1: Render Dashboard
1. Go to [render.com/dashboard](https://render.com/dashboard)
2. Click "New +" → "Web Service" (FREE TIER AVAILABLE)
3. Connect your Git repository
4. **Configure Service**:
   - **Root Directory**: `agent`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn --bind 0.0.0.0:$PORT app:app`

5. **Environment Variables**: Set via Render dashboard:
     ```
     SOMNIA_RPC_URL=https://dream-rpc.somnia.network
     SOMNIA_WSS_URL=wss://dream-rpc.somnia.network/ws
     CHAIN_ID=50312
     SOCIAL_POSTS_ADDRESS=0xf88B9e01A9B350E05cD8971DdDF7fC2c73910352
     MODERATOR_ADDRESS=0x7f37417F66eA2b322CDF145DFd0b45ff1794bf36
     AGENT_PRIVATE_KEY=your_private_key_here
     MODEL_NAME=gemini-1.5-flash
     GEMINI_API_KEY=your_gemini_api_key_here
     TOXICITY_THRESHOLD_BP=2500
     ```

6. Click "Create Web Service"

### Method 2: Render Blueprint (render.yaml)
1. Push the `render.yaml` file to your repository
3. Connect your repository
4. Render will automatically detect the `render.yaml` configuration
5. Set the environment variables in the Render dashboard

## 🤖 AI Model Setup (Gemini API)

### Getting Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key and add it to your environment variables
5. **Free Tier**: 15 requests per minute, 1500 requests per day

### Benefits of Gemini Integration
- ✅ **Lightweight**: No heavy model downloads (saves 2GB+ memory)
- ✅ **Accurate**: Context-aware toxicity detection
- ✅ **Fast**: Real-time API responses
- ✅ **Cost-effective**: Free tier available
- ✅ **Scalable**: No local compute requirements

## 🔐 Security Checklist

### ✅ Environment Variables
- [ ] All `.env` files are in `.gitignore`
- [ ] Private keys are never committed to Git
- [ ] Frontend uses `NEXT_PUBLIC_` prefix for client-safe variables
- [ ] Agent environment variables are set in Render dashboard

### ✅ Git History
- [ ] No private keys in commit history
- [ ] Clean commit messages
- [ ] Proper `.gitignore` configuration

## 🔄 Deployment Workflow

### Initial Deployment
```bash
# 1. Commit your changes
git add .
git commit -m "feat: prepare for production deployment"
git push origin main

# 2. Deploy frontend to Vercel (via dashboard or CLI)
# 3. Deploy agent to Render (via dashboard or blueprint)
```

### Updates
```bash
# 1. Make changes
git add .
git commit -m "feat: add new feature"
git push origin main

# 2. Vercel will auto-deploy on push
# 3. Render will auto-deploy on push
```

## 📊 Monitoring

### Frontend (Vercel)
- **URL**: Check your Vercel dashboard for the deployment URL
- **Logs**: Available in Vercel dashboard → Functions tab
- **Analytics**: Built-in Vercel analytics

### Agent (Render)
- **Status**: Check Render dashboard for service status
- **Logs**: Available in Render dashboard → Logs tab
- **Metrics**: Built-in Render metrics

## 🐛 Troubleshooting

### Common Issues

1. **Build Fails on Vercel**
   - Check if `app/package.json` has all dependencies
   - Verify build command: `cd app && npm run build`

2. **Agent Fails on Render**
   - Check `agent/requirements.txt` has all Python dependencies
   - Verify environment variables are set correctly
   - Check agent logs in Render dashboard

3. **Contract Connection Issues**
   - Verify contract addresses are correct
   - Check if Somnia RPC URL is accessible
   - Ensure agent private key has sufficient balance

### Getting Help
- **Vercel**: [vercel.com/docs](https://vercel.com/docs)
- **Render**: [render.com/docs](https://render.com/docs)
- **Project Issues**: Create an issue in the repository

## 🎉 Success!

Once both deployments are successful:
- ✅ Frontend will be live on Vercel
- ✅ Agent will be monitoring posts on Render
- ✅ AI moderation will work automatically
- ✅ Users can interact with the dApp

Your **AI Social Moderator** is now live in production! 🚀
