#!/usr/bin/env python3
"""
適応的評価指標システム
トピックとモデル特性に応じて最適な評価指標を動的に決定
"""

import sys
import time
import json
from pathlib import Path


class AdaptiveScoringSystem:
    """適応的評価指標システム"""

    def __init__(self):
        # 評価指標の定義
        self.base_metrics = {
            "accuracy": {
                "description": "技術的な正確性",
                "weight_range": [0.3, 0.8],
                "optimal_for": ["technical", "factual"],
                "weight": 0.6,
            },
            "completeness": {
                "description": "回答の網羅性",
                "weight_range": [0.2, 0.6],
                "optimal_for": ["comprehensive", "analytical"],
                "weight": 0.5,
            },
            "clarity": {
                "description": "表現の明瞭さ",
                "weight_range": [0.4, 0.7],
                "optimal_for": ["educational", "explanatory"],
                "weight": 0.5,
            },
            "practicality": {
                "description": "実用性と実装可能性",
                "weight_range": [0.5, 0.8],
                "optimal_for": ["implementation", "practical"],
                "weight": 0.7,
            },
            "innovation": {
                "description": "革新的な視点",
                "weight_range": [0.2, 0.6],
                "optimal_for": ["creative", "innovative"],
                "weight": 0.4,
            },
            "performance_impact": {
                "description": "パフォーマンスへの影響評価",
                "weight_range": [0.3, 0.7],
                "optimal_for": ["optimization", "performance"],
                "weight": 0.6,
            },
            "ethical_consistency": {
                "description": "倫理的一貫性",
                "weight_range": [0.2, 0.5],
                "optimal_for": ["policy", "social"],
                "weight": 0.3,
            },
            "user_friendliness": {
                "description": "ユーザビリティ",
                "weight_range": [0.4, 0.7],
                "optimal_for": ["ui", "user_experience"],
                "weight": 0.5,
            },
            "scalability": {
                "description": "スケーラビリティ",
                "weight_range": [0.3, 0.6],
                "optimal_for": ["architecture", "system_design"],
                "weight": 0.5,
            },
            "cost_efficiency": {
                "description": "コスト効率",
                "weight_range": [0.3, 0.6],
                "optimal_for": ["business", "economic"],
                "weight": 0.4,
            },
        }

    def analyze_topic_complexity(self, topic: str) -> dict:
        """トピックの複雑度を分析"""
        topic_lower = topic.lower()

        complexity_indicators = {
            "technical_terms": sum(
                1
                for term in [
                    "api",
                    "database",
                    "algorithm",
                    "architecture",
                    "framework",
                ]
                if term in topic_lower
            ),
            "abstract_terms": sum(
                1
                for term in ["philosophy", "theory", "concept", "paradigm", "ideology"]
                if term in topic_lower
            ),
            "practical_terms": sum(
                1
                for term in [
                    "implementation",
                    "deployment",
                    "tool",
                    "method",
                    "process",
                ]
                if term in topic_lower
            ),
            "social_terms": sum(
                1
                for term in ["policy", "governance", "ethics", "society", "impact"]
                if term in topic_lower
            ),
            "economic_terms": sum(
                1
                for term in ["cost", "efficiency", "budget", "roi", "optimization"]
                if term in topic_lower
            ),
            "ui_terms": sum(
                1
                for term in ["user", "interface", "experience", "design", "usability"]
                if term in topic_lower
            ),
            "innovation_terms": sum(
                1
                for term in ["innovative", "new", "trend", "future", "emerging"]
                if term in topic_lower
            ),
        }

        # トピックタイプの判定
        topic_types = []
        if complexity_indicators["technical_terms"] > 0:
            topic_types.append("technical")
        if complexity_indicators["abstract_terms"] > 0:
            topic_types.append("analytical")
        if complexity_indicators["practical_terms"] > 0:
            topic_types.append("implementation")
        if complexity_indicators["social_terms"] > 0:
            topic_types.append("policy")
        if complexity_indicators["economic_terms"] > 0:
            topic_types.append("business")
        if complexity_indicators["ui_terms"] > 0:
            topic_types.append("ui")
        if complexity_indicators["innovation_terms"] > 0:
            topic_types.append("innovative")

        if not topic_types:
            topic_types = ["general"]

        return {
            "topic_types": topic_types,
            "complexity_score": sum(complexity_indicators.values())
            / len(complexity_indicators),
            "indicators": complexity_indicators,
        }

    def select_optimal_metrics(self, topic_analysis: dict, model_name: str) -> dict:
        """最適な評価指標を選択"""
        topic_types = topic_analysis["topic_types"]
        complexity_score = topic_analysis["complexity_score"]

        # モデル特性に基づく調整
        model_adjustments = {
            "Big-Pickle": {
                "emphasize": ["completeness", "ethical_consistency"],
                "reduce": ["innovation"],
            },
            "GLM-4.7": {
                "emphasize": ["accuracy", "scalability"],
                "reduce": ["user_friendliness"],
            },
            "MiniMax-M2.1": {
                "emphasize": ["practicality", "cost_efficiency"],
                "reduce": ["ethical_consistency"],
            },
            "Grok-Code-Fast-1": {
                "emphasize": ["innovation", "performance_impact"],
                "reduce": ["completeness"],
            },
        }

        adjustments = model_adjustments.get(model_name, {})

        # 最適指標の選択と重み付け
        optimal_metrics = {}

        for metric_name, metric_info in self.base_metrics.items():
            base_weight = metric_info["weight"]

            # トピック適合性に基づく調整
            topic_bonus = 0
            if any(t in metric_info["optimal_for"] for t in topic_types):
                topic_bonus = 0.2

            # モデル特性に基づく調整
            model_bonus = 0
            model_reduction = 0

            if metric_name in adjustments.get("emphasize", []):
                model_bonus = 0.15
            if metric_name in adjustments.get("reduce", []):
                model_reduction = 0.1

            # 複雑度に基づく調整
            complexity_factor = 1.0
            if complexity_score > 0.7 and metric_name == "completeness":
                complexity_factor = 1.2
            elif complexity_score < 0.3 and metric_name == "clarity":
                complexity_factor = 1.3

            # 最終重み計算
            final_weight = (
                base_weight
                * (1 + topic_bonus + model_bonus - model_reduction)
                * complexity_factor
            )

            # 重みの範囲を制限
            final_weight = max(0.1, min(1.0, final_weight))

            optimal_metrics[metric_name] = {
                "weight": round(final_weight, 2),
                "description": metric_info["description"],
                "reason": f"トピック適合性: {topic_bonus > 0}, モデル特性: {model_bonus - model_reduction}",
            }

        # 重みでソートして上位5つを選択
        sorted_metrics = sorted(
            optimal_metrics.items(), key=lambda x: x[1]["weight"], reverse=True
        )
        selected_metrics = dict(sorted_metrics[:5])

        return {
            "selected_metrics": selected_metrics,
            "total_weight": sum(m["weight"] for m in selected_metrics.values()),
            "topic_types": topic_types,
            "complexity_score": complexity_score,
        }

    def calculate_adaptive_score(
        self, response_analysis: dict, metric_weights: dict
    ) -> dict:
        """適応的スコア計算"""
        # 簡易的なスコア計算（実際の実装ではより詳細な分析が必要）
        scores = {}

        for metric_name, weight_info in metric_weights.items():
            # レスポンス品質に基づくスコア計算
            base_score = 0.5  # デフォルトスコア

            # レスポンス特性に基づく調整
            if "response" in response_analysis:
                response_text = response_analysis["response"]
                text_length = len(response_text.split())

                if metric_name == "completeness" and text_length > 100:
                    base_score += 0.2
                elif metric_name == "clarity" and text_length < 200:
                    base_score += 0.15
                elif metric_name == "practicality" and any(
                    word in response_text.lower() for word in ["実装", "手法", "ツール"]
                ):
                    base_score += 0.25

            scores[metric_name] = min(1.0, base_score)

        # 重み付きスコアの計算
        weighted_score = sum(
            scores[metric] * weights["weight"]
            for metric, weights in metric_weights.items()
        )
        total_weight = sum(w["weight"] for w in metric_weights.values())
        normalized_score = weighted_score / total_weight if total_weight > 0 else 0

        return {
            "individual_scores": scores,
            "weighted_score": round(weighted_score, 3),
            "normalized_score": round(normalized_score, 3),
            "total_weight": total_weight,
            "score_breakdown": {
                metric: f"{scores[metric]:.2f} × {weights['weight']:.2f} = {scores[metric] * weights['weight']:.2f}"
                for metric, weights in metric_weights.items()
            },
        }


def main():
    """メイン関数"""
    if len(sys.argv) < 2:
        print('使い方: python adaptive_scorer.py "<トピック>" [モデル名]')
        print('例: python adaptive_scorer.py "React最適化" "GLM-4.7"')
        sys.exit(1)

    topic = sys.argv[1]
    model_name = sys.argv[2] if len(sys.argv) > 2 else "Big-Pickle"

    scorer = AdaptiveScoringSystem()

    print("=== 適応的評価指標システム ===")
    print(f"トピック: {topic}")
    print(f"モデル: {model_name}")
    print()

    # トピック分析
    topic_analysis = scorer.analyze_topic_complexity(topic)
    print("--- トピック分析 ---")
    print(f"トピックタイプ: {', '.join(topic_analysis['topic_types'])}")
    print(f"複雑度スコア: {topic_analysis['complexity_score']:.2f}")
    print(f"技術用語数: {topic_analysis['indicators']['technical_terms']}")
    print(f"実用的用語数: {topic_analysis['indicators']['practical_terms']}")
    print()

    # 最適指標選択
    metric_selection = scorer.select_optimal_metrics(topic_analysis, model_name)
    print("--- 最適評価指標 ---")
    print(f"選択指標数: {len(metric_selection['selected_metrics'])}")
    print(f"総重み: {metric_selection['total_weight']:.2f}")
    print()

    for i, (metric_name, metric_info) in enumerate(
        metric_selection["selected_metrics"].items(), 1
    ):
        print(f"{i}. {metric_name} (重み: {metric_info['weight']:.2f})")
        print(f"   {metric_info['description']}")
        print(f"   理由: {metric_info['reason']}")
        print()

    # 模擬レスポンスでのスコア計算
    mock_response = {
        "response": f"{topic}について、包括的に分析します。技術的観点、実用的観点、革新的な観点から検討し、最適な解決策を提案します。",
        "model_name": model_name,
    }

    adaptive_score = scorer.calculate_adaptive_score(
        mock_response, metric_selection["selected_metrics"]
    )

    print("--- 適応的スコア計算 ---")
    print(f"正規化スコア: {adaptive_score['normalized_score']:.3f}")
    print(f"加重スコア: {adaptive_score['weighted_score']:.3f}")
    print()
    print("スコア内訳:")
    for metric, breakdown in adaptive_score["score_breakdown"].items():
        print(f"  {metric}: {breakdown}")

    # 結果保存
    result = {
        "topic": topic,
        "model_name": model_name,
        "topic_analysis": topic_analysis,
        "metric_selection": metric_selection,
        "adaptive_score": adaptive_score,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
    }

    result_file = Path("adaptive_scoring_result.json")
    with open(result_file, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"\n結果を保存しました: {result_file}")


if __name__ == "__main__":
    main()
