import json
import os
from pathlib import Path
from dotenv import load_dotenv
from web3 import Web3

load_dotenv()

SOMNIA_RPC_URL = os.getenv("SOMNIA_RPC_URL", "")
SOCIAL_ADDR = Web3.to_checksum_address(
    os.getenv("SOCIAL_POSTS_ADDRESS") or 
    os.getenv("SOCIAL_POSTS_CONTRACT_ADDRESS", "")
)

# Read ABI
REPO_ROOT = Path(__file__).resolve().parents[1]
ABI_DIR = REPO_ROOT / "app" / "contracts" / "abis"

def load_abi(filename):
    with open(ABI_DIR / filename, "r", encoding="utf-8") as f:
        artifact = json.load(f)
        if isinstance(artifact, dict) and 'abi' in artifact:
            return artifact['abi']
        return artifact

SOCIAL_ABI = load_abi("SocialPosts.json")

# Web3 setup
w3 = Web3(Web3.HTTPProvider(SOMNIA_RPC_URL))
social = w3.eth.contract(address=SOCIAL_ADDR, abi=SOCIAL_ABI)

print("=" * 60)
print("SOCIAL POSTS LIST")
print("=" * 60)
print(f"Contract: {SOCIAL_ADDR}\n")

try:
    total_posts = social.functions.totalPosts().call()
    print(f"Total posts: {total_posts}\n")
    
    if total_posts == 0:
        print("No posts found.")
    else:
        for i in range(1, min(total_posts + 1, 11)):  # Show first 10 posts
            try:
                # Try different ways to get post data
                print(f"Post #{i}:")
                
                # Method 1: Try getPost function
                try:
                    post = social.functions.getPost(i).call()
                    print(f"  ID: {post[0]}")
                    print(f"  Author: {post[1]}")
                    print(f"  Content: '{post[2]}'")
                    print(f"  Flagged: {post[3]}")
                    print(f"  Timestamp: {post[4]}")
                except Exception as e:
                    print(f"  Error with getPost: {e}")
                    
                    # Method 2: Try accessing posts mapping directly
                    try:
                        post = social.functions.posts(i).call()
                        print(f"  Direct access: {post}")
                    except Exception as e2:
                        print(f"  Error with direct access: {e2}")
                
                print()
            except Exception as e:
                print(f"  Error: {e}\n")
                
except Exception as e:
    print(f"Error: {e}")
