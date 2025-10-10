import json
import os
from pathlib import Path
from dotenv import load_dotenv
from web3 import Web3

# Load env
load_dotenv()

SOMNIA_RPC_URL = os.getenv("SOMNIA_RPC_URL", "")
CHAIN_ID = int(os.getenv("CHAIN_ID", "0") or 0)
SOCIAL_ADDR = Web3.to_checksum_address(os.getenv("SOCIAL_POSTS_ADDRESS") or os.getenv("SOCIAL_POSTS_CONTRACT_ADDRESS", ""))
MODERATOR_ADDR = Web3.to_checksum_address(os.getenv("MODERATOR_ADDRESS") or os.getenv("MODERATOR_CONTRACT_ADDRESS", ""))
AGENT_PRIV = os.getenv("AGENT_PRIVATE_KEY", "")

# Read ABIs
REPO_ROOT = Path(__file__).resolve().parents[1]
ABI_DIR = REPO_ROOT / "app" / "contracts" / "abis"

def load_abi(filename):
    with open(ABI_DIR / filename, "r", encoding="utf-8") as f:
        artifact = json.load(f)
        if isinstance(artifact, dict) and 'abi' in artifact:
            return artifact['abi']
        return artifact

SOCIAL_ABI = load_abi("SocialPosts.json")
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
social = w3.eth.contract(address=SOCIAL_ADDR, abi=SOCIAL_ABI)
moderator = w3.eth.contract(address=MODERATOR_ADDR, abi=MOD_ABI)

print("=" * 60)
print("MANUAL FLAG SCRIPT - Last Two Posts")
print("=" * 60)
print(f"Agent address: {acct.address}")
print(f"Social contract: {SOCIAL_ADDR}")
print(f"Moderator contract: {MODERATOR_ADDR}")
print()

# Get total posts
try:
    total_posts = social.functions.totalPosts().call()
    print(f"Total posts on chain: {total_posts}")
    
    if total_posts < 2:
        print("Not enough posts to flag. Need at least 2 posts.")
        exit(1)
    
    # Get the last two post IDs
    post_ids = [total_posts - 1, total_posts]
    
    print(f"\nWill flag posts: {post_ids}")
    print()
    
    for post_id in post_ids:
        print(f"\n{'='*60}")
        print(f"Processing Post #{post_id}")
        print(f"{'='*60}")
        
        # Get post content
        try:
            post = social.functions.getPost(post_id).call()
            post_content = post[2]  # content is at index 2
            post_author = post[1]   # author is at index 1
            
            print(f"Author: {post_author}")
            print(f"Content: '{post_content}'")
            
            # Simple toxicity scoring
            toxic_keywords = ['fuck', 'shit', 'hate', 'kill', 'die', 'stupid', 'idiot', 'bitch']
            score_bp = 300  # Base score
            
            lower_content = post_content.lower()
            for keyword in toxic_keywords:
                if keyword in lower_content:
                    score_bp += 3000
                    print(f"Found toxic keyword: '{keyword}'")
            
            score_bp = min(score_bp, 9500)
            print(f"Calculated toxicity score: {score_bp} BP ({score_bp/100}%)")
            
            # Check if already flagged
            try:
                is_flagged = moderator.functions.isFlagged(post_id).call()
                if is_flagged:
                    print(f"⚠️ Post {post_id} is already flagged. Skipping.")
                    continue
            except:
                pass
            
            # Flag the post
            print(f"\n🏴 Flagging post {post_id}...")
            
            tx = moderator.functions.flagPost(post_id, score_bp, "manual-script").build_transaction({
                "from": acct.address,
                "nonce": w3.eth.get_transaction_count(acct.address),
                "chainId": CHAIN_ID or w3.eth.chain_id,
                "gas": 300000,
                "gasPrice": w3.to_wei("10", "gwei"),
            })
            
            signed = acct.sign_transaction(tx)
            tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
            print(f"📤 Transaction sent: {tx_hash.hex()}")
            
            receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
            
            if receipt.status == 1:
                print(f"✅ Post {post_id} flagged successfully!")
                print(f"   Block: {receipt.blockNumber}")
                print(f"   Gas used: {receipt.gasUsed}")
            else:
                print(f"❌ Transaction failed for post {post_id}")
                
        except Exception as e:
            error_msg = str(e).lower()
            if "already flagged" in error_msg:
                print(f"⚠️ Post {post_id} already flagged on blockchain")
            else:
                print(f"❌ Error processing post {post_id}: {e}")
    
    print(f"\n{'='*60}")
    print("FLAGGING COMPLETE")
    print(f"{'='*60}")
    
except Exception as e:
    print(f"Error: {e}")
