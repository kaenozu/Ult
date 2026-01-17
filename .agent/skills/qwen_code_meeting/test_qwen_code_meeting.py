#!/usr/bin/env python3
"""
Test script for Qwen-code Meeting Agent
"""

import os
import sys
import tempfile
from pathlib import Path

# Add scripts directory to path
script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir))


def create_test_files():
    """Create temporary test code files."""
    test_dir = Path("test_files")
    test_dir.mkdir(exist_ok=True)

    # Python test file
    python_code = '''
def calculate_fibonacci(n):
    """Calculate Fibonacci sequence."""
    if n <= 1:
        return n
    return calculate_fibonacci(n-1) + calculate_fibonacci(n-2)

class DataProcessor:
    def __init__(self):
        self.data = []
    
    def add_item(self, item):
        self.data.append(item)
    
    def process_data(self):
        return [x * 2 for x in self.data]
'''

    with open(test_dir / "sample.py", "w", encoding="utf-8") as f:
        f.write(python_code)

    # JavaScript test file
    js_code = """
class UserManager {
    constructor() {
        this.users = [];
        this.adminLevel = 5;
    }
    
    addUser(username, role = 'user') {
        if (!username) return false;
        
        const user = {
            id: Date.now(),
            username: username,
            role: role,
            created: new Date()
        };
        
        this.users.push(user);
        return user;
    }
    
    findUser(username) {
        return this.users.find(u => u.username === username);
    }
    
    removeUser(username) {
        this.users = this.users.filter(u => u.username !== username);
    }
}
"""

    with open(test_dir / "userManager.js", "w", encoding="utf-8") as f:
        f.write(js_code)

    return [str(test_dir / "sample.py"), str(test_dir / "userManager.js")]


def test_basic_functionality():
    """Test basic functionality without API calls."""
    print("🧪 Testing Qwen-code Meeting Agent...")

    try:
        from qwen_code_meeting import (
            CodeMeetingConfig,
            QwenCodeMeetingAgent,
            CodeDiscussion,
        )

        # Test configuration
        config = CodeMeetingConfig(
            topic="Test Code Review",
            code_files=["sample.py"],
            duration_minutes=5,
            language="ja",
            review_mode="code",
        )

        print(f"✅ Configuration created: {config.topic}")
        print(f"✅ Review mode: {config.review_mode}")

        # Test discussion loading
        discussion = CodeDiscussion(config)
        print("✅ Code discussion initialized")

        # Test system prompt generation
        agent = QwenCodeMeetingAgent(config)
        system_prompt = agent._get_system_prompt()
        if len(system_prompt) > 200:
            print("✅ System prompt generated successfully")
        else:
            print("❌ System prompt too short")
            return False

        # Test file loading with actual files
        test_files = create_test_files()
        config_with_files = CodeMeetingConfig(
            topic="Test with Files",
            code_files=test_files,
            duration_minutes=5,
            language="ja",
            review_mode="code",
        )

        discussion_with_files = CodeDiscussion(config_with_files)
        if len(discussion_with_files.files) > 0:
            print(f"✅ Files loaded: {len(discussion_with_files.files)} files")
            for file in discussion_with_files.files:
                print(f"   - {file.path} ({file.language}, {file.size} chars)")
        else:
            print("❌ No files loaded")
            return False

        print("\n🎉 All basic tests passed!")
        return True

    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Test error: {e}")
        return False


def test_api_connection():
    """Test API connection if keys are available."""
    print("\n🔌 Testing API connection...")

    has_api_key = bool(
        os.getenv("QWEN_CODE_API_KEY")
        or os.getenv("QWEN_API_KEY")
        or os.getenv("OPENAI_API_KEY")
    )

    if not has_api_key:
        print("⚠️  Skipping API test (no API keys found)")
        return True

    try:
        from qwen_code_meeting import CodeMeetingConfig, QwenCodeMeetingAgent

        config = CodeMeetingConfig(
            topic="API Test",
            code_files=["test_files/sample.py"],
            duration_minutes=5,
            language="ja",
            review_mode="code",
        )

        agent = QwenCodeMeetingAgent(config)

        if agent.client:
            print("✅ API client initialized")

            # Simple test message
            try:
                test_messages = [
                    {"role": "system", "content": "You are a helpful code reviewer."},
                    {"role": "user", "content": "What is Python?"},
                ]

                response = agent._chat_with_qwen_code(test_messages)

                if response and len(response) > 0:
                    print("✅ API communication successful")
                    print(f"📝 Test response: {response[:100]}...")
                    return True
                else:
                    print("❌ Empty response from API")
                    return False

            except Exception as e:
                print(f"⚠️  API test failed: {e}")
                return False
        else:
            print("❌ API client not initialized")
            return False

    except Exception as e:
        print(f"❌ API test error: {e}")
        return False


def cleanup_test_files():
    """Clean up test files."""
    import shutil

    test_dir = Path("test_files")
    if test_dir.exists():
        shutil.rmtree(test_dir)
        print("🧹 Test files cleaned up")


if __name__ == "__main__":
    print("🚀 Starting Qwen-code Meeting Agent Tests\n")

    # Run tests
    basic_ok = test_basic_functionality()
    api_ok = test_api_connection()

    # Cleanup
    cleanup_test_files()

    if basic_ok and api_ok:
        print("\n✅ All tests completed successfully!")
        print("\n🚀 To run a test code review:")
        print(
            "   python qwen_code_meeting.py --files test_files/sample.py --topic 'Test Review' --duration 5"
        )
        print("\n🔑 Set up API keys for full functionality:")
        print("   export QWEN_CODE_API_KEY='your_api_key'")
    else:
        print("\n❌ Some tests failed")
        sys.exit(1)
