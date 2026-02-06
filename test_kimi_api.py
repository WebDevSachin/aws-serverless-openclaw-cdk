#!/usr/bin/env python3
"""
Test script to validate Kimi API connection.
Reads KIMI_API_KEY from .env file and tests the connection.
"""

import os
import sys
from dotenv import load_dotenv

try:
    from openai import OpenAI
except ImportError:
    print("❌ Error: 'openai' package not found.")
    print("   Install it with: pip install openai")
    sys.exit(1)

def test_kimi_api():
    """Test Kimi API connection - tries both Moonshot AI API and Kimi K2 API."""
    
    # Load environment variables from .env
    load_dotenv()
    
    # Get API key from environment
    api_key = os.getenv("KIMI_API_KEY")
    
    if not api_key:
        print("❌ Error: KIMI_API_KEY not found in .env file")
        print("   Make sure your .env file contains: KIMI_API_KEY=your-key-here")
        return False
    
    print(f"✓ Found API key: {api_key[:20]}...{api_key[-10:]}")
    
    # Determine which API to try based on key format
    apis_to_try = []
    if api_key.startswith("sk-kimi-"):
        print("\n🔍 API key format suggests Kimi K2 API")
        apis_to_try = [
            ("Kimi K2 API", "https://kimi-k2.ai/api/v1", "kimi-k2-0905"),
            ("Moonshot AI API", "https://api.moonshot.ai/v1", "kimi-k2-0711-preview"),
        ]
    else:
        print("\n🔍 API key format suggests Moonshot AI API")
        apis_to_try = [
            ("Moonshot AI API", "https://api.moonshot.ai/v1", "kimi-k2-0711-preview"),
            ("Kimi K2 API", "https://kimi-k2.ai/api/v1", "kimi-k2-0905"),
        ]
    
    for api_name, base_url, model in apis_to_try:
        print(f"\n🔌 Testing connection to {api_name}...")
        print(f"   Endpoint: {base_url}")
        print(f"   Model: {model}")
        
        try:
            # Initialize OpenAI client
            client = OpenAI(
                api_key=api_key,
                base_url=base_url
            )
            
            # Test with a simple request
            print("📤 Sending test request...")
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You are Kimi, a helpful AI assistant."},
                    {"role": "user", "content": "Say 'Hello, API connection successful!' if you can read this."}
                ],
                temperature=0.6,
                max_tokens=50
            )
            
            # Extract response
            message_content = response.choices[0].message.content
            usage = response.usage
            
            print(f"\n✅ API Connection Successful with {api_name}!")
            print(f"\n📝 Response: {message_content}")
            print(f"\n📊 Token Usage:")
            print(f"   - Prompt tokens: {usage.prompt_tokens}")
            print(f"   - Completion tokens: {usage.completion_tokens}")
            print(f"   - Total tokens: {usage.total_tokens}")
            
            return True
            
        except Exception as e:
            print(f"   ❌ Failed: {str(e)}")
            continue
    
    # If we get here, all APIs failed
    print(f"\n❌ All API endpoints failed!")
    print(f"\n💡 Tips:")
    print(f"   - Verify your API key is correct and active")
    print(f"   - Check if your API key has sufficient credits/quota")
    print(f"   - For Moonshot API: https://platform.moonshot.ai/")
    print(f"   - For Kimi K2 API: https://kimi-k2.ai/")
    
    return False

if __name__ == "__main__":
    print("=" * 60)
    print("Kimi API Connection Test")
    print("=" * 60)
    print()
    
    success = test_kimi_api()
    
    print("\n" + "=" * 60)
    if success:
        print("✅ Test completed successfully!")
        sys.exit(0)
    else:
        print("❌ Test failed. Please check the errors above.")
        sys.exit(1)
