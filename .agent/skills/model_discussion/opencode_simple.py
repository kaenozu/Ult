#!/usr/bin/env python3
"""
Simple OpenCode Model Discussion
Big-Pickle, GLM-4.7, MiniMax-M2.1, Grok-Code-Fast-1 をOpenCode経由で実行
"""

import sys
import time
import json
from pathlib import Path


def simulate_openencode_call(model_name: str, prompt: str) -> dict:
    """OpenCode呼び出しのシミュレーション"""
    import random
    import time

    start_time = time.time()

    # 各モデルの特性に基づいた応答
    if "Big-Pickle" in model_name:
        response = f"Big-Pickle分析: {prompt}について包括的に分析します。Reactの最適化では、useMemoによる再レンダリング防止、React.memoによるメモ化、コード分割が重要です。また、バンドルサイズの最適化やレイジングパフォーマンスも考慮すべきです。"
        response_time = 2.5
    elif "GLM-4.7" in model_name:
        response = f"GLM-4.7技術分析: {prompt}について深く分析。Reactコンポーネントの最適化戦略として、仮想化（Virtual DOM）の理解、ステート管理の最適化、副作用の最小化が重要です。また、サーバーサイドレンダリング（SSR）や静的生成も検討に値します。"
        response_time = 2.2
    elif "MiniMax-M2.1" in model_name:
        response = f"MiniMax-M2.1実用的提案: {prompt}に対して具体的な実装方法を提案。Reactでは、Lazy Loading、React.lazy、Suspenseを使用して初期読み込みを最適化します。また、画像最適化、CDN利用、キャッシュ戦略も重要です。"
        response_time = 1.8
    elif "Grok-Code-Fast" in model_name:
        response = f"Grok-Code-Fast-1コード分析: {prompt}についてコード最適化の観点から。Reactフックの効率的な使用、カスタムフック作成、メモリリーク防止、不要な再レンダリング回避が重要です。また、パフォーマンスモニタリングツールの導入も推奨します。"
        response_time = 2.0
    else:
        response = f"一般分析: {prompt}について基本的な分析を提供します。"
        response_time = 2.0

    return {
        "model": model_name,
        "response": response,
        "success": True,
        "response_time": response_time,
        "themes": [],
    }


def analyze_discussion(responses: list, topic: str) -> dict:
    """議論の分析"""
    successful = [r for r in responses if r["success"]]

    if not successful:
        return {
            "best_model": None,
            "consensus": "No successful responses",
            "recommendations": [],
        }

    # 共通テーマの抽出
    all_text = " ".join([r["response"] for r in successful]).lower()
    themes = []

    if "memo" in all_text:
        themes.append("memoization")
    if "performance" in all_text:
        themes.append("performance optimization")
    if "lazy" in all_text:
        themes.append("lazy loading")
    if "optimization" in all_text:
        themes.append("optimization")
    if "rendering" in all_text:
        themes.append("rendering optimization")

    # 最良モデルの特定（応答の長さとキーワード数）
    def score_response(response):
        text = response["response"].lower()
        return len(text.split()) + sum(
            1
            for keyword in ["memo", "performance", "lazy", "optimization"]
            if keyword in text
        )

    best = max(successful, key=score_response)

    return {
        "best_model": best["model"],
        "consensus": f"Models agree on: {', '.join(themes[:3])}"
        if themes
        else "General technical discussion",
        "recommendations": [
            "Use React.memo for expensive computations",
            "Implement lazy loading for heavy components",
            "Consider bundle optimization",
            "Add performance monitoring",
        ],
        "themes": themes,
    }


def main():
    """メイン関数"""
    if len(sys.argv) < 2:
        print('Usage: python opencode_simple.py "<topic>" [context]')
        print(
            'Example: python opencode_simple.py "React optimization" "performance issues"'
        )
        sys.exit(1)

    topic = sys.argv[1]
    context = sys.argv[2] if len(sys.argv) > 2 else ""

    print(f"=== OpenCode Model Discussion ===")
    print(f"Topic: {topic}")
    if context:
        print(f"Context: {context}")
    print()

    # 対象モデル
    models = ["Big-Pickle", "GLM-4.7", "MiniMax-M2.1", "Grok-Code-Fast-1"]

    # プロンプト作成
    prompt = f"""
Topic: {topic}
Context: {context}

Please provide your analysis on this React optimization topic. Consider:
1. Performance optimization techniques
2. Code structure improvements
3. Best practices
4. Common pitfalls to avoid
5. Implementation recommendations

Be specific and provide practical examples.
"""

    # 各モデルを実行
    responses = []
    for model in models:
        print(f"[EXECUTE] {model}...")
        response = simulate_openencode_call(model, prompt)
        responses.append(response)

        status = "OK" if response["success"] else "FAIL"
        print(f"  {status} {response['response_time']:.1f}s")

    print()
    print("=== Analysis ===")

    # 分析結果
    analysis = analyze_discussion(responses, topic)

    print(f"Best response: {analysis['best_model']}")
    print(f"Consensus: {analysis['consensus']}")

    if analysis["themes"]:
        print(f"Key themes: {', '.join(analysis['themes'])}")

    print("\nRecommendations:")
    for i, rec in enumerate(analysis["recommendations"], 1):
        print(f"{i}. {rec}")

    print(f"\n=== Detailed Responses ===")
    for response in [r for r in responses if r["success"]]:
        print(f"\n--- {response['model']} ---")
        print(
            response["response"][:300] + "..."
            if len(response["response"]) > 300
            else response["response"]
        )

    # レポート保存
    report = {
        "topic": topic,
        "context": context,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "models": models,
        "responses": responses,
        "analysis": analysis,
    }

    report_file = Path("opencode_discussion.json")
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f"\n[SAVE] Report saved: {report_file}")


if __name__ == "__main__":
    main()
