#!/usr/bin/env python3
"""
Test script for Qwen Command Meeting Agent
"""

import os
import sys
import tempfile
from pathlib import Path

# Add scripts directory to path
script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir))


def test_basic_functionality():
    """Test basic functionality without actual qwen command."""
    print("Testing Qwen Command Meeting Agent...")

    try:
        from qwen_command_meeting import (
            QwenCommandConfig,
            QwenCommandMeetingAgent,
            MeetingTranscript,
        )

        # Test configuration
        config = QwenCommandConfig(
            topic="Test Meeting",
            duration_minutes=5,
            language="ja",
            qwen_model="qwen",
            save_transcript=False,
        )

        print("Configuration created successfully")

        # Test transcript functionality
        transcript = MeetingTranscript(config)
        transcript.add_message("user", "Test message", "Test User")
        transcript.add_message("assistant", "Test response", "Qwen AI")

        print("Transcript functionality works")

        # Test system prompt generation
        agent = QwenCommandMeetingAgent(config)
        system_prompt = agent._get_system_prompt()

        if len(system_prompt) > 200:
            print("System prompt generated successfully")
        else:
            print("System prompt too short")
            return False

        print("All basic tests passed!")
        return True

    except ImportError as e:
        print(f"Import error: {e}")
        return False
    except Exception as e:
        print(f"Test error: {e}")
        return False


def test_qwen_command_availability():
    """Test if qwen command is available."""
    print("\nTesting qwen command availability...")

    try:
        import subprocess

        # Try to run qwen --version
        result = subprocess.run(
            ["qwen", "--version"], capture_output=True, text=True, timeout=5
        )

        if result.returncode == 0:
            print(f"Qwen command found: {result.stdout.strip()}")
            return True
        else:
            print("Qwen command not found")
            return False

    except (subprocess.TimeoutExpired, FileNotFoundError) as e:
        print(f"Qwen command not available: {e}")
        return False


def main():
    """Main test function."""
    print("Starting Qwen Command Meeting Agent Tests\n")

    # Run basic tests
    basic_ok = test_basic_functionality()

    # Test qwen command
    qwen_available = test_qwen_command_availability()

    if basic_ok:
        print("\nBasic functionality test: PASSED")
    else:
        print("\nBasic functionality test: FAILED")

    if qwen_available:
        print("Qwen command availability: PASSED")
        print("\nTo run a test meeting:")
        print("  python qwen_command_meeting.py --topic 'Test Meeting' --duration 5")
    else:
        print("Qwen command availability: FAILED")
        print("\nTo install qwen:")
        print("  pip install qwen")

    if basic_ok:
        print(
            "\nCode structure is correct. Install qwen command to enable full functionality."
        )
        return 0
    else:
        print("\nSome tests failed.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
