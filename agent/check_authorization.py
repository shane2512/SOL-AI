#!/usr/bin/env python3
"""
Check if the agent has proper authorization to flag content
"""

import os
import json
from pathlib import Path
from web3 import Web3
from dotenv import load_dotenv

# Load environment
load_dotenv()

# Configuration
SOMNIA_RPC_URL = os.getenv("SOMNIA_RPC_URL", "")
MODERATOR_ADDR = Web3.to_checksum_address(os.getenv("MODERATOR_ADDRESS", "0x0000000000000000000000000000000000000000"))
AGENT_PRIV = os.getenv("AGENT_PRIVATE_KEY", "")

print("🔍 Checking Agent Authorization\n")

# Web3 setup
w3 = Web3(Web3.HTTPProvider(SOMNIA_RPC_URL)) if SOMNIA_RPC_URL else None
if not w3:
    print("❌ No Web3 connection")
    exit(1)

# Load agent account
acct = None
if AGENT_PRIV:
    try:
        acct = w3.eth.account.from_key(bytes.fromhex(AGENT_PRIV))
        print(f"✅ Agent account loaded: {acct.address}")
    except Exception as e:
        print(f"❌ Could not load agent account: {e}")
        exit(1)
else:
    print("❌ No agent private key provided")
    exit(1)

# Load Moderator ABI
REPO_ROOT = Path(__file__).resolve().parents[1]
ABI_DIR = REPO_ROOT / "app" / "contracts" / "abis"

try:
    with open(ABI_DIR / "Moderator.json", "r", encoding="utf-8") as f:
        MOD_ABI = json.load(f)
    print("✅ Moderator ABI loaded")
except Exception as e:
    print(f"❌ Could not load Moderator ABI: {e}")
    exit(1)

# Initialize moderator contract
try:
    moderator = w3.eth.contract(address=MODERATOR_ADDR, abi=MOD_ABI)
    print(f"✅ Moderator contract initialized: {MODERATOR_ADDR}")
except Exception as e:
    print(f"❌ Could not initialize moderator contract: {e}")
    exit(1)

print("\n" + "="*50)
print("AUTHORIZATION CHECKS")
print("="*50)

# Check 1: Is agent authorized as a moderator?
try:
    is_moderator = moderator.functions.isModerator(acct.address).call()
    print(f"1. Is Moderator: {'✅ YES' if is_moderator else '❌ NO'}")
except Exception as e:
    print(f"1. Is Moderator: ❌ ERROR - {e}")

# Check 2: Can agent call flagPost function?
try:
    # Try to estimate gas for flagPost (this will fail if not authorized)
    gas_estimate = moderator.functions.flagPost(1, 5000, "test").estimate_gas({'from': acct.address})
    print(f"2. Can Flag Posts: ✅ YES (Gas estimate: {gas_estimate})")
except Exception as e:
    error_msg = str(e)
    if "not authorized" in error_msg.lower() or "access denied" in error_msg.lower():
        print(f"2. Can Flag Posts: ❌ NOT AUTHORIZED")
    else:
        print(f"2. Can Flag Posts: ❌ ERROR - {e}")

# Check 3: Get contract owner
try:
    owner = moderator.functions.owner().call()
    print(f"3. Contract Owner: {owner}")
    print(f"   Agent is Owner: {'✅ YES' if owner.lower() == acct.address.lower() else '❌ NO'}")
except Exception as e:
    print(f"3. Contract Owner: ❌ ERROR - {e}")

# Check 4: List all moderators (if function exists)
try:
    moderators = moderator.functions.getModerators().call()
    print(f"4. All Moderators: {moderators}")
    agent_in_list = any(mod.lower() == acct.address.lower() for mod in moderators)
    print(f"   Agent in List: {'✅ YES' if agent_in_list else '❌ NO'}")
except Exception as e:
    print(f"4. All Moderators: ❌ Function not available - {e}")

# Check 5: Check agent's balance
try:
    balance = w3.eth.get_balance(acct.address)
    balance_eth = w3.from_wei(balance, 'ether')
    print(f"5. Agent Balance: {balance_eth:.6f} ETH")
    if balance_eth < 0.001:
        print("   ⚠️ WARNING: Low balance, may not have enough gas for transactions")
    else:
        print("   ✅ Sufficient balance for transactions")
except Exception as e:
    print(f"5. Agent Balance: ❌ ERROR - {e}")

print("\n" + "="*50)
print("RECOMMENDATIONS")
print("="*50)

# Provide recommendations based on findings
print("\nIf the agent is NOT authorized:")
print("1. 🔧 Add agent as moderator using contract owner account")
print("2. 📝 Call: moderator.addModerator(agent_address)")
print("3. 🔑 Or transfer ownership to agent if needed")
print("\nIf authorization looks good but flagging still fails:")
print("1. 🔍 Check for contract-specific requirements")
print("2. 📊 Verify post exists and isn't already flagged")
print("3. ⛽ Ensure sufficient gas limit and price")

print(f"\n🔗 Contract Address: {MODERATOR_ADDR}")
print(f"🤖 Agent Address: {acct.address}")
print(f"🌐 Network: {SOMNIA_RPC_URL}")
