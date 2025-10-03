import json
import os
import time
import threading
from decimal import Decimal
from pathlib import Path
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
# Lightweight AI API imports
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print("Gemini API not available, using keyword detection")

# Conditional import for transformers (heavy dependency - disabled by default)
TRANSFORMERS_AVAILABLE = False  # Disabled to save memory
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
SOCIAL_ADDR = Web3.to_checksum_address(os.getenv("SOCIAL_POSTS_ADDRESS", "0x0000000000000000000000000000000000000000"))
MODERATOR_ADDR = Web3.to_checksum_address(os.getenv("MODERATOR_ADDRESS", "0x0000000000000000000000000000000000000000"))
AGENT_PRIV = os.getenv("AGENT_PRIVATE_KEY", "")
MODEL_NAME = os.getenv("MODEL_NAME", "gemini-1.5-flash")  # Lightweight Gemini model
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
THRESHOLD_BP = int(os.getenv("TOXICITY_THRESHOLD_BP", "2500"))  # Lowered to 25%

# Global variables for monitoring
monitoring_active = False
last_checked_post_id = 0
agent_stats = {
    "posts_processed": 0,
    "posts_flagged": 0,
    "last_check": None,
    "status": "stopped"
}

# Read ABIs from contracts/abis
REPO_ROOT = Path(__file__).resolve().parents[1]
ABI_DIR = REPO_ROOT / "app" / "contracts" / "abis"

try:
    with open(ABI_DIR / "SocialPosts.json", "r", encoding="utf-8") as f:
        SOCIAL_ABI = json.load(f)
    with open(ABI_DIR / "Moderator.json", "r", encoding="utf-8") as f:
        MOD_ABI = json.load(f)
except Exception as e:
    print(f"Warning: Could not load ABIs: {e}")
    SOCIAL_ABI = []
    MOD_ABI = []

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
social = None
moderator = None
if w3 and SOCIAL_ABI and MOD_ABI:
    try:
        social = w3.eth.contract(address=SOCIAL_ADDR, abi=SOCIAL_ABI)
        moderator = w3.eth.contract(address=MODERATOR_ADDR, abi=MOD_ABI)
        print("Contracts initialized successfully")
    except Exception as e:
        print(f"Warning: Could not initialize contracts: {e}")

# Initialize Gemini AI model (lightweight API-based)
gemini_model = None
if GEMINI_AVAILABLE and GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        gemini_model = genai.GenerativeModel(MODEL_NAME)
        print(f"Gemini AI model initialized: {MODEL_NAME}")
    except Exception as e:
        print(f"Warning: Could not initialize Gemini model: {e}")
        print("Falling back to keyword-based detection")
else:
    if not GEMINI_API_KEY:
        print("GEMINI_API_KEY not provided, using keyword-based detection")
    else:
        print("Gemini not available, using keyword-based detection")

def score_toxicity(text: str) -> int:
    """Score toxicity of text, return basis points (0-10000)"""
    
    # Try Gemini API first (lightweight and accurate)
    if gemini_model:
        try:
            prompt = f"""
Analyze the toxicity level of this text: "{text}"

Rate the toxicity on a scale of 0-100 where:
- 0-20: Clean/Safe content
- 21-40: Mildly inappropriate 
- 41-60: Moderately toxic
- 61-80: Highly toxic
- 81-100: Extremely toxic/harmful

Consider factors like:
- Profanity and offensive language
- Hate speech or discrimination
- Violence or threats
- Harassment or bullying

Respond with ONLY a number between 0-100, nothing else.
"""
            
            response = gemini_model.generate_content(prompt)
            toxicity_percentage = int(response.text.strip())
            
            # Convert to basis points (0-10000)
            toxicity_bp = min(max(toxicity_percentage * 100, 0), 10000)
            
            print(f"Gemini toxicity analysis: {toxicity_percentage}% ({toxicity_bp} BP)")
            return toxicity_bp
            
        except Exception as e:
            print(f"Gemini API error: {e}, falling back to keyword detection")
    
    # Fallback to keyword-based detection
    if True:
        # Enhanced keyword-based detection
        toxic_keywords = {
            'high': ['kill', 'die', 'murder', 'suicide', 'terrorist', 'bomb', 'weapon', 'fuck'],
            'medium': ['hate', 'stupid', 'idiot', 'moron', 'loser', 'pathetic', 'disgusting', 'bastard', 'bloody'],
            'low': ['damn', 'hell', 'crap', 'sucks', 'annoying', 'boring']
        }
        
        lower_text = text.lower()
        score = 500  # Base score (5%)
        
        # Check for high toxicity keywords
        for keyword in toxic_keywords['high']:
            if keyword in lower_text:
                score += 2500  # Add 25% per high-toxicity word
        
        # Check for medium toxicity keywords  
        for keyword in toxic_keywords['medium']:
            if keyword in lower_text:
                score += 1500  # Add 15% per medium-toxicity word
                
        # Check for low toxicity keywords
        for keyword in toxic_keywords['low']:
            if keyword in lower_text:
                score += 800   # Add 8% per low-toxicity word
        
        # Cap at 9500 (95%)
        return min(score, 9500)
    
    try:
        res = clf(text)[0]
        score_bp = int(Decimal(res.get("score", 0)) * 10000)
        return score_bp
    except Exception as e:
        print(f"Error in toxicity scoring: {e}")
        return 1000  # Default to 10%

def handle_post(post_id, author, content):
    """Handle a single post for moderation"""
    global agent_stats
    
    try:
        score_bp = score_toxicity(content)
        agent_stats["posts_processed"] += 1
        
        print(f"Post {post_id}: toxicity={score_bp}bp, threshold={THRESHOLD_BP}bp")
        
        if score_bp >= THRESHOLD_BP and moderator and acct:
            # Flag the post
            gas_estimate = moderator.functions.flagPost(post_id, score_bp, MODEL_NAME).estimate_gas({'from': acct.address})
            tx = moderator.functions.flagPost(post_id, score_bp, MODEL_NAME).build_transaction({
                "from": acct.address,
                "nonce": w3.eth.get_transaction_count(acct.address),
                "chainId": CHAIN_ID or w3.eth.chain_id,
                "gas": int(gas_estimate * 1.2),
                "gasPrice": w3.to_wei("100", "gwei"),
            })
            signed = acct.sign_transaction(tx)
            tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
            receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
            
            agent_stats["posts_flagged"] += 1
            print(f"Post {post_id} flagged! Tx: {tx_hash.hex()}")
            return {"flagged": True, "tx_hash": tx_hash.hex(), "score": score_bp}
        else:
            print(f"Post {post_id} deemed safe")
            return {"flagged": False, "score": score_bp}
            
    except Exception as e:
        print(f"Error handling post {post_id}: {e}")
        return {"error": str(e)}

def monitoring_loop():
    """Background monitoring loop"""
    global monitoring_active, last_checked_post_id, agent_stats
    
    while monitoring_active:
        try:
            if not social:
                time.sleep(30)
                continue
                
            total_posts = social.functions.totalPosts().call()
            agent_stats["last_check"] = time.time()
            
            if total_posts > last_checked_post_id:
                print(f"Found {total_posts - last_checked_post_id} new posts")
                
                for post_id in range(last_checked_post_id + 1, total_posts + 1):
                    if not monitoring_active:
                        break
                        
                    try:
                        post = social.functions.getPost(post_id).call()
                        handle_post(post[0], post[1], post[2])  # id, author, content
                    except Exception as e:
                        print(f"Error processing post {post_id}: {e}")
                
                last_checked_post_id = total_posts
            
        except Exception as e:
            print(f"Error in monitoring loop: {e}")
        
        time.sleep(15)  # Check every 15 seconds

# Flask Routes
@app.route('/')
def home():
    """Health check endpoint"""
    return jsonify({
        "service": "SOL AI Moderator Agent",
        "status": "running",
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
        "contracts_loaded": social is not None and moderator is not None,
        "ai_model_loaded": gemini_model is not None,
        "ai_model_type": "gemini" if gemini_model else "keyword-based",
        "agent_account": acct.address if acct else None,
        "monitoring_active": monitoring_active,
        "stats": agent_stats
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
    return jsonify(agent_stats)

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
        "threshold_bp": THRESHOLD_BP
    })

if __name__ == '__main__':
    # Auto-start monitoring if all components are available
    if all([w3, social, moderator, acct]):
        monitoring_active = True
        agent_stats["status"] = "running"
        monitor_thread = threading.Thread(target=monitoring_loop, daemon=True)
        monitor_thread.start()
        print("Auto-started monitoring")
    else:
        print("Warning: Not all components available, monitoring not auto-started")
        print(f"Components status: w3={w3 is not None}, social={social is not None}, moderator={moderator is not None}, acct={acct is not None}")
    
    # Run Flask app
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
