# 🔧 Post Creation Error - Network Issue

## The Problem

You're getting "execution reverted" because:
1. ❌ MetaMask is not connected to Somnia network
2. ❌ Or the contract address is incorrect

## ✅ Solution: Add Somnia Network to MetaMask

### **Step 1: Add Somnia Testnet to MetaMask**

Click "Add Network" in MetaMask and enter:

```
Network Name: Somnia Testnet
RPC URL: https://dream-rpc.somnia.network
Chain ID: 50312
Currency Symbol: STT
Block Explorer: (leave empty)
```

### **Step 2: Get Test Tokens**

You need STM tokens to pay for gas. Get them from Somnia faucet.

### **Step 3: Switch to Somnia Network**

In MetaMask, switch from Ethereum Mainnet to "Somnia Testnet"

### **Step 4: Try Creating Post Again**

Now the transaction should work!

---

## Alternative: Check Contract Address

The current contract address is:
```
0x543D67754A05c60035f57DA9Dc7FA6685dCe6A8B
```

If this is wrong, update it in `app/.env.local`
