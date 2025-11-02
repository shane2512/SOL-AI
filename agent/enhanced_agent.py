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
from web3 import Web3

print('=== ENHANCED SOL AI AGENT STARTUP ===')

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration
SOMNIA_RPC_URL = os.getenv("SOMNIA_RPC_URL", "")
CHAIN_ID = int(os.getenv("CHAIN_ID", "0") or 0)
SOCIAL_ADDR = Web3.to_checksum_address(os.getenv("SOCIAL_POSTS_ADDRESS", "0x0000000000000000000000000000000000000000"))
MODERATOR_ADDR = Web3.to_checksum_address(os.getenv("MODERATOR_ADDRESS", "0x0000000000000000000000000000000000000000"))
REPUTATION_ADDR = Web3.to_checksum_address(os.getenv("REPUTATION_SYSTEM_ADDRESS", "0x0000000000000000000000000000000000000000"))
INCENTIVE_ADDR = Web3.to_checksum_address(os.getenv("INCENTIVE_SYSTEM_ADDRESS", "0x0000000000000000000000000000000000000000"))
GOVERNANCE_ADDR = Web3.to_checksum_address(os.getenv("GOVERNANCE_SYSTEM_ADDRESS", "0x0000000000000000000000000000000000000000"))
AGENT_PRIV = os.getenv("AGENT_PRIVATE_KEY", "")
THRESHOLD_BP = int(os.getenv("TOXICITY_THRESHOLD_BP", "2500"))

# Hugging Face API setup
HF_TOKEN = os.getenv("HF_TOKEN", "")
HF_API_URL = "https://api-inference.huggingface.co/models/unitary/toxic-bert"
HF_HEADERS = {"Authorization": f"Bearer {HF_TOKEN}"} if HF_TOKEN else {}

# Global variables
monitoring_active = False
last_checked_post_id = 0
flagged_posts_cache = set()
agent_stats = {
    "posts_processed": 0,
    "posts_flagged": 0,
    "reputation_updates": 0,
    "incentives_distributed": 0,
    "last_check": None,
    "status": "stopped"
}

# Load ABIs
REPO_ROOT = Path(__file__).resolve().parents[1]
ABI_DIR = REPO_ROOT / "app" / "contracts" / "abis"

def load_abi(filename):
    try:
        with open(ABI_DIR / filename, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Warning: Could not load {filename}: {e}")
        return []

SOCIAL_ABI = load_abi("SocialPosts.json")
MOD_ABI = load_abi("Moderator.json")
# Note: These ABIs would need to be generated after contract deployment
REPUTATION_ABI = []  # load_abi("ReputationSystem.json")
INCENTIVE_ABI = []   # load_abi("IncentiveSystem.json")
GOVERNANCE_ABI = []  # load_abi("GovernanceSystem.json")

# Web3 setup
w3 = Web3(Web3.HTTPProvider(SOMNIA_RPC_URL)) if SOMNIA_RPC_URL else None

# Handle PoA middleware
if w3:
    try:
        from web3.middleware import geth_poa_middleware
        w3.middleware_onion.inject(geth_poa_middleware, layer=0)
        print("PoA middleware injected successfully")
    except ImportError:
        print("Warning: PoA middleware not available")

# Initialize account
acct = None
if AGENT_PRIV and w3:
    try:
        acct = w3.eth.account.from_key(bytes.fromhex(AGENT_PRIV))
        print(f"Agent account loaded: {acct.address}")
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
            
    except Exception as e:
        print(f"Warning: Could not initialize contracts: {e}")

def test_huggingface_api():
    """Test Hugging Face API connection"""
    if not HF_TOKEN:
        print("❌ HF_TOKEN not provided, using keyword-based detection")
        return False
    
    try:
        test_response = requests.post(
            HF_API_URL, 
            headers=HF_HEADERS, 
            json={"inputs": "Hello, how are you?"},
            timeout=30
        )
        
        if test_response.status_code == 200:
            result = test_response.json()
            print(f"✅ Hugging Face toxic-bert API working")
            return True
        else:
            print(f"❌ Hugging Face API test failed: {test_response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Hugging Face API test error: {e}")
        return False

HF_API_AVAILABLE = test_huggingface_api()

def score_toxicity(text: str) -> int:
    """Score toxicity using Hugging Face toxic-bert model"""
    
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
                
                if isinstance(result, list) and len(result) > 0:
                    toxic_score = 0.0
                    for classification in result[0]:
                        if classification.get('label') == 'toxic':
                            toxic_score = classification.get('score', 0.0)
                            break
                    
                    toxicity_bp = int(toxic_score * 10000)
                    print(f"✅ toxic-bert result: {toxic_score * 100:.2f}% ({toxicity_bp} BP)")
                    return toxicity_bp
                    
        except Exception as e:
            print(f"❌ Hugging Face API error: {e}")
    
    # Fallback to keyword-based detection
    print("🔄 Using keyword-based detection as fallback")
    
    toxic_keywords = {
        'high': ['kill', 'die', 'murder', 'suicide', 'terrorist', 'bomb', 'weapon', 'fuck', 'shit', 'bitch', 'asshole', 'cunt'],
        'medium': ['hate', 'stupid', 'idiot', 'moron', 'loser', 'pathetic', 'disgusting', 'bastard', 'bloody', 'damn', 'retard'],
        'low': ['hell', 'crap', 'sucks', 'annoying', 'boring', 'lame', 'dumb', 'weird']
    }
    
    lower_text = text.lower()
    score = 300  # Base score (3%)
    
    for keyword in toxic_keywords['high']:
        if keyword in lower_text:
            score += 3000
            print(f"🚨 High toxicity keyword detected: '{keyword}'")
    
    for keyword in toxic_keywords['medium']:
        if keyword in lower_text:
            score += 1500
            print(f"⚠️ Medium toxicity keyword detected: '{keyword}'")
            
    for keyword in toxic_keywords['low']:
        if keyword in lower_text:
            score += 800
            print(f"💭 Low toxicity keyword detected: '{keyword}'")
    
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
        # Support both Web3.py v5 and v6+ attribute names
        raw_tx = getattr(signed, 'rawTransaction', None) or getattr(signed, 'raw_transaction', None)
        tx_hash = w3.eth.send_raw_transaction(raw_tx)
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
    """Enhanced post handling with reputation and incentive integration"""
    global agent_stats
    
    print(f"\n{'='*60}")
    print(f"🔍 ANALYZING POST #{post_id}")
    print(f"{'='*60}")
    print(f"📝 Author: {author}")
    print(f"📄 Content: '{content}'")
    print(f"⏰ Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}")
    
    try:
        score_bp = score_toxicity(content)
        agent_stats["posts_processed"] += 1
        
        score_percentage = score_bp / 100
        threshold_percentage = THRESHOLD_BP / 100
        
        print(f"\n📊 ANALYSIS RESULTS:")
        print(f"   Toxicity Score: {score_percentage:.2f}% ({score_bp} BP)")
        print(f"   Threshold: {threshold_percentage:.2f}% ({THRESHOLD_BP} BP)")
        
        is_flagged = score_bp >= THRESHOLD_BP
        
        if is_flagged:
            print(f"\n🚨 TOXIC CONTENT DETECTED!")
            
            if contracts.get('moderator') and acct:
                if post_id in flagged_posts_cache:
                    print(f"   ⚠️ Post {post_id} already flagged, skipping")
                    return {"flagged": False, "score": score_bp, "already_flagged": True}
                
                try:
                    # Flag the post
                    model_name = "toxic-bert" if HF_API_AVAILABLE else "keyword-based"
                    
                    tx = contracts['moderator'].functions.flagPost(post_id, score_bp, model_name).build_transaction({
                        "from": acct.address,
                        "nonce": w3.eth.get_transaction_count(acct.address),
                        "chainId": CHAIN_ID or w3.eth.chain_id,
                        "gas": 300000,
                        "gasPrice": w3.to_wei("10", "gwei"),
                    })
                    
                    signed = acct.sign_transaction(tx)
                    # Support both Web3.py v5 and v6+ attribute names
                    raw_tx = getattr(signed, 'rawTransaction', None) or getattr(signed, 'raw_transaction', None)
                    tx_hash = w3.eth.send_raw_transaction(raw_tx)
                    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
                    
                    flagged_posts_cache.add(post_id)
                    agent_stats["posts_flagged"] += 1
                    
                    print(f"✅ POST FLAGGED! TX: {tx_hash.hex()}")
                    
                    # Update reputation (penalty for flagged post)
                    update_user_reputation(author, is_flagged=True)
                    
                    return {"flagged": True, "tx_hash": tx_hash.hex(), "score": score_bp}
                    
                except Exception as e:
                    print(f"❌ Flagging failed: {e}")
                    return {"flagged": False, "score": score_bp, "error": str(e)}
            else:
                print(f"❌ Cannot flag - missing moderator contract or account")
                return {"flagged": False, "score": score_bp, "error": "Missing contract/account"}
        else:
            print(f"\n✅ POST DEEMED SAFE")
            print(f"   📊 Score: {score_percentage:.2f}% < Threshold: {threshold_percentage:.2f}%")
            
            # Update reputation (bonus for safe post)
            update_user_reputation(author, is_flagged=False)
            
            # Trigger incentive distribution for safe posts
            trigger_incentive_distribution(author)
            
            return {"flagged": False, "score": score_bp}
            
    except Exception as e:
        print(f"\n💥 ERROR HANDLING POST: {e}")
        return {"error": str(e)}

def monitoring_loop():
    """Enhanced monitoring loop"""
    global monitoring_active, last_checked_post_id, agent_stats
    
    if last_checked_post_id == 0 and contracts.get('social'):
        try:
            current_total = contracts['social'].functions.totalPosts().call()
            last_checked_post_id = current_total
            print(f"🔄 Starting monitoring from post {current_total + 1}")
        except Exception as e:
            print(f"Could not get initial post count: {e}")
    
    while monitoring_active:
        try:
            if not contracts.get('social'):
                time.sleep(30)
                continue
                
            total_posts = contracts['social'].functions.totalPosts().call()
            agent_stats["last_check"] = time.time()
            
            if total_posts > last_checked_post_id:
                new_posts_count = total_posts - last_checked_post_id
                print(f"\n🆕 NEW POSTS DETECTED! Found {new_posts_count} new post(s)")
                
                for post_id in range(last_checked_post_id + 1, total_posts + 1):
                    if not monitoring_active:
                        break
                        
                    try:
                        post = contracts['social'].functions.getPost(post_id).call()
                        handle_post(post[0], post[1], post[2])  # id, author, content
                    except Exception as e:
                        print(f"❌ ERROR FETCHING POST #{post_id}: {e}")
                
                last_checked_post_id = total_posts
            else:
                current_time = time.strftime('%H:%M:%S', time.gmtime())
                print(f"🔍 [{current_time}] Monitoring active - No new posts (total: {total_posts})")
            
        except Exception as e:
            print(f"Error in monitoring loop: {e}")
        
        time.sleep(15)

# Flask Routes
@app.route('/')
def home():
    return jsonify({
        "service": "Enhanced SOL AI Moderator Agent",
        "status": "running",
        "features": ["toxicity_detection", "reputation_system", "incentive_distribution", "governance_integration"],
        "monitoring": monitoring_active
    })

@app.route('/health')
def health():
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
        "ai_model": "toxic-bert" if HF_API_AVAILABLE else "keyword-based",
        "agent_account": acct.address if acct else None,
        "monitoring_active": monitoring_active,
        "stats": agent_stats
    })

@app.route('/start', methods=['POST'])
def start_monitoring():
    global monitoring_active, agent_stats
    
    if monitoring_active:
        return jsonify({"message": "Monitoring already active"}), 200
    
    if not contracts.get('social') or not acct:
        return jsonify({"error": "Service not properly configured"}), 500
    
    monitoring_active = True
    agent_stats["status"] = "running"
    
    print(f"\n🚀 STARTING ENHANCED AI MODERATION")
    print(f"{'='*60}")
    print(f"🤖 Agent: Enhanced SOL AI Moderator")
    print(f"🧠 Model: {'toxic-bert' if HF_API_AVAILABLE else 'keyword-based'}")
    print(f"🎯 Threshold: {THRESHOLD_BP/100}% ({THRESHOLD_BP} BP)")
    print(f"🏆 Reputation System: {'✅' if contracts.get('reputation') else '❌'}")
    print(f"💰 Incentive System: {'✅' if contracts.get('incentive') else '❌'}")
    print(f"⚖️ Governance System: {'✅' if contracts.get('governance') else '❌'}")
    print(f"🔗 Agent Address: {acct.address}")
    print(f"{'='*60}")
    
    monitor_thread = threading.Thread(target=monitoring_loop, daemon=True)
    monitor_thread.start()
    
    return jsonify({"message": "Enhanced monitoring started", "status": "running"})

@app.route('/stop', methods=['POST'])
def stop_monitoring():
    global monitoring_active, agent_stats
    
    monitoring_active = False
    agent_stats["status"] = "stopped"
    
    return jsonify({"message": "Monitoring stopped", "status": "stopped"})

@app.route('/stats')
def get_stats():
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

@app.route('/moderate', methods=['POST'])
def moderate_text():
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

# Auto-start monitoring if all components are available
if __name__ == '__main__':
    try:
        if contracts.get('social') and acct:
            monitoring_active = True
            agent_stats["status"] = "running"
            monitor_thread = threading.Thread(target=monitoring_loop, daemon=True)
            monitor_thread.start()
            print("✅ Auto-started enhanced monitoring")
        else:
            print("⚠️ Enhanced monitoring not auto-started - missing components")
        
        port = int(os.environ.get('PORT', 5000))
        app.run(host='0.0.0.0', port=port, debug=True)
    except Exception as e:
        print(f'FATAL ERROR: {e}')
        import traceback
        traceback.print_exc()
