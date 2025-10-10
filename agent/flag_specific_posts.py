"""
Simple script to manually flag specific posts by ID
"""
import json
import os
from pathlib import Path
from dotenv import load_dotenv
from web3 import Web3

load_dotenv()

SOMNIA_RPC_URL = os.getenv("SOMNIA_RPC_URL", "")
CHAIN_ID = int(os.getenv("CHAIN_ID", "50312"))
MODERATOR_ADDR = Web3.to_checksum_address(
    os.getenv("MODERATOR_ADDRESS") or 
    os.getenv("MODERATOR_CONTRACT_ADDRESS", "")
)
AGENT_PRIV = os.getenv("AGENT_PRIVATE_KEY", "")

# Read ABI
REPO_ROOT = Path(__file__).resolve().parents[1]
ABI_DIR = REPO_ROOT / "app" / "contracts" / "abis"

def load_abi(filename):
    with open(ABI_DIR / filename, "r", encoding="utf-8") as f:
        artifact = json.load(f)
        if isinstance(artifact, dict) and 'abi' in artifact:
            return artifact['abi']
        return artifact

MOD_ABI = load_abi("Moderator.json")

# Web3 setup
w3 = Web3(Web3.HTTPProvider(SOMNIA_RPC_URL))

# Handle PoA middleware
try:
    from web3.middleware import geth_poa_middleware
    w3.middleware_onion.inject(geth_poa_middleware, layer=0)
except:
    pass

acct = w3.eth.account.from_key(bytes.fromhex(AGENT_PRIV))
moderator = w3.eth.contract(address=MODERATOR_ADDR, abi=MOD_ABI)

print("=" * 60)
print("MANUAL FLAG SCRIPT")
print("=" * 60)
print(f"Agent address: {acct.address}")
print(f"Moderator contract: {MODERATOR_ADDR}")
print()

# Get the last two posts from the correct contract
# First, let's check how many posts exist
SOCIAL_ADDR = Web3.to_checksum_address(
    os.getenv("SOCIAL_POSTS_ADDRESS") or 
    os.getenv("SOCIAL_POSTS_CONTRACT_ADDRESS", "")
)
SOCIAL_ABI = load_abi("SocialPosts.json")
social = w3.eth.contract(address=SOCIAL_ADDR, abi=SOCIAL_ABI)

try:
    total_posts = social.functions.totalPosts().call()
    print(f"Total posts in contract: {total_posts}")
    # Flag the last two posts
    POST_IDS_TO_FLAG = [total_posts - 1, total_posts] if total_posts >= 2 else [total_posts]
    print(f"Will flag posts: {POST_IDS_TO_FLAG}")
except Exception as e:
    print(f"Could not get total posts: {e}")
    # Fallback to manual IDs
    POST_IDS_TO_FLAG = [1, 2]

for post_id in POST_IDS_TO_FLAG:
    print(f"\n{'='*60}")
    print(f"Flagging Post #{post_id}")
    print(f"{'='*60}")
    
    try:
        # Use a high toxicity score for manual flagging
        score_bp = 5000  # 50% toxicity
        model = "manual-flag"
        
        print(f"Flagging with score: {score_bp} BP ({score_bp/100}%)")
        
        # Build transaction
        tx = moderator.functions.flagPost(post_id, score_bp, model).build_transaction({
            "from": acct.address,
            "nonce": w3.eth.get_transaction_count(acct.address),
            "chainId": CHAIN_ID,
            "gas": 300000,
            "gasPrice": w3.to_wei("10", "gwei"),
        })
        
        # Sign and send
        signed = acct.sign_transaction(tx)
        tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
        print(f"📤 Transaction sent: {tx_hash.hex()}")
        
        # Wait for confirmation
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        
        if receipt.status == 1:
            print(f"✅ Post {post_id} flagged successfully!")
            print(f"   Block: {receipt.blockNumber}")
            print(f"   Gas used: {receipt.gasUsed}")
        else:
            print(f"❌ Transaction failed for post {post_id}")
            print(f"   Receipt: {receipt}")
            # Try to get revert reason
            try:
                tx_data = w3.eth.get_transaction(tx_hash)
                w3.eth.call(tx_data, receipt.blockNumber - 1)
            except Exception as revert_error:
                print(f"   Revert reason: {revert_error}")
            
    except Exception as e:
        error_msg = str(e).lower()
        if "already flagged" in error_msg:
            print(f"⚠️ Post {post_id} already flagged on blockchain")
        else:
            print(f"❌ Error flagging post {post_id}: {e}")

print(f"\n{'='*60}")
print("FLAGGING COMPLETE")
print(f"{'='*60}")
