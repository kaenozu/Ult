#!/usr/bin/env python3
"""
Browser Test Skill Installation Script

ブラウザテストスキルのインストールとセットアップ
"""

import subprocess
import sys
from pathlib import Path


def install_requirements():
    """必要なライブラリをインストール"""
    print("[INSTALL] Seleniumをインストール中...")
    try:
        subprocess.check_call(
            [
                sys.executable,
                "-m",
                "pip",
                "install",
                "selenium>=4.15.0",
                "selenium-manager>=4.15.0",
            ]
        )
        print("[SUCCESS] Seleniumのインストールが完了しました")
        return True
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] Seleniumのインストールに失敗しました: {e}")
        return False


def check_chrome():
    """Chromeブラウザの存在確認"""
    print("[CHECK] Chromeブラウザを確認中...")
    try:
        import subprocess
        import platform

        if platform.system() == "Windows":
            result = subprocess.run(["where", "chrome"], capture_output=True, text=True)
        elif platform.system() == "Darwin":  # macOS
            result = subprocess.run(
                ["which", "google-chrome"], capture_output=True, text=True
            )
        else:  # Linux
            result = subprocess.run(
                ["which", "google-chrome"], capture_output=True, text=True
            )

        if result.returncode == 0:
            print("[SUCCESS] Chromeブラウザが見つかりました")
            return True
        else:
            print("[WARNING] Chromeブラウザが見つかりません")
            print("  手動でChromeをインストールしてください")
            print("  https://www.google.com/chrome/")
            return False

    except Exception as e:
        print(f"[WARNING] Chrome確認中にエラー: {e}")
        return False


def main():
    """メイン処理"""
    print("🚀 Browser Test Skill セットアップ")
    print("=" * 40)

    # Chrome確認
    chrome_available = check_chrome()

    # Seleniumインストール
    selenium_installed = install_requirements()

    print("\n" + "=" * 40)
    if selenium_installed:
        print("✅ セットアップが完了しました！")
        print("\n使用方法:")
        print("python .agent/skills/browser_test/scripts/test_browser.py")
        print("\nオプション:")
        print("--headless false    : ブラウザを表示")
        print("--screenshots        : スクリーンショット撮影")
        print("--report             : HTMLレポート生成")

        if not chrome_available:
            print("\n⚠️  注意: Chromeブラウザが見つかりませんでした")
            print("   テスト実行前にChromeをインストールしてください")
    else:
        print("❌ セットアップに失敗しました")
        print("   手動でインストールしてください:")
        print("   pip install selenium selenium-manager")


if __name__ == "__main__":
    main()
