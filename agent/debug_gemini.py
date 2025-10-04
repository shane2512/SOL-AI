#!/usr/bin/env python3
"""
Simple test script for SOL AI agent with new Gemini models
"""

import requests
import json

# Agent URL
AGENT_URL = "https://sol-ai-moderator-agent.onrender.com"

def test_model_list():
    """Test listing available Gemini models"""
    print("🔍 Testing Gemini model availability...")
    try:
        response = requests.get(f"{AGENT_URL}/list-models")
        if response.status_code == 200:
            data = response.json()
            print("✅ Available Gemini models:")
            for model in data.get("available_models", []):
                print(f"   - {model['name']}: {model['display_name']}")
            print(f"\n📍 Current model: {data.get('current_model', 'None')}")
            return data
        else:
            print(f"❌ Failed to list models: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error listing models: {e}")
        return None

def test_health():
    """Test agent health"""
    print("\n🏥 Testing agent health...")
    try:
        response = requests.get(f"{AGENT_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print("✅ Agent health:")
            print(f"   - AI model loaded: {data.get('ai_model_loaded')}")
            print(f"   - AI model type: {data.get('ai_model_type')}")
            print(f"   - Web3 connected: {data.get('web3_connected')}")
            print(f"   - Contracts loaded: {data.get('contracts_loaded')}")
            return data
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return None

def test_gemini_direct():
    """Test Gemini API directly"""
    print("\n🧠 Testing Gemini API directly...")
    test_text = "This is a test message"
    try:
        response = requests.post(f"{AGENT_URL}/test-gemini", json={"text": test_text})
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Gemini test successful:")
            print(f"   - Model: {data.get('model')}")
            print(f"   - Raw response: {data.get('raw_response')}")
            print(f"   - Parsed number: {data.get('parsed_number')}")
            return data
        else:
            print(f"❌ Gemini test failed: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Gemini test error: {e}")
        return None

def test_moderation():
    """Test moderation with toxic content"""
    print("\n🔍 Testing moderation...")
    test_cases = [
        "Hello world",  # Safe
        "You are stupid",  # Toxic
    ]
    
    for text in test_cases:
        print(f"\n📝 Testing: '{text}'")
        try:
            response = requests.post(f"{AGENT_URL}/moderate", json={"text": text})
            if response.status_code == 200:
                data = response.json()
                print(f"   - Toxicity: {data.get('toxicity_percentage')}%")
                print(f"   - Is toxic: {data.get('is_toxic')}")
                print(f"   - Model used: {data.get('model_used')}")
            else:
                print(f"   ❌ Failed: {response.status_code}")
        except Exception as e:
            print(f"   ❌ Error: {e}")

def main():
    """Run simple tests"""
    print("🚀 Testing SOL AI Agent\n")
    
    # Test health
    health_data = test_health()
    if not health_data:
        print("❌ Agent not healthy")
        return
    
    # Test moderation with different content
    test_cases = [
        "Hello world",  # Safe
        "You are stupid and annoying",  # Toxic
    ]
    
    for text in test_cases:
        print(f"\n📝 Testing: '{text}'")
        try:
            response = requests.post(f"{AGENT_URL}/moderate", json={"text": text})
            if response.status_code == 200:
                data = response.json()
                print(f"   - Toxicity: {data.get('toxicity_percentage')}%")
                print(f"   - Is toxic: {data.get('is_toxic')}")
                print(f"   - Models available: {data.get('gemini_models_available')}")
            else:
                print(f"   ❌ Failed: {response.status_code}")
        except Exception as e:
            print(f"   ❌ Error: {e}")
    
    print("\n✅ Tests completed!")

if __name__ == "__main__":
    main()
