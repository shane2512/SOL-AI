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

print('=== AGENT STARTUP BEGIN ===')
print(f'ENV: SOMNIA_RPC_URL={os.getenv("SOMNIA_RPC_URL")}')
print(f'ENV: SOCIAL_POSTS_ADDRESS={os.getenv("SOCIAL_POSTS_ADDRESS")}')
print(f'ENV: MODERATOR_ADDRESS={os.getenv("MODERATOR_ADDRESS")}')
agent_key = os.getenv("AGENT_PRIVATE_KEY")
print(f'ENV: AGENT_PRIVATE_KEY={agent_key[:8] + "..." if agent_key else "None"}')
hf_token = os.getenv("HF_TOKEN")
print(f'ENV: HF_TOKEN={hf_token[:8] + "..." if hf_token else "None"}')
print('=== AGENT STARTUP END ===')

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
SOCIAL_ADDR = Web3.to_checksum_address(os.getenv("SOCIAL_POSTS_ADDRESS", "0x0000000000000000000000000000000000000000"))
MODERATOR_ADDR = Web3.to_checksum_address(os.getenv("MODERATOR_ADDRESS", "0x0000000000000000000000000000000000000000"))
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

def handle_post(post_id, author, content):
    """Handle a single post for moderation"""
    global agent_stats
    
    try:
        score_bp = score_toxicity(content)
        agent_stats["posts_processed"] += 1
        
        print(f"Post {post_id}: toxicity={score_bp}bp, threshold={THRESHOLD_BP}bp")
        
        if score_bp >= THRESHOLD_BP:
            print(f"🚨 TOXIC CONTENT DETECTED! Post {post_id} scored {score_bp}bp (threshold: {THRESHOLD_BP}bp)")
            print(f"Content: '{content[:100]}...'")
            
            if moderator and acct:
                # Check if we've already flagged this post in our session
                if post_id in flagged_posts_cache:
                    print(f"⚠️ Post {post_id} already flagged by this agent, skipping")
                    return {"flagged": False, "score": score_bp, "already_flagged": True}
                
                # Skip on-chain flagged check since contract ABI doesn't have isPostFlagged
                # We'll rely on our cache and handle "already flagged" errors gracefully
                
                # Flag the post
                try:
                    print(f"🏴 Flagging post {post_id} with toxicity {score_bp}bp")
                    
                    # Use appropriate model name
                    model_name_for_tx = "toxic-bert" if HF_API_AVAILABLE else "keyword-based"
                    
                    gas_estimate = moderator.functions.flagPost(post_id, score_bp, model_name_for_tx).estimate_gas({'from': acct.address})
                    
                    tx = moderator.functions.flagPost(post_id, score_bp, model_name_for_tx).build_transaction({
                        "from": acct.address,
                        "nonce": w3.eth.get_transaction_count(acct.address),
                        "chainId": CHAIN_ID or w3.eth.chain_id,
                        "gas": int(gas_estimate * 1.2),
                        "gasPrice": w3.to_wei("10", "gwei"),
                    })
                    
                    signed = acct.sign_transaction(tx)
                    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
                    
                    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
                    
                    # Add to our cache and update stats
                    flagged_posts_cache.add(post_id)
                    agent_stats["posts_flagged"] += 1
                    print(f"✅ Post {post_id} flagged! Tx: {tx_hash.hex()}")
                    return {"flagged": True, "tx_hash": tx_hash.hex(), "score": score_bp}
                    
                except Exception as flag_error:
                    error_msg = str(flag_error).lower()
                    if "already flagged" in error_msg:
                        print(f"⚠️ Post {post_id} already flagged (contract error)")
                        flagged_posts_cache.add(post_id)  # Add to cache to prevent future attempts
                        return {"flagged": False, "score": score_bp, "already_flagged": True}
                    else:
                        print(f"❌ Flagging failed for post {post_id}: {flag_error}")
                        return {"flagged": False, "score": score_bp, "error": str(flag_error)}
            else:
                print(f"⚠️ Cannot flag - missing moderator contract or account")
                return {"flagged": False, "score": score_bp, "error": "Missing contract/account"}
        else:
            print(f"Post {post_id} deemed safe")
            return {"flagged": False, "score": score_bp}
            
    except Exception as e:
        print(f"Error handling post {post_id}: {e}")
        return {"error": str(e)}

def monitoring_loop():
    """Background monitoring loop"""
    global monitoring_active, last_checked_post_id, agent_stats
    
    # Initialize last_checked_post_id to current total on first run
    if last_checked_post_id == 0 and social:
        try:
            current_total = social.functions.totalPosts().call()
            last_checked_post_id = current_total
            print(f"🔄 Starting monitoring from post {current_total + 1} (skipping existing {current_total} posts)")
        except Exception as e:
            print(f"Could not get initial post count: {e}")
    
    while monitoring_active:
        try:
            if not social:
                time.sleep(30)
                continue
                
            total_posts = social.functions.totalPosts().call()
            agent_stats["last_check"] = time.time()
            
            if total_posts > last_checked_post_id:
                new_posts_count = total_posts - last_checked_post_id
                print(f"🆕 Found {new_posts_count} new posts (processing {last_checked_post_id + 1} to {total_posts})")
                
                for post_id in range(last_checked_post_id + 1, total_posts + 1):
                    if not monitoring_active:
                        break
                        
                    try:
                        post = social.functions.getPost(post_id).call()
                        print(f"📝 Processing NEW post {post_id}")
                        handle_post(post[0], post[1], post[2])  # id, author, content
                    except Exception as e:
                        print(f"Error processing post {post_id}: {e}")
                
                last_checked_post_id = total_posts
            else:
                # No new posts, just update last check time
                pass
            
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
        "ai_model_loaded": len(gemini_models) > 0,
        "ai_model_type": "gemini" if gemini_models else "keyword-based",
        "gemini_models_count": len(gemini_models),
        "available_models": [m["name"] for m in gemini_models],
        "agent_account": acct.address if acct else None,
        "monitoring_active": monitoring_active,
        "stats": agent_stats
    })

@app.route('/diagnostics')
def diagnostics():
    """Return all key config/env values for debugging"""
    return jsonify({
        "SOMNIA_RPC_URL": os.getenv("SOMNIA_RPC_URL"),
        "SOCIAL_POSTS_ADDRESS": os.getenv("SOCIAL_POSTS_ADDRESS"),
        "MODERATOR_ADDRESS": os.getenv("MODERATOR_ADDRESS"),
        "AGENT_PRIVATE_KEY": os.getenv("AGENT_PRIVATE_KEY")[:8] + "...",
        "MODEL_NAME": os.getenv("MODEL_NAME"),
        "GEMINI_API_KEY": os.getenv("GEMINI_API_KEY")[:8] + "...",
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
        "flagged_posts_cache_size": len(flagged_posts_cache)
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
        "model_used": "gemini-ai" if gemini_models else "keyword-based",
        "gemini_models_available": len(gemini_models),
        "available_models": [m["name"] for m in gemini_models]
    })

@app.route('/test-gemini', methods=['POST'])
def test_gemini():
    """Test Gemini API directly"""
    data = request.get_json()
    if not data or 'text' not in data:
        return jsonify({"error": "Missing 'text' field"}), 400
    
    text = data['text']
    
    if not gemini_model:
        return jsonify({
            "error": "Gemini model not available",
            "gemini_available": GEMINI_AVAILABLE,
            "api_key_provided": bool(GEMINI_API_KEY)
        }), 400
    
    try:
        prompt = f"""
You are a content moderation AI. Analyze this text for toxicity: "{text}"

Rate toxicity from 0-100:
• 0-25: Safe/Clean content
• 26-50: Mildly inappropriate
• 51-75: Moderately toxic
• 76-100: Highly toxic/harmful

Consider:
- Profanity, offensive language
- Hate speech, discrimination
- Violence, threats
- Harassment, bullying
- Sexual content
- Spam or misleading content

Respond with ONLY the number (0-100). No explanation.
"""
        
        response = gemini_model.generate_content(prompt)
        response_text = response.text.strip()
        
        # Extract number from response
        import re
        number_match = re.search(r'\b(\d{1,3})\b', response_text)
        
        return jsonify({
            "text": text,
            "raw_response": response_text,
            "parsed_number": number_match.group(1) if number_match else None,
            "success": number_match is not None,
            "model": str(gemini_model._model_name) if hasattr(gemini_model, '_model_name') else "unknown"
        })
        
    except Exception as e:
        return jsonify({
            "error": str(e),
            "error_type": type(e).__name__,
            "text": text
        }), 500

@app.route('/list-models')
def list_gemini_models():
    """List available Gemini models"""
    if not GEMINI_AVAILABLE or not GEMINI_API_KEY:
        return jsonify({
            "error": "Gemini not available",
            "gemini_available": GEMINI_AVAILABLE,
            "api_key_provided": bool(GEMINI_API_KEY)
        }), 400
    
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        models = []
        for model in genai.list_models():
            if 'generateContent' in model.supported_generation_methods:
                models.append({
                    "name": model.name,
                    "display_name": model.display_name,
                    "description": model.description
                })
        
        return jsonify({
            "available_models": models,
            "current_model": str(gemini_model._model_name) if gemini_model and hasattr(gemini_model, '_model_name') else None
        })
        
    except Exception as e:
        return jsonify({
            "error": str(e),
            "error_type": type(e).__name__
        }), 500

# --- Monitoring thread startup for all environments (including WSGI/Gunicorn) ---
# Use a process-wide flag to avoid duplicate threads
_monitoring_started = False
try:
    if not _monitoring_started:
        print('=== AGENT UNIVERSAL STARTUP ===')
        print(f'w3: {w3}')
        print(f'social: {social}')
        print(f'moderator: {moderator}')
        print(f'acct: {acct}')
        print(f'Contracts loaded: {social is not None and moderator is not None}')
        print(f'Agent address: {acct.address if acct else None}')
        if all([w3, social, moderator, acct]):
            monitoring_active = True
            agent_stats["status"] = "running"
            monitor_thread = threading.Thread(target=monitoring_loop, daemon=True)
            monitor_thread.start()
            print("Auto-started monitoring (universal)")
        else:
            print("Warning: Not all components available, monitoring not auto-started (universal)")
            print(f"Components status: w3={w3 is not None}, social={social is not None}, moderator={moderator is not None}, acct={acct is not None}")
        _monitoring_started = True
except Exception as e:
    print(f'FATAL ERROR in universal monitoring startup: {e}')
    import traceback
    traceback.print_exc()

if __name__ == '__main__':
    try:
        print('=== AGENT MAIN ENTRY ===')
        print(f'w3: {w3}')
        print(f'social: {social}')
        print(f'moderator: {moderator}')
        print(f'acct: {acct}')
        print(f'Contracts loaded: {social is not None and moderator is not None}')
        print(f'Agent address: {acct.address if acct else None}')
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
        
        # Run Flask app in debug mode for troubleshooting
        port = int(os.environ.get('PORT', 5000))
        app.run(host='0.0.0.0', port=port, debug=True)
    except Exception as main_exc:
        print(f'FATAL ERROR in __main__: {main_exc}')
        import traceback
        traceback.print_exc()
