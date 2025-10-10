#!/usr/bin/env python3
import os
from dotenv import load_dotenv

print("🔍 Testing Environment Variable Loading...")

# Load environment variables
load_dotenv()

env_vars = [
    "SOMNIA_RPC_URL",
    "SOCIAL_POSTS_ADDRESS", 
    "MODERATOR_ADDRESS",
    "REPUTATION_SYSTEM_ADDRESS",
    "INCENTIVE_SYSTEM_ADDRESS", 
    "GOVERNANCE_SYSTEM_ADDRESS",
    "AGENT_PRIVATE_KEY",
    "HF_TOKEN"
]

print("\n📋 Environment Variables:")
for var in env_vars:
    value = os.getenv(var)
    if var in ["AGENT_PRIVATE_KEY", "HF_TOKEN"]:
        # Mask sensitive values
        display_value = f"{value[:8]}..." if value else "None"
    else:
        display_value = value
    print(f"  {var}: {display_value}")

print(f"\n📁 Current working directory: {os.getcwd()}")
print(f"📄 .env file exists: {os.path.exists('.env')}")

if os.path.exists('.env'):
    print("\n📄 .env file contents:")
    with open('.env', 'r') as f:
        lines = f.readlines()
        for i, line in enumerate(lines[:10], 1):  # Show first 10 lines
            if any(sensitive in line for sensitive in ["PRIVATE_KEY", "TOKEN"]):
                print(f"  {i}: {line.split('=')[0]}=***")
            else:
                print(f"  {i}: {line.strip()}")
