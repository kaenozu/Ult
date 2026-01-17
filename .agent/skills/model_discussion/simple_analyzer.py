#!/usr/bin/env python3
"""
簡易版動的モデル特性分析器
jupyterやjiebaがない環境でも動作するように実装
"""

import sys
import time
import json
from pathlib import Path
from typing import Dict, List, Any


class SimpleModelAnalyzer:
    
    def _get_supporting_role(self, assignment: Dict[str, Any]) -> str:
    """簡易版モデル特性分析器"""

    def __init__(self):
        self.model_characteristics = {
            "Big-Pickle": {
                "strengths": ["包括的分析", "安定性", "保守性"],
                "focus_areas": ["政策", "戦略", "文化", "統合"],
                "response_style": "体系的",
                "optimal_topics": ["ガバナンス", "法制", "社会基盤"],
                "interaction_approach": "丁寧",
            },
            "GLM-4.7": {
                "strengths": ["技術的", "正確性", "専門性"],
                "focus_areas": ["技術", "研究", "学術", "詳細分析"],
                "response_style": "精密",
                "optimal_topics": ["技術開発", "研究方法", "実験"],
                "interaction_approach": "厳密",
            },
            "MiniMax-M2.1": {
                "strengths": ["実用性", "具体性", "実装指向"],
                "focus_areas": ["開発", "実装", "手法", "問題解決"],
                "response_style": "直接的",
                "optimal_topics": ["実装方法", "ベストプラクティス", "ツール"],
                "interaction_approach": "率直",
            },
            "Grok-Code-Fast-1": {
                "strengths": ["革新性", "効率", "最適化"],
                "focus_areas": ["技術", "革新", "改善", "最適化"],
                "response_style": "進歩的",
                "optimal_topics": ["技術トレンド", "改善案", "効率化"],
                "interaction_approach": "革新的",
            },
        }

    def analyze_topic(self, topic: str) -> Dict[str, Any]:
        """トピックに応じて最適なモデルを推薨"""
        topic_lower = topic.lower()

        # トピック特徴の抽出
        features = {
            "policy_related": any(
                word in topic_lower
                for word in [
                    "政策",
                    "法律",
                    "規則",
                    "制度",
                    "行政",
                    "政府",
                    "予算",
                    "税制",
                ]
            ),
            "technical_topic": any(
                word in topic_lower
                for word in [
                    "技術",
                    "開発",
                    "システム",
                    "プログラム",
                    "API",
                    "データベース",
                    "インフラ",
                    "AI",
                ]
            ),
            "implementation_topic": any(
                word in topic_lower
                for word in [
                    "実装",
                    "コーディング",
                    "開発方法",
                    "具体的",
                    "手法",
                    "ツール",
                ]
            ),
            "educational_topic": any(
                word in topic_lower
                for word in ["教育", "学習", "訓練", "研究", "大学", "学校", "授業"]
            ),
            "discussion_related": any(
                word in topic_lower
                for word in ["議論", "検討", "意見", "比較", "分析", "どう思う", "検証"]
            ),
        }

        # スコア計算
        scores = {}
        for model_name, profile in self.model_characteristics.items():
            score = 0

            # 特徴とのマッチング
            if features["policy_related"] and "政策" in profile["focus_areas"]:
                score += 3
            if features["technical_topic"] and "技術" in profile["focus_areas"]:
                score += 3
            if features["implementation_topic"] and "開発" in profile["focus_areas"]:
                score += 3
            if features["educational_topic"] and "教育" in profile["focus_areas"]:
                score += 3
            if features["discussion_related"]:
                score += 2  # 議論関連はすべてのモデルで対応

            # レスポンスタイルとのマッチング
            if features["policy_related"] and profile["interaction_approach"] == "丁寧":
                score += 2
            if features["technical_topic"] and profile["response_style"] == "精密":
                score += 2

            scores[model_name] = score

        # 最高スコアのモデルを特定
        best_model = max(scores.items(), key=lambda x: x[1])[0] if scores else None
        best_score = scores[best_model] if best_model else 0

        return {
            "topic": topic,
            "features": features,
            "model_scores": scores,
            "recommended_model": best_model,
            "best_score": best_score,
            "recommendation": f"{best_model}が最適なモデルと判断されます（スコア: {best_score}）",
        }

    def generate_interaction_plan(self, recommended_model: str, topic: str) -> dict:
        """対話計画の生成"""
        profile = self.model_characteristics[recommended_model]

        plan = {
            "primary_model": recommended_model,
            "primary_approach": profile["interaction_approach"],
            "supporting_models": [
                model
                for model in self.model_characteristics.keys()
                if model != recommended_model
            ],
            "interaction_sequence": [
                {
                    "step": 1,
                    "model": recommended_model,
                    "action": f"主要な視点から{profile['interaction_approach']}で分析を開始",
                },
                {
                    "step": 2,
                    "model": recommended_model,
                    "action": f"{profile['focus_areas'][0]}の視点を詳細に展開",
                },
            ],
        }

        return plan


def main():
    """メイン関数"""
    if len(sys.argv) < 2:
        print('使い方: python simple_analyzer.py "<分析するトピック>"')
        print('例: python simple_analyzer.py "Reactコンポーネントの最適化"')
        sys.exit(1)

    topic = " ".join(sys.argv[1:])
    analyzer = SimpleModelAnalyzer()

    print("=== 簡単版モデル特性分析 ===")
    print(f"トピック: {topic}")
    print()

    # トピック分析
    analysis = analyzer.analyze_topic(topic)

    print("--- トピック特徴 ---")
    for feature, value in analysis["features"].items():
        print(f"{feature}: {value}")

    print()
    print("--- モデルスコア ---")
    for model, score in analysis["model_scores"].items():
        status = "推奨" if model == analysis["recommended_model"] else "候補"
        print(f"{model}: {score}点 ({status})")

    print()
    print("--- 推奨結果 ---")
    print(analysis["recommendation"])

    print()
    print("=== 対話計画 ===")
    interaction_plan = analyzer.generate_interaction_plan(
        analysis["recommended_model"], topic
    )

    print(f"主担当モデル: {interaction_plan['primary_model']}")
    print(f"主要アプローチ: {interaction_plan['primary_approach']}")
    print("支援モデル:", interaction_plan["supporting_models"])
    print()
    print("--- 対話シーケンス ---")
    for step in interaction_plan["interaction_sequence"]:
        print(f"ステップ{step['step']}: {step['model']} - {step['action']}")

    # 結果保存
    result = {
        "topic": topic,
        "analysis": analysis,
        "interaction_plan": interaction_plan,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
    }

    result_file = Path("simple_analysis_result.json")
    with open(result_file, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"\n結果を保存しました: {result_file}")


if __name__ == "__main__":
    main()
