#!/usr/bin/env python3
"""
Test script for SOL AI moderation agent
Tests the Gemini 1.5 Flash integration and flagging functionality
"""

import requests
import json
import time

# Agent URL (update this to your deployed URL)
AGENT_URL = "http://localhost:5000"  # Change to your Render URL when testing deployed version

def test_health():
    """Test agent health endpoint"""
    print("🔍 Testing agent health...")
    try:
        response = requests.get(f"{AGENT_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print("✅ Agent is healthy!")
            print(f"   - Web3 connected: {data.get('web3_connected')}")
            print(f"   - Contracts loaded: {data.get('contracts_loaded')}")
            print(f"   - AI model loaded: {data.get('ai_model_loaded')}")
            print(f"   - AI model type: {data.get('ai_model_type')}")
            print(f"   - Agent address: {data.get('agent_account')}")
            print(f"   - Monitoring active: {data.get('monitoring_active')}")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def test_gemini_direct(text):
    """Test Gemini API directly"""
    print(f"\n🧠 Testing Gemini API with: '{text}'")
    try:
        response = requests.post(f"{AGENT_URL}/test-gemini", json={"text": text})
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Gemini response: {data.get('raw_response')}")
            print(f"   - Parsed number: {data.get('parsed_number')}")
            print(f"   - Success: {data.get('success')}")
            return data
        else:
            print(f"❌ Gemini test failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Gemini test error: {e}")
        return None

def test_moderation(text):
    """Test moderation endpoint"""
    print(f"\n🔍 Testing moderation with: '{text}'")
    try:
        response = requests.post(f"{AGENT_URL}/moderate", json={"text": text})
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Moderation result:")
            print(f"   - Toxicity score: {data.get('toxicity_score_bp')} BP ({data.get('toxicity_percentage')}%)")
            print(f"   - Is toxic: {data.get('is_toxic')}")
            print(f"   - Threshold: {data.get('threshold_bp')} BP")
            print(f"   - Model used: {data.get('model_used')}")
            print(f"   - Gemini available: {data.get('gemini_available')}")
            return data
        else:
            print(f"❌ Moderation test failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Moderation test error: {e}")
        return None

def main():
    """Run all tests"""
    print("🚀 Starting SOL AI Moderation Tests\n")
    
    # Test health first
    if not test_health():
        print("❌ Agent is not healthy, stopping tests")
        return
    
    # Test cases - from safe to toxic
    test_cases = [
        "Hello, this is a nice day!",  # Safe content
        "This is boring content",      # Mildly inappropriate 
        "You are stupid and annoying", # Moderately toxic
        "I hate you, you fucking idiot", # Highly toxic
        "Kill yourself, you worthless piece of shit", # Extremely toxic
    ]
    
    print(f"\n📝 Testing {len(test_cases)} different content types...\n")
    
    for i, text in enumerate(test_cases, 1):
        print(f"--- Test Case {i}/{len(test_cases)} ---")
        
        # Test Gemini directly first
        gemini_result = test_gemini_direct(text)
        
        # Test full moderation pipeline
        mod_result = test_moderation(text)
        
        if gemini_result and mod_result:
            gemini_score = int(gemini_result.get('parsed_number', 0)) if gemini_result.get('parsed_number') else 0
            mod_score = mod_result.get('toxicity_percentage', 0)
            print(f"📊 Score comparison: Gemini={gemini_score}%, Moderation={mod_score}%")
        
        print()  # Add spacing between tests
        time.sleep(1)  # Be nice to the API
    
    print("🎉 All tests completed!")

if __name__ == "__main__":
    main()
