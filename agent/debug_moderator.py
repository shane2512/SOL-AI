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
with open(ABI_DIR / "SocialPosts.json", "r", encoding="utf-8") as f:
    SOCIAL_ABI = json.load(f)
with open(ABI_DIR / "Moderator.json", "r", encoding="utf-8") as f:
    MOD_ABI = json.load(f)

w3 = Web3(Web3.HTTPProvider(SOMNIA_RPC_URL))
acct = w3.eth.account.from_key(bytes.fromhex(AGENT_PRIV))
social = w3.eth.contract(address=SOCIAL_ADDR, abi=SOCIAL_ABI)
moderator = w3.eth.contract(address=MODERATOR_ADDR, abi=MOD_ABI)

print("Agent address:", acct.address)
print("SocialPosts:", SOCIAL_ADDR)
print("Moderator:", MODERATOR_ADDR)

# Check if agent is authorized
try:
    is_authorized = moderator.functions.agents(acct.address).call()
    print(f"Agent authorized: {is_authorized}")
except Exception as e:
    print(f"Error checking authorization: {e}")

# Check moderator address in SocialPosts
try:
    moderator_addr = social.functions.moderator().call()
    print(f"SocialPosts moderator address: {moderator_addr}")
    print(f"Moderator contract address: {MODERATOR_ADDR}")
    print(f"Addresses match: {moderator_addr.lower() == MODERATOR_ADDR.lower()}")
except Exception as e:
    print(f"Error checking moderator: {e}")
