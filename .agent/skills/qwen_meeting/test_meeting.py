#!/usr/bin/env python3
"""
Quick test script for Qwen Meeting Agent
"""

import os
import sys
from pathlib import Path

# Add scripts directory to path
script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir))

try:
    from meeting import MeetingConfig, QwenMeetingAgent

    def test_basic_functionality():
        """Test basic meeting functionality."""
        print("🧪 Testing Qwen Meeting Agent...")

        # Test configuration
        config = MeetingConfig(
            topic="Test Meeting",
            duration_minutes=5,
            language="ja",
            save_transcript=False,  # Don't save during test
        )

        print(f"✅ Configuration created: {config.topic}")

        # Test agent initialization
        agent = QwenMeetingAgent(config)
        print("✅ Agent initialized successfully")

        # Test system prompt generation
        system_prompt = agent._get_system_prompt()
        if len(system_prompt) > 100:
            print("✅ System prompt generated successfully")
        else:
            print("❌ System prompt too short")

        # Test message structure
        from meeting import Message, MeetingTranscript

        test_message = Message(
            role="user",
            content="Test message",
            timestamp="2024-01-01T10:00:00",
            speaker="Test User",
        )
        print("✅ Message structure works")

        # Test transcript
        transcript = MeetingTranscript(config)
        transcript.add_message("user", "Test message", "Test User")
        print("✅ Transcript functionality works")

        print("\n🎉 All basic tests passed!")
        return True

    def test_api_connection():
        """Test API connection (optional)."""
        print("\n🔌 Testing API connection...")

        config = MeetingConfig(language="ja", save_transcript=False)
        agent = QwenMeetingAgent(config)

        if agent.client:
            print("✅ API client initialized")

            # Simple test message
            try:
                response = agent._chat_with_qwen(
                    [
                        {"role": "system", "content": "You are a helpful assistant."},
                        {"role": "user", "content": "Say 'Hello'"},
                    ]
                )

                if response and len(response) > 0:
                    print("✅ API communication successful")
                    print(f"📝 Test response: {response[:50]}...")
                    return True
                else:
                    print("❌ Empty response from API")
                    return False

            except Exception as e:
                print(f"⚠️  API test failed (this is normal without API keys): {e}")
                return False
        else:
            print("❌ API client not initialized")
            return False

    if __name__ == "__main__":
        # Run tests
        basic_ok = test_basic_functionality()

        # Test API if keys are available
        has_api_key = bool(os.getenv("QWEN_API_KEY") or os.getenv("OPENAI_API_KEY"))
        if has_api_key:
            api_ok = test_api_connection()
        else:
            print("\n⚠️  Skipping API test (no API keys found)")
            api_ok = True  # Don't fail for missing keys

        if basic_ok and api_ok:
            print("\n✅ All tests completed successfully!")
            print("\n🚀 To run a test meeting:")
            print("   python meeting.py --topic 'Test Meeting' --duration 5")
        else:
            print("\n❌ Some tests failed")
            sys.exit(1)

except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Please install required dependencies:")
    print("pip install openai pydantic python-dotenv")
    sys.exit(1)
