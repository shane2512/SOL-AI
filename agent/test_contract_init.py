#!/usr/bin/env python3
import os
import json
from pathlib import Path
from web3 import Web3
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
SOMNIA_RPC_URL = os.getenv("SOMNIA_RPC_URL")
SOCIAL_ADDR = os.getenv("SOCIAL_POSTS_ADDRESS")
MODERATOR_ADDR = os.getenv("MODERATOR_ADDRESS") 
REPUTATION_ADDR = os.getenv("REPUTATION_SYSTEM_ADDRESS")
INCENTIVE_ADDR = os.getenv("INCENTIVE_SYSTEM_ADDRESS")
GOVERNANCE_ADDR = os.getenv("GOVERNANCE_SYSTEM_ADDRESS")

print("🔍 Testing Contract Initialization...")
print(f"RPC URL: {SOMNIA_RPC_URL}")

# Load ABIs
REPO_ROOT = Path(__file__).resolve().parents[1]
ABI_DIR = REPO_ROOT / "app" / "contracts" / "abis"

def load_abi(filename):
    try:
        with open(ABI_DIR / filename, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Warning: Could not load {filename}: {e}")
        return []

# Web3 setup
w3 = Web3(Web3.HTTPProvider(SOMNIA_RPC_URL)) if SOMNIA_RPC_URL else None
print(f"Web3 connected: {w3.is_connected() if w3 else False}")

if w3:
    # Load ABIs
    SOCIAL_ABI = load_abi("SocialPosts.json")
    MOD_ABI = load_abi("Moderator.json")
    REPUTATION_ABI = load_abi("ReputationSystem.json")
    INCENTIVE_ABI = load_abi("IncentiveSystem.json")
    GOVERNANCE_ABI = load_abi("GovernanceSystem.json")
    
    contracts_to_test = [
        ("social", SOCIAL_ADDR, SOCIAL_ABI),
        ("moderator", MODERATOR_ADDR, MOD_ABI),
        ("reputation", REPUTATION_ADDR, REPUTATION_ABI),
        ("incentive", INCENTIVE_ADDR, INCENTIVE_ABI),
        ("governance", GOVERNANCE_ADDR, GOVERNANCE_ABI)
    ]
    
    print("\n📋 Contract Initialization Tests:")
    
    for name, address, abi in contracts_to_test:
        try:
            print(f"\n{name}:")
            print(f"  Address: {address}")
            print(f"  ABI loaded: {'✅' if abi else '❌'}")
            
            if address and abi:
                # Check if address is valid
                if not Web3.is_address(address):
                    print(f"  ❌ Invalid address format")
                    continue
                    
                # Try to create contract
                contract = w3.eth.contract(address=address, abi=abi)
                print(f"  Contract created: ✅")
                
                # Try to call a simple function to test if contract exists
                try:
                    if name == "social":
                        result = contract.functions.totalPosts().call()
                        print(f"  Contract call test: ✅ (totalPosts: {result})")
                    elif name == "moderator":
                        result = contract.functions.owner().call()
                        print(f"  Contract call test: ✅ (owner: {result})")
                    elif name in ["reputation", "incentive", "governance"]:
                        # These might not have deployed yet, just check if contract exists
                        code = w3.eth.get_code(address)
                        if code == b'\x00':
                            print(f"  ❌ No contract code at address (not deployed)")
                        else:
                            print(f"  ✅ Contract code exists")
                except Exception as call_error:
                    print(f"  ❌ Contract call failed: {call_error}")
            else:
                if not address:
                    print(f"  ❌ No address provided")
                if not abi:
                    print(f"  ❌ No ABI loaded")
                    
        except Exception as e:
            print(f"  ❌ Error: {e}")
else:
    print("❌ Web3 not connected")
