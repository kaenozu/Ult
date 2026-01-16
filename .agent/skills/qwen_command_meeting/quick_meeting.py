#!/usr/bin/env python3
"""
Interactive meeting launcher with "議論して" trigger
"""

import sys
import subprocess
from pathlib import Path


def check_qwen_command():
    """Check if qwen command is available."""
    try:
        result = subprocess.run(
            ["qwen", "--version"], capture_output=True, text=True, timeout=5
        )
        return result.returncode == 0
    except:
        return False


def launch_meeting(topic: str):
    """Launch meeting with given topic."""
    script_path = Path(__file__).parent / "scripts" / "qwen_command_meeting.py"

    if not script_path.exists():
        print(f"エラー: 会議スクリプトが見つかりません: {script_path}")
        return False

    try:
        print(f"Qwen会議を開始します: {topic}")
        print("=" * 50)

        # Launch the meeting script
        subprocess.run(
            [
                sys.executable,
                str(script_path),
                "--topic",
                topic,
                "--duration",
                "30",
                "--language",
                "ja",
            ],
            check=False,
        )

        return True

    except KeyboardInterrupt:
        print("\n会議を中断しました。")
        return True
    except Exception as e:
        print(f"エラーが発生しました: {e}")
        return False


def fallback_simulation(topic: str):
    """Fallback simulation mode."""
    print("Qwenコマンドが見つかりません。シミュレーションモードで実行します...")
    print(f"\nトピック: {topic}")
    print(f"Qwen AI: ありがとうございます。「{topic}」について議論を始めましょう。")
    print("どの側面から議論を始めたいですか？")

    # Simple interactive loop
    while True:
        try:
            user_input = input("\nあなたの入力（または 'quit'で終了）: ").strip()

            if user_input.lower() in ["quit", "exit", "終了"]:
                print("Qwen AI: 議論ありがとうございました。良い一日を！")
                break

            print(f"Qwen AI: 「{user_input}」について、興味深い視点ですね。")
            print("さらに詳しく教えていただけますか？")

        except KeyboardInterrupt:
            print("\nQwen AI: 議論を終了します。ありがとうございました。")
            break


def main():
    """Main launcher logic."""
    if len(sys.argv) < 2:
        print('使い方: python quick_meeting.py "議論したいトピック"')
        print('例: python quick_meeting.py "日本の首都について議論"')
        print("\n簡単なトピック例:")
        print("  - 人工知能の未来について")
        print("  - 環境問題の解決策")
        print("  - ワークライフバランス")
        return

    topic = sys.argv[1]

    # Check if qwen command is available
    if check_qwen_command():
        # Launch actual qwen meeting
        success = launch_meeting(topic)
        if not success:
            fallback_simulation(topic)
    else:
        # Use simulation mode
        fallback_simulation(topic)


if __name__ == "__main__":
    main()
