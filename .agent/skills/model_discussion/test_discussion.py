#!/usr/bin/env python3
"""
Test script for Model Discussion Agent
"""

import sys
import os
from pathlib import Path

# スクリプトのディレクトリをパスに追加
scripts_dir = Path(__file__).parent / "scripts"
sys.path.insert(0, str(scripts_dir))


def test_discussion():
    """Discussionの基本機能テスト"""
    print("=== Model Discussion Agent Test ===")

    # 環境変数の確認
    openai_key = os.getenv("OPENAI_API_KEY")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")

    print(f"OpenAI API Key: {'OK' if openai_key else 'MISSING'}")
    print(f"Anthropic API Key: {'OK' if anthropic_key else 'MISSING'}")

    if not openai_key and not anthropic_key:
        print("\n[INFO] APIキーが設定されていないため、モックテストを実行します")

        # モックテスト
        from discuss import ModelDiscussionAgent, ModelConfig

        agent = ModelDiscussionAgent()

        # モックモデルを追加
        mock_model = ModelConfig(
            name="Mock-Model",
            provider="mock",
            model="mock-gpt",
            api_key_env="MOCK_API_KEY",
            api_key="mock-key",
            enabled=True,
        )
        agent.models = [mock_model]

        # 簡単なトピックでテスト
        result = agent.discuss_topic(
            "Pythonのベストプラクティス",
            "初級者向けのアドバイスをお願いします",
            "general",
        )

        print(f"\n[RESULT] テスト完了")
        print(f"  トピック: {result.topic}")
        print(f"  回答数: {len(result.responses)}")
        print(f"  成功回答: {len([r for r in result.responses if r.success])}")
        print(f"  最良回答: {result.best_response}")

        return len(result.responses) > 0
    else:
        print("\n[INFO] APIキーが設定されています。本番テストを実行します")

        try:
            from discuss import ModelDiscussionAgent

            agent = ModelDiscussionAgent()

            if not agent.models:
                print("[ERROR] 有効なモデルがありません")
                return False

            print(f"\n[INFO] {len(agent.models)}個のモデルが利用可能です")

            # 簡単なテストトピック
            result = agent.discuss_topic(
                "コーディングの効率を上げる方法",
                "日常開発での改善点について",
                "general",
            )

            successful_responses = [r for r in result.responses if r.success]

            print(f"\n[RESULT] テスト完了")
            print(f"  総回答数: {len(result.responses)}")
            print(f"  成功回答: {len(successful_responses)}")
            print(f"  失敗回答: {len(result.responses) - len(successful_responses)}")

            if successful_responses:
                avg_time = sum(r.response_time for r in successful_responses) / len(
                    successful_responses
                )
                print(f"  平均応答時間: {avg_time:.1f}秒")
                print(f"  最良回答: {result.best_response}")

            return len(successful_responses) > 0

        except Exception as e:
            print(f"[ERROR] テスト実行中にエラー: {e}")
            return False


if __name__ == "__main__":
    success = test_discussion()
    sys.exit(0 if success else 1)
