#!/usr/bin/env python3
"""
OpenCode Integration for Model Discussion Agent
すべてのモデルをOpenCode経由で実行するヘルパースクリプト
"""

import sys
import json
from pathlib import Path


def run_via_opencode(topic: str, context: str = "", question_type: str = "general"):
    """OpenCode経由ですべてのモデルを実行"""

    # 利用可能なモデルリスト
    models = [
        # 指定された4モデルのみ
        {
            "name": "Big-Pickle",
            "provider": "huggingface",
            "requires_key": False,
            "specialty": "general",
        },
        {
            "name": "GLM-4.7",
            "provider": "huggingface",
            "requires_key": False,
            "specialty": "general",
        },
        {
            "name": "MiniMax-M2.1",
            "provider": "huggingface",
            "requires_key": False,
            "specialty": "general",
        },
        {
            "name": "Grok-Code-Fast-1",
            "provider": "huggingface",
            "requires_key": False,
            "specialty": "code",
        },
    ]

    print(f"=== OpenCode Model Discussion ===")
    print(f"Topic: {topic}")
    print(f"Context: {context[:50]}..." if len(context) > 50 else f"Context: {context}")
    print(f"Type: {question_type}")
    print(f"Models: {len(models)}")
    print()

    # 各モデルを実行（シミュレーション）
    results = []
    for model in models:
        print(f"[{model['provider']}] {model['name']}...")

        # OpenCodeのスキル実行をシミュレート
        result = simulate_model_response(model, topic, context, question_type)
        results.append(result)

        status = "✅" if result["success"] else "❌"
        print(f"  {status} {result['response_time']:.1f}s - {result['summary']}")

    # 分析結果
    print(f"\n=== Analysis ===")
    successful = [r for r in results if r["success"]]
    failed = [r for r in results if not r["success"]]

    print(f"Successful: {len(successful)}/{len(results)}")
    print(f"Failed: {len(failed)}")

    if successful:
        avg_time = sum(r["response_time"] for r in successful) / len(successful)
        print(f"Average response time: {avg_time:.1f}s")

        # コンセンサス
        themes = {}
        for result in successful:
            for theme in result["themes"]:
                themes[theme] = themes.get(theme, 0) + 1

        consensus = [
            theme for theme, count in themes.items() if count >= len(successful) / 2
        ]

        if consensus:
            print(f"Consensus themes: {', '.join(consensus)}")

        # 最良回答
        best = max(successful, key=lambda x: x["score"])
        print(f"Best response: {best['model']} (score: {best['score']:.1f})")

    # 詳細レポート
    report = {
        "topic": topic,
        "context": context,
        "question_type": question_type,
        "models": len(models),
        "successful": len(successful),
        "failed": len(failed),
        "results": results,
        "best_response": best["model"] if successful else None,
    }

    # レポート保存
    report_file = Path("opencode_discussion_report.json")
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f"\n[SAVE] レポートを保存しました: {report_file}")
    return len(successful) > 0


def simulate_model_response(
    model: dict, topic: str, context: str, question_type: str
) -> dict:
    """モデル応答のシミュレーション"""
    import time
    import random

    start_time = time.time()

    # モデル特性に基づく応答時間
    base_time = {
        "openai": 2.5,
        "anthropic": 2.0,
        "ollama": 1.5,
        "huggingface": 3.0,
        "groq": 1.2,
    }.get(model["provider"], 2.0)

    # コード専門モデルは少し速い
    if model.get("specialty") == "code":
        base_time *= 0.8

    response_time = base_time + random.uniform(-0.5, 0.5)
    success = random.random() > 0.1  # 90%成功率

    if success:
        # モデル特性に基づくテーマ
        if model.get("specialty") == "code":
            themes = ["implementation", "optimization", "best practices"]
        elif model["provider"] == "openai":
            themes = ["comprehensive", "structured", "detailed"]
        elif model["provider"] == "anthropic":
            themes = ["analytical", "balanced", "ethical"]
        elif model["provider"] == "ollama":
            themes = ["practical", "efficient", "lightweight"]
        else:
            themes = ["general", "helpful", "balanced"]

        score = random.uniform(7.0, 9.5)
        summary = random.choice(
            [
                "Comprehensive technical analysis",
                "Practical implementation guide",
                "Clear explanation with examples",
                "Code-focused solution",
                "Balanced approach",
            ]
        )
    else:
        themes = []
        score = 0
        summary = "Failed to respond"
        response_time = base_time

    return {
        "model": model["name"],
        "provider": model["provider"],
        "success": success,
        "response_time": response_time,
        "themes": themes,
        "score": score if success else 0,
        "summary": summary,
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print('Usage: python opencode_runner.py "<topic>" [context] [type]')
        print(
            'Example: python opencode_runner.py "React optimization" "performance issues" general'
        )
        sys.exit(1)

    topic = sys.argv[1]
    context = sys.argv[2] if len(sys.argv) > 2 else ""
    question_type = sys.argv[3] if len(sys.argv) > 3 else "general"

    success = run_via_opencode(topic, context, question_type)
    sys.exit(0 if success else 1)
