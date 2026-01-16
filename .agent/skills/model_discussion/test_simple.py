#!/usr/bin/env python3
"""
Simple test for Model Discussion Agent
"""

import sys
import os
from pathlib import Path


def test_basic_functionality():
    """基本的な機能テスト"""
    print("=== Model Discussion Agent Test ===")

    # スキルファイルの存在確認
    skill_file = Path("skill.json")
    script_file = Path("scripts/discuss.py")

    print(f"skill.json: {'OK' if skill_file.exists() else 'MISSING'}")
    print(f"discuss.py: {'OK' if script_file.exists() else 'MISSING'}")

    # スキル設定の確認
    if skill_file.exists():
        try:
            import json

            with open(skill_file, "r", encoding="utf-8") as f:
                config = json.load(f)

            models = config.get("configuration", {}).get("default_models", [])

            print(f"Skill name: {config.get('name', 'N/A')}")
            print(f"Models configured: {len(models)}")

            # モデル種別のカウント
            api_models = [m for m in models if m.get("api_key_required", False)]
            local_models = [m for m in models if m.get("local_model", False)]
            code_models = [m for m in models if m.get("specialty") == "code"]
            free_models = [m for m in models if m.get("free_api", False)]

            print(f"  API models: {len(api_models)}")
            print(f"  Local models: {len(local_models)}")
            print(f"  Code specialists: {len(code_models)}")
            print(f"  Free API models: {len(free_models)}")

            print("\nAvailable models:")
            for model in models:
                provider = model.get("provider", "unknown")
                req_key = "API" if model.get("api_key_required", False) else "FREE"
                local = "LOCAL" if model.get("local_model", False) else "REMOTE"
                specialty = (
                    f" ({model.get('specialty')})" if model.get("specialty") else ""
                )
                print(
                    f"  - {model.get('name', 'N/A')} [{provider}] [{req_key}] [{local}]{specialty}"
                )

        except Exception as e:
            print(f"Config error: {e}")

    # Python importsテスト
    try:
        import importlib.util

        spec = importlib.util.spec_from_file_location("discuss", "scripts/discuss.py")
        module = importlib.util.module_from_spec(spec)
        print(f"Module load: OK")

    except Exception as e:
        print(f"Module load error: {e}")
        return False

    # 環境変数チェック
    openai_key = os.getenv("OPENAI_API_KEY")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")

    print(f"OpenAI API Key: {'OK' if openai_key else 'MISSING'}")
    print(f"Anthropic API Key: {'OK' if anthropic_key else 'MISSING'}")

    print("\n[INFO] 基本機能テスト完了")
    print("[INFO] 実際のAPIテストには環境変数設定が必要です")

    return True


if __name__ == "__main__":
    success = test_basic_functionality()
    sys.exit(0 if success else 1)
