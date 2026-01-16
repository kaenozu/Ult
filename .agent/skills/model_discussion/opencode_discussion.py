#!/usr/bin/env python3
"""
OpenCode Model Discussion Agent
Big-Pickle, GLM-4.7, MiniMax-M2.1, Grok-Code-Fast-1 をOpenCode経由で実行
"""

import sys
import time
import json
from pathlib import Path


def get_opencode_response(model_name: str, prompt: str) -> dict:
    """OpenCode経由でモデル応答を取得（モック版）"""
    import random
    import time
    
    start_time = time.time()
    
    # モデル特性に基づくシミュレーション
    if "Big" in model_name:
        response = f"Big-Pickleの分析: {prompt}について包括的に考察します。React最適化ではuseMemo、コード分割、状態管理が重要です。"
        response_time = 2.5 + random.uniform(-0.3, 0.3)
    elif "GLM" in model_name:
        response = f"GLM-4.7の技術的分析: {prompt}について深く分析。仮想DOM差分、React Profiler、Bundle Analyzerの活用を推奨します。"
        response_time = 2.2 + random.uniform(-0.2, 0.2)
    elif "MiniMax" in model_name:
        response = f"MiniMax-M2.1の実用的提案: {prompt}に対して具体的な実装方法を提案。React.memo、useCallback、Suspenseの効果的な使用が鍵です。"
        response_time = 1.8 + random.uniform(-0.2, 0.2)
    elif "Grok" in model_name:
        response = f"Grok-Code-Fast-1のコード専門分析: {prompt}についてコード最適化の観点から。以下のコード改善案を提案：\n1. レンダリング最適化\n2. メモリ管理\n3. パフォーマンス監視"
        response_time = 2.0 + random.uniform(-0.3, 0.3)
    else:
        response = f"一般的な分析: {prompt}について基本的な考察を提供します。"
        response_time = 2.0
    
    return {
        "model": model_name,
        "response": response,
        "success": True,
        "response_time": response_time
    }

    except Exception as e:
        error_msg = str(e)
        return {"model": model_name, "response": "", "success": False, "error": error_msg}


def analyze_responses(responses: list) -> dict:
    """複数応答を分析"""
    successful = [r for r in responses if r["success"]]

    if not successful:
        return {
            "best_model": None,
            "consensus": "No successful responses",
            "themes": [],
            "recommendation": "Try again later",
        }

    # 共通テーマを抽出（簡易的な方法）
    all_text = " ".join([r["response"] for r in successful])
    themes = []

    if "performance" in all_text.lower():
        themes.append("performance optimization")
    if "code" in all_text.lower():
        themes.append("code quality")
    if "security" in all_text.lower():
        themes.append("security")
    if "architecture" in all_text.lower():
        themes.append("architecture")
    if "best practices" in all_text.lower():
        themes.append("best practices")

    # 最良モデルを特定（最も長い応答と仮定）
    best_model = max(successful, key=lambda x: len(x["response"]))

    return {
        "best_model": best_model["model"],
        "consensus": f"Models agree on: {', '.join(themes[:3])}"
        if themes
        else "General agreement found",
        "themes": themes,
        "recommendation": f"Use {best_model['model']}'s approach for implementation",
    }


def run_model_discussion(topic: str, context: str = ""):
    """モデル議論を実行"""
    print(f"=== OpenCode Model Discussion ===")
    print(f"Topic: {topic}")
    if context:
        print(f"Context: {context}")
    print()

    # 指定された4モデル
    models = ["Big-Pickle", "GLM-4.7", "MiniMax-M2.1", "Grok-Code-Fast-1"]

    # プロンプト作成
    prompt = f"""
Topic: {topic}
Context: {context}

Please provide your analysis on this topic. Consider:
1. Technical approach
2. Implementation considerations
3. Best practices
4. Potential challenges
5. Recommendations

Be specific and practical in your response.
"""

    # 各モデルに問い合わせ
    responses = []
    for model in models:
        print(f"[QUERY] {model}...")
        start_time = time.time()

        response = get_opencode_response(model, prompt)
        response["response_time"] = time.time() - start_time

        status = "OK" if response["success"] else "FAIL"
        print(f"  {status} {response['response_time']:.1f}s")

        responses.append(response)
        print()  # 改行

    # 分析結果
    print("=== Analysis ===")
    analysis = analyze_responses(responses)

    successful = [r for r in responses if r["success"]]
    print(f"Successful responses: {len(successful)}/{len(responses)}")

    if analysis["best_model"]:
        print(f"Best response: {analysis['best_model']}")

    print(f"Consensus: {analysis['consensus']}")

    if analysis["themes"]:
        print(f"Key themes: {', '.join(analysis['themes'])}")

    print(f"Recommendation: {analysis['recommendation']}")

    # 詳細な応答を表示
    print("\n=== Detailed Responses ===")
    for response in successful:
        print(f"\n--- {response['model']} ---")
        print(
            response["response"][:500] + "..."
            if len(response["response"]) > 500
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

    report_file = Path("opencode_model_discussion.json")
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f"\n[SAVE] Report saved: {report_file}")
    return len(successful) > 0


def main():
    """メイン関数"""
    if len(sys.argv) < 2:
        print('Usage: python opencode_discussion.py "<topic>" [context]')
        print(
            'Example: python opencode_discussion.py "React optimization" "performance issues"'
        )
        sys.exit(1)

    topic = sys.argv[1]
    context = sys.argv[2] if len(sys.argv) > 2 else ""

    success = run_model_discussion(topic, context)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
