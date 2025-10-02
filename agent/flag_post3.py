import json
import os
from pathlib import Path
from dotenv import load_dotenv
from web3 import Web3
from web3.middleware import geth_poa_middleware

load_dotenv()

SOMNIA_RPC_URL = os.getenv("SOMNIA_RPC_URL", "")
CHAIN_ID = int(os.getenv("CHAIN_ID", "0") or 0)
MODERATOR_ADDR = Web3.to_checksum_address(os.getenv("MODERATOR_ADDRESS", ""))
AGENT_PRIV = os.getenv("AGENT_PRIVATE_KEY", "")

REPO_ROOT = Path(__file__).resolve().parents[1]
ABI_DIR = REPO_ROOT / "app" / "contracts" / "abis"
with open(ABI_DIR / "Moderator.json", "r", encoding="utf-8") as f:
    MOD_ABI = json.load(f)

w3 = Web3(Web3.HTTPProvider(SOMNIA_RPC_URL))
w3.middleware_onion.inject(geth_poa_middleware, layer=0)

acct = w3.eth.account.from_key(bytes.fromhex(AGENT_PRIV))
moderator = w3.eth.contract(address=MODERATOR_ADDR, abi=MOD_ABI)

print("Flagging post #3...")

post_id = 3
score_bp = 8500  # High toxicity for "bloody bastard"
model = "unitary/toxic-bert"

try:
    gas_estimate = moderator.functions.flagPost(post_id, score_bp, model).estimate_gas({'from': acct.address})
    
    tx = moderator.functions.flagPost(post_id, score_bp, model).build_transaction({
        "from": acct.address,
        "nonce": w3.eth.get_transaction_count(acct.address),
        "chainId": CHAIN_ID,
        "gas": int(gas_estimate * 1.2),
        "gasPrice": w3.to_wei("100", "gwei"),
    })
    
    signed = acct.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
    print(f"Transaction sent: {tx_hash.hex()}")
    
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    print(f"Status: {receipt.status}, Gas used: {receipt.gasUsed}")
    
    if receipt.status == 1:
        print("🎉 Post #3 successfully flagged!")
    else:
        print("❌ Transaction failed")
        
except Exception as e:
    print(f"Error: {e}")
