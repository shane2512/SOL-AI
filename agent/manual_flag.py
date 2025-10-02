import json
import os
from pathlib import Path
from dotenv import load_dotenv
from web3 import Web3
from web3.middleware import geth_poa_middleware

# Load env
load_dotenv()

SOMNIA_RPC_URL = os.getenv("SOMNIA_RPC_URL", "")
CHAIN_ID = int(os.getenv("CHAIN_ID", "0") or 0)
MODERATOR_ADDR = Web3.to_checksum_address(os.getenv("MODERATOR_ADDRESS", ""))
AGENT_PRIV = os.getenv("AGENT_PRIVATE_KEY", "")

# Read ABI
REPO_ROOT = Path(__file__).resolve().parents[1]
ABI_DIR = REPO_ROOT / "app" / "contracts" / "abis"
with open(ABI_DIR / "Moderator.json", "r", encoding="utf-8") as f:
    MOD_ABI = json.load(f)

# Web3 setup
w3 = Web3(Web3.HTTPProvider(SOMNIA_RPC_URL))
w3.middleware_onion.inject(geth_poa_middleware, layer=0)

acct = w3.eth.account.from_key(bytes.fromhex(AGENT_PRIV))
moderator = w3.eth.contract(address=MODERATOR_ADDR, abi=MOD_ABI)

print("Agent address:", acct.address)
print("Moderator:", MODERATOR_ADDR)

# Manually flag post #2 (the "fuck" post)
post_id = 2
score_bp = 9924  # High toxicity score
model = "unitary/toxic-bert"

try:
    print(f"Flagging post {post_id} with score {score_bp}...")
    
    tx = moderator.functions.flagPost(post_id, score_bp, model).build_transaction({
        "from": acct.address,
        "nonce": w3.eth.get_transaction_count(acct.address),
        "chainId": CHAIN_ID,
        "gas": 300000,
        "gasPrice": w3.to_wei("20", "gwei"),
    })
    
    signed = acct.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
    print("Submitted flagPost tx:", tx_hash.hex())
    
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    print("Flagged successfully! Status:", receipt.status)
    
except Exception as e:
    print("Error flagging post:", e)
