#!/usr/bin/env python3
import requests
import json

def test_rpc():
    """Test the Somnia RPC endpoint"""
    url = "https://dream-rpc.somnia.network"
    
    # Test basic connectivity
    payload = {
        "jsonrpc": "2.0",
        "method": "eth_chainId",
        "params": [],
        "id": 1
    }
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        print(f"🌐 RPC Response: {response.status_code}")
        print(f"📋 Chain ID: {response.json()}")
        
        # Test contract call
        contract_payload = {
            "jsonrpc": "2.0",
            "method": "eth_call",
            "params": [
                {
                    "to": "0xf88B9e01A9B350E05cD8971DdDF7fC2c73910352",
                    "data": "0x2e52d606"  # totalPosts() function selector
                },
                "latest"
            ],
            "id": 2
        }
        
        contract_response = requests.post(url, json=contract_payload, timeout=10)
        print(f"📄 Contract Response: {contract_response.status_code}")
        result = contract_response.json()
        print(f"📊 Contract Result: {result}")
        
        if 'result' in result:
            # Convert hex to decimal
            total_posts = int(result['result'], 16)
            print(f"📝 Total Posts: {total_posts}")
            
            if total_posts > 0:
                # Get first post
                post_payload = {
                    "jsonrpc": "2.0",
                    "method": "eth_call",
                    "params": [
                        {
                            "to": "0xf88B9e01A9B350E05cD8971DdDF7fC2c73910352",
                            "data": "0x01e33667" + "0000000000000000000000000000000000000000000000000000000000000001"  # getPost(1)
                        },
                        "latest"
                    ],
                    "id": 3
                }
                
                post_response = requests.post(url, json=post_payload, timeout=10)
                print(f"📖 Post Response: {post_response.json()}")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_rpc()
