import json
import os
from pathlib import Path
from dotenv import load_dotenv
from web3 import Web3
from web3.middleware import geth_poa_middleware

load_dotenv()

SOMNIA_RPC_URL = os.getenv("SOMNIA_RPC_URL", "")
CHAIN_ID = int(os.getenv("CHAIN_ID", "0") or 0)
SOCIAL_ADDR = Web3.to_checksum_address(os.getenv("SOCIAL_POSTS_ADDRESS", ""))
MODERATOR_ADDR = Web3.to_checksum_address(os.getenv("MODERATOR_ADDRESS", ""))
AGENT_PRIV = os.getenv("AGENT_PRIVATE_KEY", "")

REPO_ROOT = Path(__file__).resolve().parents[1]
ABI_DIR = REPO_ROOT / "app" / "contracts" / "abis"
with open(ABI_DIR / "SocialPosts.json", "r", encoding="utf-8") as f:
    SOCIAL_ABI = json.load(f)
with open(ABI_DIR / "Moderator.json", "r", encoding="utf-8") as f:
    MOD_ABI = json.load(f)

w3 = Web3(Web3.HTTPProvider(SOMNIA_RPC_URL))
w3.middleware_onion.inject(geth_poa_middleware, layer=0)

acct = w3.eth.account.from_key(bytes.fromhex(AGENT_PRIV))
social = w3.eth.contract(address=SOCIAL_ADDR, abi=SOCIAL_ABI)
moderator = w3.eth.contract(address=MODERATOR_ADDR, abi=MOD_ABI)

print("Testing flagPost transaction...")

post_id = 2  # The "fuck" post
score_bp = 9924
model = "unitary/toxic-bert"

try:
    # Check post before flagging
    post_before = social.functions.getPost(post_id).call()
    print(f"Post {post_id} before flagging: flagged={post_before[3]}")
    
    # Estimate gas first
    try:
        gas_estimate = moderator.functions.flagPost(post_id, score_bp, model).estimate_gas({'from': acct.address})
        print(f"Gas estimate: {gas_estimate}")
    except Exception as e:
        print(f"Gas estimation failed: {e}")
        gas_estimate = 300000
    
    # Build transaction
    tx = moderator.functions.flagPost(post_id, score_bp, model).build_transaction({
        "from": acct.address,
        "nonce": w3.eth.get_transaction_count(acct.address),
        "chainId": CHAIN_ID,
        "gas": int(gas_estimate * 1.5),  # 50% buffer
        "gasPrice": w3.to_wei("100", "gwei"),  # Even higher gas price
    })
    
    print(f"Transaction built: {tx}")
    
    # Sign and send
    signed = acct.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
    print(f"Transaction sent: {tx_hash.hex()}")
    
    # Wait for receipt
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
    print(f"Transaction receipt: status={receipt.status}, gasUsed={receipt.gasUsed}")
    
    if receipt.status == 1:
        print("✅ Transaction succeeded!")
        
        # Check post after flagging
        post_after = social.functions.getPost(post_id).call()
        print(f"Post {post_id} after flagging: flagged={post_after[3]}")
        
        if post_after[3]:
            print("🎉 Post successfully flagged!")
        else:
            print("❌ Post not flagged despite successful transaction")
    else:
        print("❌ Transaction failed")
        
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
