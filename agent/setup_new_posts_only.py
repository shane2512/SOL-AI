#!/usr/bin/env python3
"""
Setup agent to only process NEW posts (skip existing flagged posts)
"""

import requests
import json

# Agent URL
AGENT_URL = "https://sol-ai-moderator-agent.onrender.com"

def setup_agent():
    """Setup agent to skip existing posts and only process new ones"""
    print("🔧 Setting up agent to process only NEW posts\n")
    
    # Step 1: Check current stats
    print("1️⃣ Checking current agent status...")
    try:
        response = requests.get(f"{AGENT_URL}/stats")
        if response.status_code == 200:
            stats = response.json()
            print(f"   - Last checked post: {stats.get('last_checked_post_id', 0)}")
            print(f"   - Posts processed: {stats.get('posts_processed', 0)}")
            print(f"   - Posts flagged: {stats.get('posts_flagged', 0)}")
            print(f"   - Cache size: {stats.get('flagged_posts_cache_size', 0)}")
        else:
            print(f"   ❌ Failed to get stats: {response.status_code}")
            return
    except Exception as e:
        print(f"   ❌ Error getting stats: {e}")
        return
    
    # Step 2: Reset cache
    print("\n2️⃣ Clearing flagged posts cache...")
    try:
        response = requests.post(f"{AGENT_URL}/reset-cache")
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ {result['message']}")
        else:
            print(f"   ❌ Failed to reset cache: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error resetting cache: {e}")
    
    # Step 3: Set last post to current total
    print("\n3️⃣ Setting last checked post to current total...")
    try:
        response = requests.post(f"{AGENT_URL}/set-last-post")
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ {result['message']}")
        else:
            print(f"   ❌ Failed to set last post: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error setting last post: {e}")
    
    # Step 4: Verify setup
    print("\n4️⃣ Verifying setup...")
    try:
        response = requests.get(f"{AGENT_URL}/stats")
        if response.status_code == 200:
            stats = response.json()
            print(f"   ✅ Agent now monitoring from post {stats.get('last_checked_post_id', 0) + 1}")
            print(f"   ✅ Cache cleared (size: {stats.get('flagged_posts_cache_size', 0)})")
        else:
            print(f"   ❌ Failed to verify: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error verifying: {e}")
    
    print("\n🎉 Setup complete!")
    print("\n📝 What happens now:")
    print("   - Agent will SKIP all existing posts")
    print("   - Agent will ONLY process NEW posts created from now on")
    print("   - Create a new post to test the flagging system")
    print("   - Agent will analyze and flag toxic content automatically")

if __name__ == "__main__":
    setup_agent()
