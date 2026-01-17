#!/usr/bin/env python3
"""
Simple quick launcher for Qwen meeting
"""

import sys
import subprocess
from pathlib import Path


def main():
    """Quick meeting launcher."""
    if len(sys.argv) < 2:
        print('使い方: python simple_meeting.py "議論したいトピック"')
        return

    topic = sys.argv[1]

    print(f"トピック: {topic}")
    print("=" * 40)

    # Check if qwen command exists
    try:
        result = subprocess.run(
            ["qwen", "--version"], capture_output=True, text=True, timeout=3
        )
        qwen_available = result.returncode == 0
    except:
        qwen_available = False

    if qwen_available:
        print("Qwen AIが利用可能です。会議を開始します...")
        script_path = Path(__file__).parent / "scripts" / "qwen_command_meeting.py"

        if script_path.exists():
            subprocess.run(
                [
                    sys.executable,
                    str(script_path),
                    "--topic",
                    topic,
                    "--duration",
                    "15",
                    "--language",
                    "ja",
                ]
            )
        else:
            print("会議スクリプトが見つかりません")
    else:
        print("Qwenコマンドが見つかりません。")
        print("インストール: pip install qwen")

        # Simple simulation
        print(f"\nQwen AI: {topic}についてですね。")
        print("重要な議論です。どの点から議論を始めたいですか？")

        # Quick demo
        print(f"\nUser: {topic}の現状について")
        print("Qwen AI: 興味深い視点ですね。このテーマについて...")
        print("社会的影響、技術的側面、倫理的考察など多角的に議論できます。")


if __name__ == "__main__":
    main()
