import json
import os
from pathlib import Path
from dotenv import load_dotenv
from web3 import Web3

# Load env
load_dotenv()

SOMNIA_RPC_URL = os.getenv("SOMNIA_RPC_URL", "")
SOCIAL_ADDR = Web3.to_checksum_address(os.getenv("SOCIAL_POSTS_ADDRESS", ""))

# Read ABI
REPO_ROOT = Path(__file__).resolve().parents[1]
ABI_DIR = REPO_ROOT / "app" / "contracts" / "abis"
with open(ABI_DIR / "SocialPosts.json", "r", encoding="utf-8") as f:
    artifact = json.load(f)
    if isinstance(artifact, dict) and 'abi' in artifact:
        SOCIAL_ABI = artifact['abi']
    else:
        SOCIAL_ABI = artifact

# Web3 setup
w3 = Web3(Web3.HTTPProvider(SOMNIA_RPC_URL))
social = w3.eth.contract(address=SOCIAL_ADDR, abi=SOCIAL_ABI)

print("SocialPosts:", SOCIAL_ADDR)

try:
    total_posts = social.functions.totalPosts().call()
    print(f"Total posts: {total_posts}")
    
    for i in range(1, total_posts + 1):
        post = social.functions.getPost(i).call()
        print(f"Post {i}: flagged={post[3]}, content='{post[2]}'")
        
except Exception as e:
    print("Error:", e)
