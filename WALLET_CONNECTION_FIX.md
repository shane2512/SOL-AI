# Wallet Connection Fix

## Issues Fixed

### 1. Button Shows Address Before Connection
**Problem:** The wallet button was showing the user's address immediately on page load, even though the wallet wasn't actually connected.

**Root Cause:** The `initWeb3()` function was automatically checking for connected accounts using `web3Provider.listAccounts()` and setting the account state without requiring user interaction.

**Solution:** Removed the auto-connection logic. Now the wallet only connects when the user explicitly clicks "Connect Wallet".

### 2. Need to Reconnect on Every Page Change
**Problem:** Users had to reconnect their wallet every time they navigated to a different page (Reputation, Governance, Profile).

**Root Cause:** 
- Contracts weren't being initialized on the initial connection
- No event listeners to maintain wallet state across interactions
- State was being lost during page navigation

**Solution:** 
- Added proper contract initialization in `connectWallet()` function
- Added event listeners for `accountsChanged` and `chainChanged`
- Contracts now persist across page navigation

## Changes Made

### Modified: `app/page.tsx`

#### 1. Updated `initWeb3()` Function
```typescript
// BEFORE: Auto-connected wallet
const accounts = await web3Provider.listAccounts();
if (accounts.length > 0) {
  setAccount(accounts[0]);
  const web3Signer = web3Provider.getSigner();
  setSigner(web3Signer);
}

// AFTER: Only sets up providers, no auto-connection
const rpcProvider = new ethers.providers.JsonRpcProvider(SOMNIA_RPC);
const contract = new ethers.Contract(SOCIAL_ADDR, abi, rpcProvider);
setSocialContract(contract);
```

#### 2. Added Event Listeners
```typescript
// Listen for account changes (disconnect/switch)
window.ethereum.on('accountsChanged', async (accounts: string[]) => {
  if (accounts.length === 0) {
    // User disconnected wallet
    setAccount("");
    setSigner(null);
    setContracts(null);
    toast("Wallet disconnected");
  } else {
    // User switched accounts
    setAccount(accounts[0]);
    const web3Signer = web3Provider.getSigner();
    setSigner(web3Signer);
    await initializeContracts(web3Signer);
    toast("Account switched");
  }
});

// Listen for chain changes (reload on network switch)
window.ethereum.on('chainChanged', () => {
  window.location.reload();
});
```

#### 3. Added Cleanup Function
```typescript
useEffect(() => {
  initWeb3();
  
  // Cleanup event listeners on unmount
  return () => {
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.removeAllListeners('accountsChanged');
      window.ethereum.removeAllListeners('chainChanged');
    }
  };
}, []);
```

## User Experience Improvements

### Before:
1. ❌ Button shows wallet address immediately (confusing)
2. ❌ Clicking button actually connects wallet (unexpected)
3. ❌ Must reconnect on every page change
4. ❌ No feedback when wallet disconnects
5. ❌ No handling of account switches

### After:
1. ✅ Button shows "Connect Wallet" initially (clear)
2. ✅ Clicking button connects wallet (expected)
3. ✅ Wallet stays connected across all pages
4. ✅ Toast notification when wallet disconnects
5. ✅ Automatic handling of account switches
6. ✅ Page reloads on network change

## Technical Details

### State Management
- `account`: Only set when user explicitly connects
- `signer`: Initialized with contracts on connection
- `contracts`: Persist across page navigation
- Event listeners maintain state consistency

### Contract Initialization
- Read-only contract uses RPC provider (no wallet needed)
- Write contracts use wallet signer (after connection)
- All contracts initialized together on first connection
- Contracts re-initialized on account switch

### Event Handling
- `accountsChanged`: Handles disconnect and account switch
- `chainChanged`: Reloads page to ensure clean state
- Cleanup on unmount prevents memory leaks

## Testing Checklist

- [x] Initial load shows "Connect Wallet"
- [x] Clicking button prompts MetaMask
- [x] After connection, address shows in button
- [x] Navigate to Reputation page - stays connected
- [x] Navigate to Governance page - stays connected
- [x] Navigate to Profile page - stays connected
- [x] Switch accounts in MetaMask - updates automatically
- [x] Disconnect wallet - clears state and shows toast
- [x] Switch networks - page reloads
