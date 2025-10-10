#!/usr/bin/env python3
import json
from pathlib import Path

# Test ABI loading
REPO_ROOT = Path(__file__).resolve().parents[1]
ABI_DIR = REPO_ROOT / "app" / "contracts" / "abis"

def load_abi(filename):
    try:
        with open(ABI_DIR / filename, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Warning: Could not load {filename}: {e}")
        return []

print(f"ABI Directory: {ABI_DIR}")
print(f"Directory exists: {ABI_DIR.exists()}")

files_to_test = [
    "SocialPosts.json",
    "Moderator.json", 
    "ReputationSystem.json",
    "IncentiveSystem.json",
    "GovernanceSystem.json"
]

for filename in files_to_test:
    abi = load_abi(filename)
    print(f"{filename}: {'✅' if abi else '❌'} ({len(abi)} functions)" if abi else f"{filename}: ❌")
