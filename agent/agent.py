import json
import os
import time
from decimal import Decimal
from pathlib import Path

from dotenv import load_dotenv
from transformers import pipeline
from web3 import Web3
from web3.middleware import geth_poa_middleware

# Load env
load_dotenv()

SOMNIA_RPC_URL = os.getenv("SOMNIA_RPC_URL", "")
SOMNIA_WSS_URL = os.getenv("SOMNIA_WSS_URL", "")
CHAIN_ID = int(os.getenv("CHAIN_ID", "0") or 0)
SOCIAL_ADDR = Web3.to_checksum_address(os.getenv("SOCIAL_POSTS_ADDRESS", "0x0000000000000000000000000000000000000000"))
MODERATOR_ADDR = Web3.to_checksum_address(os.getenv("MODERATOR_ADDRESS", "0x0000000000000000000000000000000000000000"))
AGENT_PRIV = os.getenv("AGENT_PRIVATE_KEY", "")
MODEL_NAME = os.getenv("MODEL_NAME", "unitary/toxic-bert")
THRESHOLD_BP = int(os.getenv("TOXICITY_THRESHOLD_BP", "5000"))

# Read ABIs from app/contracts/abis
REPO_ROOT = Path(__file__).resolve().parents[1]
ABI_DIR = REPO_ROOT / "app" / "contracts" / "abis"
with open(ABI_DIR / "SocialPosts.json", "r", encoding="utf-8") as f:
    SOCIAL_ABI = json.load(f)
with open(ABI_DIR / "Moderator.json", "r", encoding="utf-8") as f:
    MOD_ABI = json.load(f)

# Web3 setup (HTTP for txs; WSS optional for future streaming)
w3 = Web3(Web3.HTTPProvider(SOMNIA_RPC_URL))
# If Somnia uses PoA, enable middleware
w3.middleware_onion.inject(geth_poa_middleware, layer=0)

acct = w3.eth.account.from_key(bytes.fromhex(AGENT_PRIV)) if AGENT_PRIV else None
if acct is None:
    raise RuntimeError("AGENT_PRIVATE_KEY is required in .env (without 0x prefix)")

social = w3.eth.contract(address=SOCIAL_ADDR, abi=SOCIAL_ABI)
moderator = w3.eth.contract(address=MODERATOR_ADDR, abi=MOD_ABI)

print("Agent address:", acct.address)
print("SocialPosts:", SOCIAL_ADDR)
print("Moderator:", MODERATOR_ADDR)

# HF pipeline (CPU)
clf = pipeline("text-classification", model=MODEL_NAME, truncation=True, framework="pt")

# Simple polling loop for new PostCreated events
LAST_BLOCK_FILE = Path(".last_block")
if LAST_BLOCK_FILE.exists():
    try:
        last_block = int(LAST_BLOCK_FILE.read_text().strip())
    except Exception:
        last_block = w3.eth.block_number
else:
    last_block = w3.eth.block_number

print("Starting from block:", last_block)


def score_toxicity(text: str) -> int:
    res = clf(text)[0]
    # Some models return {'label': 'toxic', 'score': 0.93}
    # Convert to basis points
    score_bp = int(Decimal(res.get("score", 0)) * 10000)
    return score_bp


def handle_event(ev):
    post_id = ev.args.get("id")
    author = ev.args.get("author")
    content = ev.args.get("content")
    print(f"PostCreated id={post_id} author={author} content={content}")

    try:
        score_bp = score_toxicity(content)
        print(f"Toxicity score_bp={score_bp} threshold_bp={THRESHOLD_BP}")
        if score_bp >= THRESHOLD_BP:
            # Build tx to flag
            # Estimate gas and build transaction
            gas_estimate = moderator.functions.flagPost(post_id, score_bp, MODEL_NAME).estimate_gas({'from': acct.address})
            tx = moderator.functions.flagPost(post_id, score_bp, MODEL_NAME).build_transaction({
                "from": acct.address,
                "nonce": w3.eth.get_transaction_count(acct.address),
                "chainId": CHAIN_ID or w3.eth.chain_id,
                "gas": int(gas_estimate * 1.2),  # 20% buffer
                "gasPrice": w3.to_wei("100", "gwei"),
            })
            signed = acct.sign_transaction(tx)
            tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
            print("Submitted flagPost tx:", tx_hash.hex())
            receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
            print("Flagged. Status:", receipt.status)
        else:
            print("Post deemed safe; not flagging.")
    except Exception as e:
        print("Error handling post:", e)


try:
    print("Agent monitoring for new posts...")
    last_checked_post_id = 0
    
    while True:
        try:
            # Get total posts from contract with retry logic
            total_posts = None
            for retry in range(3):
                try:
                    total_posts = social.functions.totalPosts().call()
                    break
                except Exception as e:
                    if retry == 2:
                        raise e
                    print(f"RPC error (retry {retry + 1}/3): {e}")
                    time.sleep(2)
            
            if total_posts is None:
                continue
                
            # Check if there are new posts
            if total_posts > last_checked_post_id:
                print(f"Found {total_posts - last_checked_post_id} new posts")
                
                # Process each new post
                for post_id in range(last_checked_post_id + 1, total_posts + 1):
                    try:
                        # Get post with retry logic
                        post = None
                        for retry in range(3):
                            try:
                                post = social.functions.getPost(post_id).call()
                                break
                            except Exception as e:
                                if retry == 2:
                                    raise e
                                print(f"Error getting post {post_id} (retry {retry + 1}/3): {e}")
                                time.sleep(2)
                        
                        if post is None:
                            continue
                            
                        print(f"Processing post {post_id}: {post[2][:50]}...")  # post[2] is content
                        
                        # Create a mock event object for handle_event
                        class MockEvent:
                            def __init__(self, post_id, author, content):
                                self.args = {"id": post_id, "author": author, "content": content}
                        
                        mock_event = MockEvent(post[0], post[1], post[2])  # id, author, content
                        handle_event(mock_event)
                        
                    except Exception as e:
                        print(f"Error processing post {post_id}: {e}")
                
                last_checked_post_id = total_posts
            else:
                print(f"No new posts. Total: {total_posts}")
                
        except Exception as e:
            print(f"Error checking for posts: {e}")
            time.sleep(5)  # Wait longer on error
        
        time.sleep(15)  # Check every 15 seconds to reduce RPC load
        
except KeyboardInterrupt:
    print("Agent stopped by user.")
