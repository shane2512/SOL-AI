import json
import os
from pathlib import Path
from dotenv import load_dotenv
from web3 import Web3

load_dotenv()

SOMNIA_RPC_URL = os.getenv("SOMNIA_RPC_URL", "")
SOCIAL_ADDR = Web3.to_checksum_address(os.getenv("SOCIAL_POSTS_ADDRESS", ""))
MODERATOR_ADDR = Web3.to_checksum_address(os.getenv("MODERATOR_ADDRESS", ""))
AGENT_PRIV = os.getenv("AGENT_PRIVATE_KEY", "")

REPO_ROOT = Path(__file__).resolve().parents[1]
ABI_DIR = REPO_ROOT / "app" / "contracts" / "abis"
with open(ABI_DIR / "Moderator.json", "r", encoding="utf-8") as f:
    MOD_ABI = json.load(f)

w3 = Web3(Web3.HTTPProvider(SOMNIA_RPC_URL))
acct = w3.eth.account.from_key(bytes.fromhex(AGENT_PRIV))
moderator = w3.eth.contract(address=MODERATOR_ADDR, abi=MOD_ABI)

print("Testing flagPost call (simulation)...")

post_id = 2
score_bp = 9924
model = "unitary/toxic-bert"

try:
    # Try to call the function (simulation) to see if it would revert
    result = moderator.functions.flagPost(post_id, score_bp, model).call({'from': acct.address})
    print(f"Call succeeded: {result}")
except Exception as e:
    print(f"Call failed with error: {e}")
    
    # Try to get more details
    try:
        # Check if post exists and is not already flagged
        from web3 import Web3
        social_abi_path = ABI_DIR / "SocialPosts.json"
        with open(social_abi_path, "r", encoding="utf-8") as f:
            SOCIAL_ABI = json.load(f)
        
        social = w3.eth.contract(address=SOCIAL_ADDR, abi=SOCIAL_ABI)
        post = social.functions.getPost(post_id).call()
        print(f"Post {post_id}: exists=True, flagged={post[3]}")
        
        # Check if post is already flagged
        if post[3]:
            print("❌ Post is already flagged!")
        else:
            print("✅ Post is not flagged, should be able to flag it")
            
    except Exception as e2:
        print(f"Error checking post: {e2}")
