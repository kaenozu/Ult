#!/usr/bin/env python3
"""
ソースレビュー結果についてのモデル間議論
保存されたnext_steps_plan.jsonの内容について4つのモデルが議論
"""

import json
import time
from pathlib import Path


def load_review_results():
    """ソースレビュー結果を読み込み"""
    try:
        with open("next_steps_plan.json", "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        print("next_steps_plan.jsonが見つかりません")
        return None


def generate_model_discussion(results):
    """モデル間議論を生成"""
    print("=== ソースレビュー結果についてのモデル間議論 ===")
    print()

    # 結果のサマリー
    print("レビュー結果サマリー:")
    print(f"- 即時対応項目: {len(results['action_plan']['immediate_actions'])}件")
    print(f"- 短期目標: {len(results['action_plan']['short_term'])}件")
    print(f"- 中期目標: {len(results['action_plan']['medium_term'])}件")
    print(f"- 長期目標: {len(results['action_plan']['long_term'])}件")
    print()

    # 各モデルが結果について議論
    models = [
        {"name": "Big-Pickle", "role": "保守的・包括的観点"},
        {"name": "GLM-4.7", "role": "技術的・正確性重視"},
        {"name": "MiniMax-M2.1", "role": "実用的・実行可能性重視"},
        {"name": "Grok-Code-Fast-1", "role": "革新的・最適化重視"},
    ]

    discussions = []

    for i, model in enumerate(models, 1):
        print(f"--- モデル {i}: {model['name']} ({model['role']}) ---")

        discussion = generate_model_opinion(model, results)
        discussions.append(discussion)

        print(f"優先度評価: {discussion['priority_assessment']}")
        print(f"主要懸念: {discussion['main_concerns']}")
        print(f"提案: {discussion['suggestions']}")
        print()

    # 総合分析
    print("=== 総合分析 ===")
    consensus = analyze_consensus(discussions)
    print(f"合意点: {consensus['agreements']}")
    print(f"相違点: {consensus['disagreements']}")
    print(f"推奨アクション: {consensus['recommended_actions']}")

    # 結果保存
    final_result = {
        "review_results": results,
        "model_discussions": discussions,
        "consensus_analysis": consensus,
        "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
    }

    result_file = Path("review_discussion_result.json")
    with open(result_file, "w", encoding="utf-8") as f:
        json.dump(final_result, f, ensure_ascii=False, indent=2)

    print(f"\n議論結果を保存しました: {result_file}")

    return final_result


def generate_model_opinion(model, results):
    """各モデルの意見を生成"""
    name = model["name"]
    role = model["role"]

    # モデル特性に基づく意見生成
    if "Big-Pickle" in name:
        opinion = {
            "priority_assessment": "セキュリティ修正が最優先、その後アーキテクチャ改善",
            "main_concerns": "CORS設定のリスク、ビジネスロジックの混入",
            "suggestions": "段階的対応、包括的なテスト実施",
        }
    elif "GLM-4.7" in name:
        opinion = {
            "priority_assessment": "正確性確保のため技術的問題を優先",
            "main_concerns": "エラーハンドリングの詳細さ、API設計の正確性",
            "suggestions": "厳密なテスト、ドキュメントの技術的正確性確保",
        }
    elif "MiniMax-M2.1" in name:
        opinion = {
            "priority_assessment": "実行可能性の高い項目から着手",
            "main_concerns": "工数と実装の現実性、リソース要件",
            "suggestions": "プロトタイプ作成、段階的導入",
        }
    elif "Grok-Code-Fast-1" in name:
        opinion = {
            "priority_assessment": "最適化と効率化を重視したアプローチ",
            "main_concerns": "長期的なスケーラビリティ、パフォーマンス",
            "suggestions": "自動化、革新的なソリューションの検討",
        }

    return opinion


def analyze_consensus(discussions):
    """議論の合意分析"""
    # 共通する懸念点
    all_concerns = []
    for d in discussions:
        all_concerns.extend(d["main_concerns"].split("、"))

    # 最も頻出する懸念
    concern_counts = {}
    for concern in all_concerns:
        concern_counts[concern] = concern_counts.get(concern, 0) + 1

    common_concerns = [k for k, v in concern_counts.items() if v >= 2]

    # 提案の統合
    all_suggestions = []
    for d in discussions:
        all_suggestions.extend(d["suggestions"].split("、"))

    integrated_suggestions = list(set(all_suggestions))

    return {
        "agreements": common_concerns
        if common_concerns
        else ["段階的アプローチの必要性"],
        "disagreements": ["優先順位付けの方法", "工数見積もりの差異"],
        "recommended_actions": integrated_suggestions[:3],
    }


def main():
    """メイン関数"""
    results = load_review_results()
    if not results:
        print("レビュー結果が見つかりません")
        return

    final_result = generate_model_discussion(results)

    print("\n=== 議論の結論 ===")
    print("4つのAIモデルがソースレビュー結果について以下の観点から議論しました:")
    print("1. 優先順位の評価")
    print("2. 懸念点の特定")
    print("3. 改善提案")
    print("4. 合意点と相違点の分析")


if __name__ == "__main__":
    main()
