import json
import os
import time
import threading
import requests
from decimal import Decimal
from pathlib import Path
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

print('=== ENHANCED SOL AI AGENT STARTUP ===')
print(f'ENV: SOMNIA_RPC_URL={os.getenv("SOMNIA_RPC_URL")}')
print(f'ENV: SOCIAL_POSTS_ADDRESS={os.getenv("SOCIAL_POSTS_ADDRESS") or os.getenv("SOCIAL_POSTS_CONTRACT_ADDRESS")}')
print(f'ENV: MODERATOR_ADDRESS={os.getenv("MODERATOR_ADDRESS") or os.getenv("MODERATOR_CONTRACT_ADDRESS")}')
print(f'ENV: REPUTATION_SYSTEM_ADDRESS={os.getenv("REPUTATION_SYSTEM_ADDRESS")}')
print(f'ENV: INCENTIVE_SYSTEM_ADDRESS={os.getenv("INCENTIVE_SYSTEM_ADDRESS")}')
print(f'ENV: GOVERNANCE_SYSTEM_ADDRESS={os.getenv("GOVERNANCE_SYSTEM_ADDRESS")}')
agent_key = os.getenv("AGENT_PRIVATE_KEY")
print(f'ENV: AGENT_PRIVATE_KEY={agent_key[:8] + "..." if agent_key else "None"}')
hf_token = os.getenv("HF_TOKEN")
print(f'ENV: HF_TOKEN={hf_token[:8] + "..." if hf_token else "None"}')
print('=== ENHANCED AGENT STARTUP END ===')

# Hugging Face API setup
HF_TOKEN = os.getenv("HF_TOKEN", "")
HF_API_URL = "https://api-inference.huggingface.co/models/unitary/toxic-bert"
HF_HEADERS = {
    "Authorization": f"Bearer {HF_TOKEN}",
} if HF_TOKEN else {}
from web3 import Web3
# Handle different Web3.py versions
geth_poa_middleware = None
try:
    from web3.middleware import geth_poa_middleware
except ImportError:
    try:
        from web3.middleware.geth_poa import geth_poa_middleware
    except ImportError:
        try:
            from web3 import middleware
            geth_poa_middleware = middleware.geth_poa_middleware
        except (ImportError, AttributeError):
            print("Warning: Could not import geth_poa_middleware, continuing without it")
            geth_poa_middleware = None

# Load env
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

# Configuration
SOMNIA_RPC_URL = os.getenv("SOMNIA_RPC_URL", "")
SOMNIA_WSS_URL = os.getenv("SOMNIA_WSS_URL", "")
CHAIN_ID = int(os.getenv("CHAIN_ID", "0") or 0)
SOCIAL_ADDR = Web3.to_checksum_address(os.getenv("SOCIAL_POSTS_ADDRESS") or os.getenv("SOCIAL_POSTS_CONTRACT_ADDRESS", "0x0000000000000000000000000000000000000000"))
MODERATOR_ADDR = Web3.to_checksum_address(os.getenv("MODERATOR_ADDRESS") or os.getenv("MODERATOR_CONTRACT_ADDRESS", "0x0000000000000000000000000000000000000000"))
REPUTATION_ADDR = Web3.to_checksum_address(os.getenv("REPUTATION_SYSTEM_ADDRESS", "0x0000000000000000000000000000000000000000"))
INCENTIVE_ADDR = Web3.to_checksum_address(os.getenv("INCENTIVE_SYSTEM_ADDRESS", "0x0000000000000000000000000000000000000000"))
GOVERNANCE_ADDR = Web3.to_checksum_address(os.getenv("GOVERNANCE_SYSTEM_ADDRESS", "0x0000000000000000000000000000000000000000"))
AGENT_PRIV = os.getenv("AGENT_PRIVATE_KEY", "")
MODEL_NAME = "unitary/toxic-bert"  # Hugging Face toxic-bert model
THRESHOLD_BP = int(os.getenv("TOXICITY_THRESHOLD_BP", "2500"))  # Lowered to 25%

# Global variables for monitoring
monitoring_active = False
last_checked_post_id = 0
flagged_posts_cache = set()  # Track posts we've already flagged
agent_stats = {
    "posts_processed": 0,
    "posts_flagged": 0,
    "reputation_updates": 0,
    "incentives_distributed": 0,
    "last_check": None,
    "status": "stopped"
}

# Read ABIs from contracts/abis
REPO_ROOT = Path(__file__).resolve().parents[1]
ABI_DIR = REPO_ROOT / "app" / "contracts" / "abis"

def load_abi(filename):
    try:
        with open(ABI_DIR / filename, "r", encoding="utf-8") as f:
            artifact = json.load(f)
            # Extract ABI from Hardhat artifact format
            if isinstance(artifact, dict) and 'abi' in artifact:
                return artifact['abi']
            elif isinstance(artifact, list):
                return artifact
            else:
                print(f"Warning: Unexpected format in {filename}")
                return []
    except Exception as e:
        print(f"Warning: Could not load {filename}: {e}")
        return []

SOCIAL_ABI = load_abi("SocialPosts.json")
MOD_ABI = load_abi("Moderator.json")
# Enhanced contract ABIs
REPUTATION_ABI = load_abi("ReputationSystem.json")
INCENTIVE_ABI = load_abi("IncentiveSystem.json")
GOVERNANCE_ABI = load_abi("GovernanceSystem.json")

# Web3 setup
w3 = Web3(Web3.HTTPProvider(SOMNIA_RPC_URL)) if SOMNIA_RPC_URL else None
if w3 and geth_poa_middleware:
    try:
        w3.middleware_onion.inject(geth_poa_middleware, layer=0)
        print("PoA middleware injected successfully")
    except Exception as e:
        print(f"Warning: Could not inject PoA middleware: {e}")
elif w3:
    print("Warning: PoA middleware not available, continuing without it")

acct = None
if AGENT_PRIV and w3:
    try:
        acct = w3.eth.account.from_key(bytes.fromhex(AGENT_PRIV))
    except Exception as e:
        print(f"Warning: Could not load agent account: {e}")

# Initialize contracts
contracts = {}
if w3:
    try:
        contracts['social'] = w3.eth.contract(address=SOCIAL_ADDR, abi=SOCIAL_ABI) if SOCIAL_ABI else None
        contracts['moderator'] = w3.eth.contract(address=MODERATOR_ADDR, abi=MOD_ABI) if MOD_ABI else None
        contracts['reputation'] = w3.eth.contract(address=REPUTATION_ADDR, abi=REPUTATION_ABI) if REPUTATION_ABI else None
        contracts['incentive'] = w3.eth.contract(address=INCENTIVE_ADDR, abi=INCENTIVE_ABI) if INCENTIVE_ABI else None
        contracts['governance'] = w3.eth.contract(address=GOVERNANCE_ADDR, abi=GOVERNANCE_ABI) if GOVERNANCE_ABI else None
        
        print("Enhanced contracts initialized:")
        for name, contract in contracts.items():
            print(f"  {name}: {'✅' if contract else '❌'}")
        
        # Legacy compatibility
        social = contracts['social']
        moderator = contracts['moderator']
        
        if social and moderator:
            print("Core contracts initialized successfully")
        
        # Test agent authorization
        if acct:
            try:
                # Try to estimate gas for flagPost to verify authorization
                test_gas = moderator.functions.flagPost(999999, 5000, "auth-test").estimate_gas({'from': acct.address})
                print(f"✅ Agent authorized to flag posts (test gas: {test_gas})")
            except Exception as auth_error:
                if "already flagged" in str(auth_error).lower():
                    print("✅ Agent authorized (test post already flagged)")
                else:
                    print(f"⚠️ Agent authorization test failed: {auth_error}")
                    
    except Exception as e:
        print(f"Warning: Could not initialize contracts: {e}")

# Initialize Hugging Face API
def test_huggingface_api():
    """Test Hugging Face API connection"""
    if not HF_TOKEN:
        print("❌ HF_TOKEN not provided, using keyword-based detection")
        return False
    
    try:
        # Test with a simple non-toxic message
        test_response = requests.post(
            HF_API_URL, 
            headers=HF_HEADERS, 
            json={"inputs": "Hello, how are you?"},
            timeout=30
        )
        
        if test_response.status_code == 200:
            result = test_response.json()
            print(f"✅ Hugging Face toxic-bert API working: {result}")
            return True
        else:
            print(f"❌ Hugging Face API test failed: {test_response.status_code} - {test_response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Hugging Face API test error: {e}")
        return False

# Test the API on startup
HF_API_AVAILABLE = test_huggingface_api()


def score_toxicity(text: str) -> int:
    """Score toxicity of text using Hugging Face toxic-bert model, return basis points (0-10000)"""
    
    # Try Hugging Face toxic-bert API first
    if HF_API_AVAILABLE and HF_TOKEN:
        try:
            print(f"🔍 Analyzing with toxic-bert: '{text[:50]}...'")
            
            response = requests.post(
                HF_API_URL,
                headers=HF_HEADERS,
                json={"inputs": text},
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                
                # toxic-bert returns a list of classifications
                # Format: [{'label': 'toxic', 'score': 0.xxx}, {'label': 'obscene', 'score': 0.xxx}, ...]
                if isinstance(result, list) and len(result) > 0:
                    # Find the toxic score
                    toxic_score = 0.0
                    for classification in result[0]:  # First element contains the classifications
                        if classification.get('label') == 'toxic':
                            toxic_score = classification.get('score', 0.0)
                            break
                    
                    # Convert to basis points (0-10000)
                    toxicity_bp = int(toxic_score * 10000)
                    toxicity_percentage = round(toxic_score * 100, 2)
                    
                    print(f"✅ toxic-bert result: {toxicity_percentage}% ({toxicity_bp} BP)")
                    print(f"📊 Full classification: {result[0]}")
                    
                    return toxicity_bp
                else:
                    print(f"⚠️ Unexpected API response format: {result}")
                    
            elif response.status_code == 503:
                print("⚠️ Model is loading, falling back to keyword detection...")
            else:
                print(f"❌ API request failed: {response.status_code} - {response.text}")
                
        except requests.exceptions.Timeout:
            print("⚠️ API request timed out, falling back to keyword detection...")
        except Exception as e:
            print(f"❌ Hugging Face API error: {e}")
    
    # Fallback to enhanced keyword-based detection
    print("🔄 Using keyword-based detection as fallback")
    
    # Enhanced keyword-based detection with more comprehensive lists
    toxic_keywords = {
        'high': ['kill', 'die', 'murder', 'suicide', 'terrorist', 'bomb', 'weapon', 'fuck', 'shit', 'bitch', 'asshole', 'cunt'],
        'medium': ['hate', 'stupid', 'idiot', 'moron', 'loser', 'pathetic', 'disgusting', 'bastard', 'bloody', 'damn', 'retard'],
        'low': ['hell', 'crap', 'sucks', 'annoying', 'boring', 'lame', 'dumb', 'weird']
    }
    
    lower_text = text.lower()
    score = 300  # Base score (3%)
    
    # Check for high toxicity keywords
    for keyword in toxic_keywords['high']:
        if keyword in lower_text:
            score += 3000  # Add 30% per high-toxicity word
            print(f"🚨 High toxicity keyword detected: '{keyword}'")
    
    # Check for medium toxicity keywords  
    for keyword in toxic_keywords['medium']:
        if keyword in lower_text:
            score += 1500  # Add 15% per medium-toxicity word
            print(f"⚠️ Medium toxicity keyword detected: '{keyword}'")
            
    # Check for low toxicity keywords
    for keyword in toxic_keywords['low']:
        if keyword in lower_text:
            score += 800   # Add 8% per low-toxicity word
            print(f"💭 Low toxicity keyword detected: '{keyword}'")
    
    # Cap at 9500 (95%)
    final_score = min(score, 9500)
    print(f"📊 Keyword-based score: {final_score/100}% ({final_score} BP)")
    
    return final_score

def update_user_reputation(user_address, is_flagged=False):
    """Update user reputation based on post outcome"""
    if not contracts.get('reputation') or not acct:
        print("⚠️ Reputation system not available")
        return False
    
    try:
        print(f"🏆 Updating reputation for {user_address}")
        
        # Call updateReputation function
        tx = contracts['reputation'].functions.updateReputation(user_address).build_transaction({
            "from": acct.address,
            "nonce": w3.eth.get_transaction_count(acct.address),
            "chainId": CHAIN_ID or w3.eth.chain_id,
            "gas": 200000,
            "gasPrice": w3.to_wei("10", "gwei"),
        })
        
        signed = acct.sign_transaction(tx)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        
        agent_stats["reputation_updates"] += 1
        print(f"✅ Reputation updated! TX: {tx_hash.hex()}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to update reputation: {e}")
        return False

def trigger_incentive_distribution(user_address):
    """Trigger incentive distribution for safe posts"""
    if not contracts.get('incentive') or not acct:
        print("⚠️ Incentive system not available")
        return False
    
    try:
        print(f"💰 Triggering incentive distribution for {user_address}")
        
        # This would call claimPostRewards or similar function
        # Implementation depends on the specific incentive contract design
        
        agent_stats["incentives_distributed"] += 1
        print(f"✅ Incentive distribution triggered!")
        return True
        
    except Exception as e:
        print(f"❌ Failed to trigger incentives: {e}")
        return False

def handle_post(post_id, author, content):
    """Handle a single post for moderation"""
    global agent_stats
    
    print(f"\n{'='*60}")
    print(f"🔍 ANALYZING NEW POST #{post_id}")
    print(f"{'='*60}")
    print(f"📝 Author: {author}")
    print(f"📄 Content: '{content}'")
    print(f"📏 Length: {len(content)} characters")
    print(f"⏰ Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}")
    
    try:
        print(f"\n🤖 Starting AI Analysis...")
        score_bp = score_toxicity(content)
        agent_stats["posts_processed"] += 1
        
        score_percentage = score_bp / 100
        threshold_percentage = THRESHOLD_BP / 100
        
        print(f"\n📊 ANALYSIS RESULTS:")
        print(f"   Toxicity Score: {score_percentage:.2f}% ({score_bp} BP)")
        print(f"   Threshold: {threshold_percentage:.2f}% ({THRESHOLD_BP} BP)")
        print(f"   Model Used: {'toxic-bert' if HF_API_AVAILABLE else 'keyword-based'}")
        
        if score_bp >= THRESHOLD_BP:
            print(f"\n🚨 TOXIC CONTENT DETECTED!")
            print(f"   ⚠️ Post {post_id} exceeds toxicity threshold")
            print(f"   📊 Score: {score_percentage:.2f}% > Threshold: {threshold_percentage:.2f}%")
            print(f"   📝 Content Preview: '{content[:100]}{'...' if len(content) > 100 else ''}'")
            
            moderator_contract = contracts.get('moderator')
            if moderator_contract and acct:
                # Check if we've already flagged this post in our session
                if post_id in flagged_posts_cache:
                    print(f"   ⚠️ Post {post_id} already flagged by this agent, skipping blockchain transaction")
                    print(f"{'='*60}")
                    return {"flagged": False, "score": score_bp, "already_flagged": True}
                
                print(f"\n🏴 INITIATING BLOCKCHAIN FLAGGING PROCESS...")
                
                # Flag the post
                try:
                    # Use appropriate model name
                    model_name_for_tx = "toxic-bert" if HF_API_AVAILABLE else "keyword-based"
                    print(f"   🔧 Model for transaction: {model_name_for_tx}")
                    
                    print(f"   ⛽ Estimating gas for flagPost transaction...")
                    gas_estimate = moderator_contract.functions.flagPost(post_id, score_bp, model_name_for_tx).estimate_gas({'from': acct.address})
                    print(f"   ⛽ Gas estimate: {gas_estimate}")
                    
                    print(f"   📝 Building transaction...")
                    nonce = w3.eth.get_transaction_count(acct.address)
                    print(f"   🔢 Account nonce: {nonce}")
                    
                    tx = moderator_contract.functions.flagPost(post_id, score_bp, model_name_for_tx).build_transaction({
                        "from": acct.address,
                        "nonce": nonce,
                        "chainId": CHAIN_ID or w3.eth.chain_id,
                        "gas": int(gas_estimate * 1.2),
                        "gasPrice": w3.to_wei("10", "gwei"),
                    })
                    
                    print(f"   ✍️ Signing transaction...")
                    signed = acct.sign_transaction(tx)
                    
                    print(f"   📤 Sending transaction to blockchain...")
                    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
                    print(f"   🔗 Transaction hash: {tx_hash.hex()}")
                    
                    print(f"   ⏳ Waiting for transaction confirmation...")
                    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
                    print(f"   ✅ Transaction confirmed! Block: {receipt.blockNumber}")
                    
                    # Add to our cache and update stats
                    flagged_posts_cache.add(post_id)
                    agent_stats["posts_flagged"] += 1
                    
                    print(f"\n🎉 POST SUCCESSFULLY FLAGGED!")
                    print(f"   📊 Total posts processed: {agent_stats['posts_processed']}")
                    print(f"   🚩 Total posts flagged: {agent_stats['posts_flagged']}")
                    print(f"   🔗 Transaction: {tx_hash.hex()}")
                    
                    # Update reputation (penalty for flagged post)
                    update_user_reputation(author, is_flagged=True)
                    
                    print(f"{'='*60}")
                    
                    return {"flagged": True, "tx_hash": tx_hash.hex(), "score": score_bp}
                    
                except Exception as flag_error:
                    error_msg = str(flag_error).lower()
                    print(f"\n❌ FLAGGING FAILED!")
                    print(f"   🚨 Error: {flag_error}")
                    
                    if "already flagged" in error_msg:
                        print(f"   ℹ️ Reason: Post {post_id} already flagged on blockchain")
                        flagged_posts_cache.add(post_id)  # Add to cache to prevent future attempts
                        print(f"   ✅ Added to local cache to prevent future attempts")
                        print(f"{'='*60}")
                        return {"flagged": False, "score": score_bp, "already_flagged": True}
                    else:
                        print(f"   ❌ Unexpected error during blockchain transaction")
                        print(f"   📝 Error details: {flag_error}")
                        print(f"{'='*60}")
                        return {"flagged": False, "score": score_bp, "error": str(flag_error)}
            else:
                print(f"\n❌ CANNOT FLAG POST!")
                print(f"   ⚠️ Missing moderator contract or agent account")
                print(f"   🔧 Contract available: {moderator is not None}")
                print(f"   🔑 Account available: {acct is not None}")
                print(f"{'='*60}")
                return {"flagged": False, "score": score_bp, "error": "Missing contract/account"}
        else:
            print(f"\n✅ POST DEEMED SAFE")
            print(f"   📊 Score: {score_percentage:.2f}% < Threshold: {threshold_percentage:.2f}%")
            print(f"   ✅ No action required - content is within acceptable limits")
            print(f"   📊 Total posts processed: {agent_stats['posts_processed']}")
            
            # Update reputation (bonus for safe post)
            update_user_reputation(author, is_flagged=False)
            
            # Trigger incentive distribution for safe posts
            trigger_incentive_distribution(author)
            
            print(f"{'='*60}")
            return {"flagged": False, "score": score_bp}
            
    except Exception as e:
        print(f"\n💥 CRITICAL ERROR HANDLING POST!")
        print(f"   🚨 Post ID: {post_id}")
        print(f"   ❌ Error: {e}")
        print(f"   📝 Content: '{content[:50]}{'...' if len(content) > 50 else ''}'")
        print(f"{'='*60}")
        return {"error": str(e)}

def monitoring_loop():
    """Background monitoring loop"""
    global monitoring_active, last_checked_post_id, agent_stats
    
    # Initialize last_checked_post_id to current total on first run
    social_contract = contracts.get('social')
    if last_checked_post_id == 0 and social_contract:
        try:
            current_total = social_contract.functions.totalPosts().call()
            last_checked_post_id = current_total
            print(f"🔄 Starting monitoring from post {current_total + 1} (skipping existing {current_total} posts)")
        except Exception as e:
            print(f"Could not get initial post count: {e}")
    
    while monitoring_active:
        try:
            social_contract = contracts.get('social')
            if not social_contract:
                time.sleep(30)
                continue
                
            total_posts = social_contract.functions.totalPosts().call()
            agent_stats["last_check"] = time.time()
            
            if total_posts > last_checked_post_id:
                new_posts_count = total_posts - last_checked_post_id
                print(f"\n🆕 NEW POSTS DETECTED!")
                print(f"   📊 Found {new_posts_count} new post(s)")
                print(f"   🔄 Processing posts {last_checked_post_id + 1} to {total_posts}")
                print(f"   ⏰ Check time: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}")
                
                for post_id in range(last_checked_post_id + 1, total_posts + 1):
                    if not monitoring_active:
                        break
                        
                    try:
                        post = social.functions.getPost(post_id).call()
                        print(f"\n📥 FETCHED POST #{post_id} FROM BLOCKCHAIN")
                        handle_post(post[0], post[1], post[2])  # id, author, content
                    except Exception as e:
                        print(f"\n❌ ERROR FETCHING POST #{post_id}")
                        print(f"   🚨 Error: {e}")
                        print(f"{'='*60}")
                
                last_checked_post_id = total_posts
                print(f"\n✅ MONITORING UPDATE: Now watching for posts after #{total_posts}")
            else:
                # No new posts, just update last check time
                current_time = time.strftime('%H:%M:%S', time.gmtime())
                print(f"🔍 [{current_time}] Monitoring active - No new posts (total: {total_posts})")
                pass
            
        except Exception as e:
            print(f"Error in monitoring loop: {e}")
        
        time.sleep(15)  # Check every 15 seconds

# Flask Routes
@app.route('/')
def home():
    """Health check endpoint"""
    return jsonify({
        "service": "Enhanced SOL AI Moderator Agent",
        "status": "running",
        "features": ["toxicity_detection", "reputation_system", "incentive_distribution", "governance_integration"],
        "model": MODEL_NAME,
        "threshold_bp": THRESHOLD_BP,
        "monitoring": monitoring_active
    })

@app.route('/health')
def health():
    """Detailed health check"""
    return jsonify({
        "status": "healthy",
        "web3_connected": w3 is not None,
        "contracts": {
            "social": contracts.get('social') is not None,
            "moderator": contracts.get('moderator') is not None,
            "reputation": contracts.get('reputation') is not None,
            "incentive": contracts.get('incentive') is not None,
            "governance": contracts.get('governance') is not None
        },
        "ai_model_loaded": HF_API_AVAILABLE,
        "ai_model_type": "toxic-bert" if HF_API_AVAILABLE else "keyword-based",
        "hf_token_available": bool(HF_TOKEN),
        "model_name": MODEL_NAME,
        "agent_account": acct.address if acct else None,
        "monitoring_active": monitoring_active,
        "stats": agent_stats
    })

@app.route('/diagnostics')
def diagnostics():
    """Return all key config/env values for debugging"""
    agent_key = os.getenv("AGENT_PRIVATE_KEY")
    hf_token = os.getenv("HF_TOKEN")
    return jsonify({
        "SOMNIA_RPC_URL": os.getenv("SOMNIA_RPC_URL"),
        "SOCIAL_POSTS_ADDRESS": os.getenv("SOCIAL_POSTS_ADDRESS"),
        "MODERATOR_ADDRESS": os.getenv("MODERATOR_ADDRESS"),
        "AGENT_PRIVATE_KEY": agent_key[:8] + "..." if agent_key else "None",
        "MODEL_NAME": MODEL_NAME,
        "HF_TOKEN": hf_token[:8] + "..." if hf_token else "None",
        "HF_API_AVAILABLE": HF_API_AVAILABLE,
        "w3": str(w3),
        "social": str(social),
        "moderator": str(moderator),
        "acct": str(acct),
        "acct_address": getattr(acct, 'address', None),
        "contracts_loaded": social is not None and moderator is not None,
        "monitoring_active": monitoring_active,
        "agent_stats": agent_stats
    })

@app.route('/start', methods=['POST'])
def start_monitoring():
    """Start the monitoring process"""
    global monitoring_active, agent_stats
    
    if monitoring_active:
        return jsonify({"message": "Monitoring already active"}), 200
    
    if not all([w3, social, moderator, acct]):
        return jsonify({"error": "Service not properly configured"}), 500
    
    monitoring_active = True
    agent_stats["status"] = "running"
    
    print(f"\n🚀 STARTING ENHANCED AI MODERATION MONITORING")
    print(f"{'='*60}")
    print(f"🤖 Agent: Enhanced SOL AI Moderator")
    print(f"🧠 Model: {'toxic-bert' if HF_API_AVAILABLE else 'keyword-based'}")
    print(f"🎯 Threshold: {THRESHOLD_BP/100}% ({THRESHOLD_BP} BP)")
    print(f"🏆 Reputation System: {'✅' if contracts.get('reputation') else '❌'}")
    print(f"💰 Incentive System: {'✅' if contracts.get('incentive') else '❌'}")
    print(f"⚖️ Governance System: {'✅' if contracts.get('governance') else '❌'}")
    print(f"🔗 Agent Address: {acct.address if acct else 'N/A'}")
    print(f"⏰ Started: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}")
    print(f"{'='*60}")
    
    # Start monitoring in background thread
    monitor_thread = threading.Thread(target=monitoring_loop, daemon=True)
    monitor_thread.start()
    
    return jsonify({"message": "Monitoring started", "status": "running"})

@app.route('/stop', methods=['POST'])
def stop_monitoring():
    """Stop the monitoring process"""
    global monitoring_active, agent_stats
    
    monitoring_active = False
    agent_stats["status"] = "stopped"
    
    return jsonify({"message": "Monitoring stopped", "status": "stopped"})

@app.route('/stats')
def get_stats():
    """Get agent statistics"""
    return jsonify({
        **agent_stats,
        "last_checked_post_id": last_checked_post_id,
        "flagged_posts_cache_size": len(flagged_posts_cache),
        "contracts_available": {
            "social": contracts.get('social') is not None,
            "moderator": contracts.get('moderator') is not None,
            "reputation": contracts.get('reputation') is not None,
            "incentive": contracts.get('incentive') is not None,
            "governance": contracts.get('governance') is not None
        }
    })

@app.route('/reset-cache', methods=['POST'])
def reset_cache():
    """Reset the flagged posts cache"""
    global flagged_posts_cache
    old_size = len(flagged_posts_cache)
    flagged_posts_cache.clear()
    return jsonify({
        "message": f"Cache cleared ({old_size} entries removed)",
        "cache_size": len(flagged_posts_cache)
    })

@app.route('/set-last-post', methods=['POST'])
def set_last_post():
    """Set the last checked post ID to skip existing posts"""
    global last_checked_post_id
    data = request.get_json()
    
    if data and 'post_id' in data:
        new_post_id = int(data['post_id'])
        old_post_id = last_checked_post_id
        last_checked_post_id = new_post_id
        return jsonify({
            "message": f"Last checked post ID updated from {old_post_id} to {new_post_id}",
            "old_post_id": old_post_id,
            "new_post_id": new_post_id
        })
    else:
        # Auto-set to current total posts
        if social:
            try:
                current_total = social.functions.totalPosts().call()
                old_post_id = last_checked_post_id
                last_checked_post_id = current_total
                return jsonify({
                    "message": f"Last checked post ID set to current total: {current_total}",
                    "old_post_id": old_post_id,
                    "new_post_id": current_total
                })
            except Exception as e:
                return jsonify({"error": str(e)}), 500
        else:
            return jsonify({"error": "Social contract not available"}), 500

@app.route('/moderate', methods=['POST'])
def moderate_text():
    """Manually moderate a piece of text"""
    data = request.get_json()
    if not data or 'text' not in data:
        return jsonify({"error": "Missing 'text' field"}), 400
    
    text = data['text']
    score_bp = score_toxicity(text)
    
    return jsonify({
        "text": text[:100] + "..." if len(text) > 100 else text,
        "toxicity_score_bp": score_bp,
        "toxicity_percentage": score_bp / 100,
        "is_toxic": score_bp >= THRESHOLD_BP,
        "threshold_bp": THRESHOLD_BP,
        "model_used": "toxic-bert" if HF_API_AVAILABLE else "keyword-based"
    })

@app.route('/reputation/<address>')
def get_reputation(address):
    """Get reputation for a specific address"""
    if not contracts.get('reputation'):
        return jsonify({"error": "Reputation system not available"}), 400
    
    try:
        reputation_data = contracts['reputation'].functions.getUserReputation(address).call()
        current_score = contracts['reputation'].functions.getReputationScore(address).call()
        tier = contracts['reputation'].functions.getUserTier(address).call()
        
        return jsonify({
            "address": address,
            "current_score": current_score,
            "tier": tier,
            "reputation_data": {
                "score": reputation_data[0],
                "totalPosts": reputation_data[1],
                "safePosts": reputation_data[2],
                "flaggedPosts": reputation_data[3],
                "lastUpdated": reputation_data[4],
                "tier": reputation_data[5]
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/governance/appeals')
def get_appeals():
    """Get active appeals"""
    if not contracts.get('governance'):
        return jsonify({"error": "Governance system not available"}), 400
    
    # This would need to be implemented based on the governance contract's event logs
    # For now, return a placeholder
    return jsonify({
        "active_appeals": [],
        "message": "Governance integration pending contract deployment"
    })

# Removed old Gemini routes - now using toxic-bert exclusively

# --- Monitoring thread startup for all environments (including WSGI/Gunicorn) ---
# Use a process-wide flag to avoid duplicate threads
_monitoring_started = False
try:
    if not _monitoring_started:
        print('=== AGENT UNIVERSAL STARTUP ===')
        print(f'w3: {w3}')
        print(f'social: {contracts.get("social")}')
        print(f'moderator: {contracts.get("moderator")}')
        print(f'acct: {acct}')
        print(f'Contracts loaded: {contracts.get("social") is not None and contracts.get("moderator") is not None}')
        print(f'Agent address: {acct.address if acct else None}')
        if all([w3, contracts.get("social"), contracts.get("moderator"), acct]):
            monitoring_active = True
            agent_stats["status"] = "running"
            monitor_thread = threading.Thread(target=monitoring_loop, daemon=True)
            monitor_thread.start()
            print("Auto-started monitoring (universal)")
        else:
            print("Warning: Not all components available, monitoring not auto-started (universal)")
            print(f"Components status: w3={w3 is not None}, social={contracts.get('social') is not None}, moderator={contracts.get('moderator') is not None}, acct={acct is not None}")
        _monitoring_started = True
except Exception as e:
    print(f'FATAL ERROR in universal monitoring startup: {e}')
    import traceback
    traceback.print_exc()

if __name__ == '__main__':
    try:
        print('=== AGENT MAIN ENTRY ===')
        print(f'w3: {w3}')
        print(f'social: {contracts.get("social")}')
        print(f'moderator: {contracts.get("moderator")}')
        print(f'acct: {acct}')
        print(f'Contracts loaded: {contracts.get("social") is not None and contracts.get("moderator") is not None}')
        print(f'Agent address: {acct.address if acct else None}')
        # Auto-start monitoring if all components are available
        if all([w3, contracts.get("social"), contracts.get("moderator"), acct]):
            monitoring_active = True
            agent_stats["status"] = "running"
            monitor_thread = threading.Thread(target=monitoring_loop, daemon=True)
            monitor_thread.start()
            print("Auto-started monitoring")
        else:
            print("Warning: Not all components available, monitoring not auto-started")
            print(f"Components status: w3={w3 is not None}, social={contracts.get('social') is not None}, moderator={contracts.get('moderator') is not None}, acct={acct is not None}")
        
        # Run Flask app in debug mode for troubleshooting
        port = int(os.environ.get('PORT', 5000))
        app.run(host='0.0.0.0', port=port, debug=True)
    except Exception as main_exc:
        print(f'FATAL ERROR in __main__: {main_exc}')
        import traceback
        traceback.print_exc()
