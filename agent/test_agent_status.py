#!/usr/bin/env python3
import requests
import json

try:
    response = requests.get('http://localhost:5000/health')
    data = response.json()
    
    print("🔍 Agent Health Status:")
    print(f"Status: {data.get('status')}")
    print(f"Agent Account: {data.get('agent_account')}")
    print(f"Web3 Connected: {data.get('web3_connected')}")
    print(f"Monitoring Active: {data.get('monitoring_active')}")
    
    print("\n📋 Contract Status:")
    contracts = data.get('contracts', {})
    for name, status in contracts.items():
        print(f"  {name}: {'✅' if status else '❌'}")
    
    print(f"\n🤖 AI Model:")
    print(f"  Type: {data.get('ai_model_type')}")
    print(f"  HF Token Available: {data.get('hf_token_available')}")
    
    print(f"\n📊 Stats:")
    stats = data.get('stats', {})
    for key, value in stats.items():
        print(f"  {key}: {value}")
        
except Exception as e:
    print(f"❌ Error checking agent status: {e}")
