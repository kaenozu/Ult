#!/usr/bin/env python3
"""
議論履歴と学習システム
過去の議論から学習し、将来の議論を改善する機能
"""

import sys
import time
import json
from pathlib import Path
from collections import defaultdict
import statistics


class DiscussionHistoryLearner:
    """議論履歴学習システム"""

    def __init__(self, history_dir: str = "discussion_history"):
        self.history_dir = Path(history_dir)
        self.history_dir.mkdir(exist_ok=True)
        self.learning_data = self.load_learning_data()

    def load_learning_data(self) -> dict:
        """学習データの読み込み"""
        learning_file = self.history_dir / "learning_data.json"

        if learning_file.exists():
            try:
                with open(learning_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"学習データ読み込みエラー: {e}")

        # デフォルトの学習データ
        return {
            "topic_patterns": {},
            "model_performance": {},
            "discussion_quality": {},
            "successful_patterns": [],
            "improvement_suggestions": [],
            "total_discussions": 0,
            "last_updated": None,
        }

    def save_learning_data(self):
        """学習データの保存"""
        learning_file = self.history_dir / "learning_data.json"

        self.learning_data["last_updated"] = time.strftime("%Y-%m-%d %H:%M:%S")

        try:
            with open(learning_file, "w", encoding="utf-8") as f:
                json.dump(self.learning_data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"学習データ保存エラー: {e}")

    def record_discussion(self, discussion_data: dict):
        """議論を記録して学習"""
        self.learning_data["total_discussions"] += 1

        # トピックパターンの学習
        topic = discussion_data.get("topic", "")
        if topic:
            self.learn_topic_patterns(topic, discussion_data)

        # モデル性能の学習
        if "responses" in discussion_data:
            self.learn_model_performance(discussion_data["responses"])

        # 議論品質の学習
        if "summary" in discussion_data:
            self.learn_discussion_quality(discussion_data["summary"])

        # 成功パターンの学習
        self.identify_successful_patterns(discussion_data)

        # 改善提案の生成
        self.generate_improvement_suggestions()

        self.save_learning_data()

    def learn_topic_patterns(self, topic: str, discussion_data: dict):
        """トピックパターンの学習"""
        topic_lower = topic.lower()

        # トピックのカテゴリ分類
        categories = {
            "technical": ["技術", "開発", "システム", "api", "データベース"],
            "business": ["ビジネス", "戦略", "マーケティング", "経営"],
            "design": ["デザイン", "ui", "ux", "ユーザー"],
            "ethical": ["倫理", "セキュリティ", "プライバシー", "社会"],
            "innovation": ["革新", "トレンド", "未来", "新しい"],
        }

        topic_category = "general"
        for category, keywords in categories.items():
            if any(keyword in topic_lower for keyword in keywords):
                topic_category = category
                break

        # カテゴリ別統計の更新
        if topic_category not in self.learning_data["topic_patterns"]:
            self.learning_data["topic_patterns"][topic_category] = {
                "count": 0,
                "avg_quality": 0,
                "common_models": [],
                "successful_outcomes": 0,
            }

        pattern = self.learning_data["topic_patterns"][topic_category]
        pattern["count"] += 1

        # 品質スコアの更新（簡易版）
        if "summary" in discussion_data:
            quality_score = 0.5  # デフォルト
            if discussion_data["summary"].get("consensus_type") == "多様な見解":
                quality_score = 0.8

            pattern["avg_quality"] = (
                pattern["avg_quality"] * (pattern["count"] - 1) + quality_score
            ) / pattern["count"]

    def learn_model_performance(self, responses: list):
        """モデル性能の学習"""
        for response in responses:
            model_name = response.get("model", "unknown")
            success = response.get("success", False)
            response_time = response.get("response_time", 0)

            if model_name not in self.learning_data["model_performance"]:
                self.learning_data["model_performance"][model_name] = {
                    "total_responses": 0,
                    "successful_responses": 0,
                    "avg_response_time": 0,
                    "success_rate": 0,
                    "quality_scores": [],
                }

            perf = self.learning_data["model_performance"][model_name]
            perf["total_responses"] += 1

            if success:
                perf["successful_responses"] += 1

            # 応答時間の更新
            perf["avg_response_time"] = (
                perf["avg_response_time"] * (perf["total_responses"] - 1)
                + response_time
            ) / perf["total_responses"]

            # 成功率の計算
            perf["success_rate"] = (
                perf["successful_responses"] / perf["total_responses"]
            )

    def learn_discussion_quality(self, summary: dict):
        """議論品質の学習"""
        quality_factors = {
            "consensus_type": summary.get("consensus_type", "unknown"),
            "dominant_approach": summary.get("dominant_approach", "unknown"),
            "total_models": summary.get("total_models", 0),
            "successful_models": summary.get("successful_models", 0),
        }

        quality_key = f"{quality_factors['consensus_type']}_{quality_factors['dominant_approach']}"

        if quality_key not in self.learning_data["discussion_quality"]:
            self.learning_data["discussion_quality"][quality_key] = {
                "count": 0,
                "avg_success_rate": 0,
                "recommended_models": quality_factors["total_models"],
            }

        quality = self.learning_data["discussion_quality"][quality_key]
        quality["count"] += 1

        success_rate = (
            quality_factors["successful_models"] / quality_factors["total_models"]
            if quality_factors["total_models"] > 0
            else 0
        )
        quality["avg_success_rate"] = (
            quality["avg_success_rate"] * (quality["count"] - 1) + success_rate
        ) / quality["count"]

    def identify_successful_patterns(self, discussion_data: dict):
        """成功パターンの特定"""
        summary = discussion_data.get("summary", {})

        # 成功の基準
        is_successful = summary.get("successful_models", 0) == summary.get(
            "total_models", 0
        ) and summary.get("consensus_type") in ["多様な見解", "部分的な一致"]

        if is_successful:
            pattern = {
                "topic": discussion_data.get("topic", ""),
                "model_count": summary.get("total_models", 0),
                "consensus_type": summary.get("consensus_type", ""),
                "dominant_approach": summary.get("dominant_approach", ""),
                "timestamp": discussion_data.get("timestamp", ""),
            }

            self.learning_data["successful_patterns"].append(pattern)

            # 最新の10件のみ保持
            self.learning_data["successful_patterns"] = self.learning_data[
                "successful_patterns"
            ][-10:]

    def generate_improvement_suggestions(self):
        """改善提案の生成"""
        suggestions = []

        # モデル性能に基づく提案
        if self.learning_data["model_performance"]:
            # 最も信頼できるモデル
            best_model = max(
                self.learning_data["model_performance"].items(),
                key=lambda x: x[1]["success_rate"],
            )[0]

            suggestions.append(f"主要な議論では{best_model}を優先的に使用する")

            # 応答時間の改善提案
            avg_times = [
                perf["avg_response_time"]
                for perf in self.learning_data["model_performance"].values()
            ]
            if avg_times and statistics.mean(avg_times) > 30:
                suggestions.append(
                    "応答時間が長いモデルについては、プロンプトの最適化を検討する"
                )

        # トピックパターンに基づく提案
        if self.learning_data["topic_patterns"]:
            # 最も成功しやすいカテゴリ
            best_category = max(
                self.learning_data["topic_patterns"].items(),
                key=lambda x: x[1]["avg_quality"],
            )[0]

            suggestions.append(
                f"{best_category}カテゴリのトピックでは高品質な議論が可能"
            )

        # 議論品質に基づく提案
        if self.learning_data["discussion_quality"]:
            # 最も効果的な構成
            best_quality = max(
                self.learning_data["discussion_quality"].items(),
                key=lambda x: x[1]["avg_success_rate"],
            )[0]

            suggestions.append(f"議論構成として{best_quality}が最も効果的")

        self.learning_data["improvement_suggestions"] = suggestions

    def get_recommendations(self, topic: str, available_models: list) -> dict:
        """推奨事項の取得"""
        topic_lower = topic.lower()

        recommendations = {
            "suggested_models": [],
            "optimal_configuration": {},
            "expected_quality": 0.5,
            "learning_based_insights": [],
        }

        # トピックに基づくモデル推奨
        if self.learning_data["topic_patterns"]:
            topic_category = "general"
            for category in self.learning_data["topic_patterns"]:
                if category != "general" and category in topic_lower:
                    topic_category = category
                    break

            if topic_category in self.learning_data["topic_patterns"]:
                pattern = self.learning_data["topic_patterns"][topic_category]
                recommendations["expected_quality"] = pattern["avg_quality"]

        # 利用可能なモデルから最適なものを選択
        if self.learning_data["model_performance"]:
            model_scores = []
            for model in available_models:
                if model in self.learning_data["model_performance"]:
                    perf = self.learning_data["model_performance"][model]
                    score = (
                        perf["success_rate"] * 0.7
                        + (1 - perf["avg_response_time"] / 60) * 0.3
                    )  # 応答時間を考慮
                    model_scores.append((model, score))

            # 上位3モデルを推奨
            model_scores.sort(key=lambda x: x[1], reverse=True)
            recommendations["suggested_models"] = [
                model for model, _ in model_scores[:3]
            ]

        # 学習に基づく洞察
        if self.learning_data["successful_patterns"]:
            recent_successes = self.learning_data["successful_patterns"][-3:]
            insights = [
                f"直近の成功事例では{len(set(p['consensus_type'] for p in recent_successes))}種類の合意パターンが確認された",
                f"成功した議論の平均モデル数は{statistics.mean([p['model_count'] for p in recent_successes]):.1f}個",
            ]
            recommendations["learning_based_insights"] = insights

        return recommendations

    def generate_learning_report(self) -> dict:
        """学習レポートの生成"""
        report = {
            "learning_summary": {
                "total_discussions": self.learning_data["total_discussions"],
                "last_updated": self.learning_data["last_updated"],
                "learned_patterns": len(self.learning_data["topic_patterns"]),
                "successful_patterns": len(self.learning_data["successful_patterns"]),
            },
            "performance_insights": {},
            "quality_insights": {},
            "recommendations": self.learning_data["improvement_suggestions"],
        }

        # パフォーマンス洞察
        if self.learning_data["model_performance"]:
            best_performer = max(
                self.learning_data["model_performance"].items(),
                key=lambda x: x[1]["success_rate"],
            )
            report["performance_insights"]["best_model"] = best_performer[0]
            report["performance_insights"]["best_success_rate"] = best_performer[1][
                "success_rate"
            ]

        # 品質洞察
        if self.learning_data["discussion_quality"]:
            quality_types = list(self.learning_data["discussion_quality"].keys())
            report["quality_insights"]["quality_patterns"] = len(quality_types)
            report["quality_insights"]["available_patterns"] = quality_types

        return report


def main():
    """メイン関数"""
    if len(sys.argv) < 2:
        print("使い方:")
        print("  python discussion_learner.py record <discussion_file>")
        print('  python discussion_learner.py recommend "<topic>" [model1 model2 ...]')
        print("  python discussion_learner.py report")
        sys.exit(1)

    command = sys.argv[1]
    learner = DiscussionHistoryLearner()

    if command == "record":
        if len(sys.argv) < 3:
            print("議論ファイルパスを指定してください")
            sys.exit(1)

        discussion_file = Path(sys.argv[2])
        if not discussion_file.exists():
            print(f"ファイルが見つかりません: {discussion_file}")
            sys.exit(1)

        print("議論データを記録中...")
        with open(discussion_file, "r", encoding="utf-8") as f:
            discussion_data = json.load(f)

        learner.record_discussion(discussion_data)
        print("議論データを学習しました")

    elif command == "recommend":
        if len(sys.argv) < 3:
            print("トピックを指定してください")
            sys.exit(1)

        topic = sys.argv[2]
        available_models = (
            sys.argv[3:]
            if len(sys.argv) > 3
            else ["Big-Pickle", "GLM-4.7", "MiniMax-M2.1", "Grok-Code-Fast-1"]
        )

        print(f"=== 学習ベース推奨システム ===")
        print(f"トピック: {topic}")
        print(f"利用可能モデル: {available_models}")
        print()

        recommendations = learner.get_recommendations(topic, available_models)

        print("--- 推奨モデル ---")
        for i, model in enumerate(recommendations["suggested_models"], 1):
            print(f"{i}. {model}")

        print()
        print(f"期待品質スコア: {recommendations['expected_quality']:.2f}")

        if recommendations["learning_based_insights"]:
            print()
            print("--- 学習に基づく洞察 ---")
            for insight in recommendations["learning_based_insights"]:
                print(f"• {insight}")

    elif command == "report":
        print("=== 学習レポート ===")

        report = learner.generate_learning_report()

        print("学習サマリー:")
        summary = report["learning_summary"]
        for key, value in summary.items():
            print(f"  {key}: {value}")

        print()
        print("パフォーマンス洞察:")
        for key, value in report["performance_insights"].items():
            print(f"  {key}: {value}")

        print()
        print("品質洞察:")
        for key, value in report["quality_insights"].items():
            print(f"  {key}: {value}")

        print()
        print("改善提案:")
        for i, suggestion in enumerate(report["recommendations"], 1):
            print(f"  {i}. {suggestion}")

    else:
        print(f"不明なコマンド: {command}")


if __name__ == "__main__":
    main()
