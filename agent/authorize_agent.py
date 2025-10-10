#!/usr/bin/env python3
"""
Authorize the AI agent in the Moderator contract
"""

import os
import json
from pathlib import Path
from web3 import Web3
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
SOMNIA_RPC_URL = os.getenv("SOMNIA_RPC_URL")
MODERATOR_ADDR = os.getenv("MODERATOR_ADDRESS")
AGENT_PRIV = os.getenv("AGENT_PRIVATE_KEY")

# Load ABI
REPO_ROOT = Path(__file__).resolve().parents[1]
ABI_DIR = REPO_ROOT / "app" / "contracts" / "abis"

def load_abi(filename):
    try:
        with open(ABI_DIR / filename, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {filename}: {e}")
        return None

def main():
    print("🔧 Authorizing AI Agent in Moderator Contract...")
    
    # Setup Web3
    w3 = Web3(Web3.HTTPProvider(SOMNIA_RPC_URL))
    if not w3.is_connected():
        print("❌ Failed to connect to Somnia network")
        return
    
    # Setup account
    if not AGENT_PRIV:
        print("❌ AGENT_PRIVATE_KEY not found in .env")
        return
        
    account = w3.eth.account.from_key(bytes.fromhex(AGENT_PRIV))
    print(f"📋 Agent Address: {account.address}")
    
    # Load Moderator contract
    moderator_abi = load_abi("Moderator.json")
    if not moderator_abi:
        print("❌ Failed to load Moderator ABI")
        return
    
    moderator = w3.eth.contract(address=MODERATOR_ADDR, abi=moderator_abi)
    
    try:
        # Check current authorization status
        is_authorized = moderator.functions.agents(account.address).call()
        print(f"📊 Current authorization status: {is_authorized}")
        
        if is_authorized:
            print("✅ Agent is already authorized!")
            return
        
        # Get contract owner (should be the deployer)
        owner = moderator.functions.owner().call()
        print(f"📋 Contract Owner: {owner}")
        
        if owner.lower() != account.address.lower():
            print(f"⚠️ Warning: Agent address ({account.address}) is not the contract owner ({owner})")
            print("Only the contract owner can authorize agents.")
            print("You may need to use the deployer account to authorize this agent.")
            return
        
        # Authorize the agent
        print("🔄 Authorizing agent...")
        
        # Build transaction
        tx = moderator.functions.setAgent(account.address, True).build_transaction({
            'from': account.address,
            'nonce': w3.eth.get_transaction_count(account.address),
            'gas': 100000,
            'gasPrice': w3.to_wei('20', 'gwei')
        })
        
        # Sign and send transaction
        signed_tx = w3.eth.account.sign_transaction(tx, AGENT_PRIV)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        
        print(f"📤 Transaction sent: {tx_hash.hex()}")
        
        # Wait for confirmation
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        
        if receipt.status == 1:
            print("✅ Agent authorized successfully!")
            
            # Verify authorization
            is_authorized = moderator.functions.agents(account.address).call()
            print(f"📊 New authorization status: {is_authorized}")
        else:
            print("❌ Transaction failed")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()
