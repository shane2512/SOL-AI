# 🔧 Post Creation Error - Complete Fix Guide

## The Error You're Getting

```
Error: cannot estimate gas; transaction may fail or may require manual gas limit
reason="execution reverted"
```

## ✅ Root Causes & Solutions

### **Issue 1: Wrong Network** (Most Common)
**Problem**: MetaMask is not on Somnia Testnet

**Solution**: The code now auto-switches, but you need to **restart the dev server**!

```bash
# Stop server (Ctrl+C in terminal)
# Then restart:
cd d:\SOL-AI\app
npm run dev
```

After restart:
1. Refresh browser
2. Click wallet connect
3. It will automatically switch to Somnia!

---

### **Issue 2: Insufficient Balance**
**Problem**: No STM tokens for gas

**Check your balance**:
1. Open MetaMask
2. Make sure you're on "Somnia Testnet"
3. Check if you have STM tokens

**Get test tokens**:
- You need Somnia testnet tokens
- Ask in Somnia Discord/Telegram for faucet
- Or check Somnia documentation

---

### **Issue 3: Contract Might Have Changed**
**Problem**: The contract address might be outdated

**Your current contract**: `0x543D67754A05c60035f57DA9Dc7FA6685dCe6A8B`

**To verify it's correct**:
1. Check if this is the latest deployment
2. Look in `contracts/` folder for recent deployments
3. Update `.env.local` if needed

---

## 🎯 Step-by-Step Fix

### **Step 1: Verify Environment Variables**

Check `app/.env.local` has:
```
NEXT_PUBLIC_SOMNIA_RPC_URL=https://dream-rpc.somnia.network
NEXT_PUBLIC_CHAIN_ID=50312
NEXT_PUBLIC_SOCIAL_POSTS_ADDRESS=0x543D67754A05c60035f57DA9Dc7FA6685dCe6A8B
```

### **Step 2: Restart Dev Server**
```bash
# IMPORTANT: Must restart for env vars to load!
cd d:\SOL-AI\app
npm run dev
```

### **Step 3: Clear Browser Cache**
1. Open DevTools (F12)
2. Right-click refresh button
3. Click "Empty Cache and Hard Reload"

### **Step 4: Connect Wallet**
1. Click user menu (bottom of sidebar)
2. MetaMask opens
3. **Should auto-switch to Somnia** (if code updated)
4. Approve connection

### **Step 5: Check Network**
In MetaMask, verify you see:
- Network: "Somnia Testnet"
- Chain ID: 50312
- Balance: Should have some STM

### **Step 6: Try Creating Post**
1. Click "Post" button
2. Type message
3. Click "Post"
4. Approve transaction in MetaMask

---

## 🔍 Debugging Checklist

If still not working, check:

### ✅ Network
- [ ] MetaMask shows "Somnia Testnet"
- [ ] Chain ID is 50312
- [ ] RPC URL is https://dream-rpc.somnia.network

### ✅ Balance
- [ ] Have STM tokens (check MetaMask)
- [ ] Balance > 0

### ✅ Contract
- [ ] Contract address is correct
- [ ] ABI file exists at `app/contracts/abis/SocialPosts.json`

### ✅ Code
- [ ] Dev server restarted after .env.local created
- [ ] Browser cache cleared
- [ ] No console errors (F12)

---

## 🚨 Common Mistakes

### ❌ Mistake 1: Not Restarting Server
**Problem**: Environment variables not loaded

**Fix**: 
```bash
# Stop server (Ctrl+C)
npm run dev
```

### ❌ Mistake 2: Wrong Network
**Problem**: Still on Ethereum Mainnet

**Fix**: 
- Manually switch to Somnia in MetaMask
- Or wait for auto-switch (after restart)

### ❌ Mistake 3: No Test Tokens
**Problem**: Zero balance

**Fix**: 
- Get STM tokens from faucet
- Check Somnia documentation

---

## 📝 Manual Network Setup (If Auto-Switch Fails)

If automatic switching doesn't work, add manually:

**In MetaMask**:
1. Click network dropdown
2. Click "Add Network"
3. Click "Add a network manually"
4. Enter:
   - **Network Name**: Somnia Testnet
   - **RPC URL**: https://dream-rpc.somnia.network
   - **Chain ID**: 50312
   - **Currency Symbol**: STT
5. Click "Save"
6. Switch to "Somnia Testnet"

---

## ✅ Verification Steps

After fixing, you should see:

1. **In MetaMask**:
   - Network: "Somnia Testnet"
   - Chain ID: 50312
   - Balance: X STM

2. **In Browser Console (F12)**:
   - No red errors
   - Should see: "✅ Agent authorized to flag posts" or similar

3. **When Creating Post**:
   - MetaMask popup appears
   - Transaction details shown
   - Can approve and send

---

## 🎯 Expected Behavior

**When working correctly**:
1. Connect wallet → Auto-switches to Somnia
2. Click "Post" → Opens compose box
3. Type message → Character counter works
4. Click "Post" → MetaMask popup
5. Approve → Transaction sent
6. Wait → Post appears in timeline!

---

## 💡 Quick Test

Try this in browser console (F12):
```javascript
console.log(process.env.NEXT_PUBLIC_SOCIAL_POSTS_ADDRESS);
// Should show: 0x543D67754A05c60035f57DA9Dc7FA6685dCe6A8B

console.log(process.env.NEXT_PUBLIC_SOMNIA_RPC_URL);
// Should show: https://dream-rpc.somnia.network
```

If these show `undefined`, the server wasn't restarted!

---

## 🔥 Still Not Working?

If you've tried everything:

1. **Check Contract is Deployed**:
   - Go to Somnia explorer (if available)
   - Search for: 0x543D67754A05c60035f57DA9Dc7FA6685dCe6A8B
   - Verify it exists

2. **Try Different Account**:
   - Switch MetaMask account
   - Try with fresh account

3. **Check Browser Console**:
   - Open DevTools (F12)
   - Look for red errors
   - Share the error message

4. **Verify ABI**:
   - Check `app/contracts/abis/SocialPosts.json` exists
   - Should have `createPost` function

---

## 📞 Need Help?

Share these details:
1. MetaMask network name
2. Chain ID shown
3. STM balance
4. Full error message from console
5. Contract address you're using

---

## ✨ Summary

**Most likely fix**: 
1. ✅ Restart dev server
2. ✅ Clear browser cache  
3. ✅ Connect wallet (auto-switches)
4. ✅ Get STM tokens if balance is 0
5. ✅ Try creating post

**The auto-switch code is there, but needs server restart to work!**
