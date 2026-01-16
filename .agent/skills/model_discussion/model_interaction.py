#!/usr/bin/env python3
"""
モデル間の対話システム
複数のAIモデルが相互に対話しながら議論を深める機能
"""

import sys
import time
import json
import random
from pathlib import Path


class ModelInteractionSystem:
    """モデル間対話システム"""

    def __init__(self):
        # モデル特性定義
        self.model_profiles = {
            "Big-Pickle": {
                "personality": "保守的・包括的",
                "communication_style": "丁寧で体系的",
                "interaction_pattern": "まとめ役",
                "strength_focus": "全体像の把握",
            },
            "GLM-4.7": {
                "personality": "技術的・厳密",
                "communication_style": "論理的で詳細",
                "interaction_pattern": "検証役",
                "strength_focus": "正確性の確保",
            },
            "MiniMax-M2.1": {
                "personality": "実用的・直接的",
                "communication_style": "率直で具体的",
                "interaction_pattern": "実行役",
                "strength_focus": "実装可能性",
            },
            "Grok-Code-Fast-1": {
                "personality": "革新的・進歩的",
                "communication_style": "創造的で大胆",
                "interaction_pattern": "提案役",
                "strength_focus": "新しい視点",
            },
        }

    def generate_interaction_sequence(self, topic: str, models: list) -> dict:
        """対話シーケンスの生成"""
        sequence = []
        used_models = []

        # 各モデルの役割割り当て
        roles = {
            "initiator": models[0],  # 議論開始
            "supporter": models[1] if len(models) > 1 else None,  # 支援
            "critic": models[2] if len(models) > 2 else None,  # 批判・検証
            "synthesizer": models[3] if len(models) > 3 else models[0],  # まとめ
        }

        # 対話シーケンスの構築
        step_counter = 1

        # ステップ1: 議論開始
        sequence.append(
            {
                "step": step_counter,
                "speaker": roles["initiator"],
                "role": "initiator",
                "action": "議論を開始し、基本的な立場を述べる",
                "prompt_template": f"{topic}についての意見を述べ、議論の枠組みを提案してください。",
                "expected_response": "基本的な立場と議論の方向性",
            }
        )
        used_models.append(roles["initiator"])
        step_counter += 1

        # ステップ2: 支援・補完
        if roles["supporter"]:
            sequence.append(
                {
                    "step": step_counter,
                    "speaker": roles["supporter"],
                    "role": "supporter",
                    "action": "最初の意見を補完し、追加の視点を提供",
                    "prompt_template": f"先ほどの意見に対して、補完的な視点を提案してください。強みと弱みを分析してください。",
                    "expected_response": "補完的な分析とバランスの取れた視点",
                }
            )
            used_models.append(roles["supporter"])
            step_counter += 1

        # ステップ3: 批判・検証
        if roles["critic"]:
            sequence.append(
                {
                    "step": step_counter,
                    "speaker": roles["critic"],
                    "role": "critic",
                    "action": "提案されたアイデアを批判的に検証",
                    "prompt_template": f"これまでの議論を批判的に検証してください。潜在的な問題点やリスクを指摘してください。",
                    "expected_response": "批判的分析とリスク評価",
                }
            )
            used_models.append(roles["critic"])
            step_counter += 1

        # ステップ4: まとめ・統合
        synthesizer = roles["synthesizer"]
        if synthesizer not in used_models:
            sequence.append(
                {
                    "step": step_counter,
                    "speaker": synthesizer,
                    "role": "synthesizer",
                    "action": "議論をまとめ、統合的な結論を導く",
                    "prompt_template": f"これまでの議論をまとめ、統合的な結論を導き出してください。実用的で実行可能な提案を優先してください。",
                    "expected_response": "統合的な結論と実行可能な提案",
                }
            )
        else:
            # 既に使用済みの場合は別の役割
            sequence.append(
                {
                    "step": step_counter,
                    "speaker": synthesizer,
                    "role": "synthesizer",
                    "action": "最終的な立場を明確にし、結論を述べる",
                    "prompt_template": f"これまでの議論を踏まえ、最終的な立場を明確にしてください。",
                    "expected_response": "最終的な結論と立場",
                }
            )

        return {
            "topic": topic,
            "models": models,
            "roles": roles,
            "sequence": sequence,
            "total_steps": len(sequence),
            "estimated_duration": len(sequence) * 15,  # 各ステップ15秒と仮定
        }

    def simulate_interaction(self, interaction_plan: dict) -> dict:
        """対話シミュレーション"""
        results = []
        discussion_history = []

        print(f"=== モデル間対話シミュレーション ===")
        print(f"トピック: {interaction_plan['topic']}")
        print(f"参加モデル: {', '.join(interaction_plan['models'])}")
        print()

        for step in interaction_plan["sequence"]:
            print(f"【ステップ {step['step']}】 {step['speaker']} ({step['role']})")
            print(f"役割: {step['action']}")

            # 対話履歴を考慮した応答生成
            response = self.generate_simulated_response(
                step["speaker"],
                step["prompt_template"],
                discussion_history,
                step["role"],
            )

            print(f"応答: {response['content'][:100]}...")
            print(f"感情: {response['sentiment']}, 確信度: {response['confidence']}")
            print()

            # 履歴に追加
            discussion_history.append(
                {
                    "step": step["step"],
                    "speaker": step["speaker"],
                    "role": step["role"],
                    "response": response["content"],
                }
            )

            results.append(
                {
                    "step": step["step"],
                    "speaker": step["speaker"],
                    "role": step["role"],
                    "response": response,
                }
            )

        # 対話の分析
        analysis = self.analyze_interaction_results(results, discussion_history)

        return {
            "interaction_plan": interaction_plan,
            "results": results,
            "discussion_history": discussion_history,
            "analysis": analysis,
        }

    def generate_simulated_response(
        self, model_name: str, prompt: str, history: list, role: str
    ) -> dict:
        """シミュレートされたモデル応答生成"""
        profile = self.model_profiles[model_name]

        # 役割に応じた応答パターン
        response_patterns = {
            "initiator": [
                f"{profile['communication_style']}に、{prompt}について考えます。まず基本的な立場を明確にしましょう。",
                f"この{profile['personality']}な視点から、{prompt}を分析します。",
            ],
            "supporter": [
                f"先ほどの意見に補足すると、{profile['strength_focus']}の観点から重要な点を指摘します。",
                f"バランスを取るために、{profile['interaction_pattern']}として追加の視点を提供します。",
            ],
            "critic": [
                f"批判的に検証すると、{profile['strength_focus']}の観点から潜在的な問題があります。",
                f"リスクを考慮すると、{profile['communication_style']}な分析が必要です。",
            ],
            "synthesizer": [
                f"これまでの議論を{profile['interaction_pattern']}としてまとめると...",
                f"{profile['strength_focus']}を重視して統合的な結論を導きます。",
            ],
        }

        # ランダムにパターンを選択
        patterns = response_patterns.get(role, ["一般的な応答を生成します。"])
        base_response = random.choice(patterns)

        # 履歴を考慮した拡張
        if history:
            base_response += " これまでの議論を踏まえて、"

        # 感情と確信度の設定
        sentiment_options = ["positive", "neutral", "critical", "supportive"]
        sentiment = random.choice(sentiment_options)

        confidence = random.uniform(0.6, 0.95)  # 60-95%の確信度

        # 応答の詳細化
        detailed_response = (
            base_response
            + f" {profile['personality']}な立場から、具体的な提案を述べます。"
        )

        return {
            "content": detailed_response,
            "sentiment": sentiment,
            "confidence": round(confidence, 2),
            "model_profile": profile,
        }

    def analyze_interaction_results(self, results: list, history: list) -> dict:
        """対話結果の分析"""
        analysis = {
            "total_steps": len(results),
            "participating_models": list(set(r["speaker"] for r in results)),
            "sentiment_distribution": {},
            "confidence_average": 0,
            "interaction_quality": "unknown",
            "key_insights": [],
            "consensus_level": "unknown",
        }

        # 感情分布の分析
        sentiments = [r["response"]["sentiment"] for r in results]
        for sentiment in sentiments:
            analysis["sentiment_distribution"][sentiment] = (
                analysis["sentiment_distribution"].get(sentiment, 0) + 1
            )

        # 平均確信度の計算
        confidences = [r["response"]["confidence"] for r in results]
        analysis["confidence_average"] = (
            round(sum(confidences) / len(confidences), 2) if confidences else 0
        )

        # 対話品質の評価
        if analysis["confidence_average"] > 0.8 and len(set(sentiments)) > 1:
            analysis["interaction_quality"] = "high"
        elif analysis["confidence_average"] > 0.6:
            analysis["interaction_quality"] = "medium"
        else:
            analysis["interaction_quality"] = "low"

        # 主要な洞察の抽出
        analysis["key_insights"] = [
            "多角的な視点からの議論が可能になった",
            "各モデルの強みが補完し合った",
            "批判的検証により品質が向上した",
            "統合的な結論が導かれた",
        ]

        # 合意レベルの評価
        positive_sentiments = analysis["sentiment_distribution"].get(
            "positive", 0
        ) + analysis["sentiment_distribution"].get("supportive", 0)
        total_sentiments = sum(analysis["sentiment_distribution"].values())

        if positive_sentiments / total_sentiments > 0.7:
            analysis["consensus_level"] = "high"
        elif positive_sentiments / total_sentiments > 0.4:
            analysis["consensus_level"] = "medium"
        else:
            analysis["consensus_level"] = "low"

        return analysis


def main():
    """メイン関数"""
    if len(sys.argv) < 2:
        print('使い方: python model_interaction.py "<トピック>" [モデル1 モデル2 ...]')
        print(
            '例: python model_interaction.py "AIの倫理的課題" "Big-Pickle" "GLM-4.7" "MiniMax-M2.1"'
        )
        sys.exit(1)

    topic = sys.argv[1]
    models = (
        sys.argv[2:] if len(sys.argv) > 2 else ["Big-Pickle", "GLM-4.7", "MiniMax-M2.1"]
    )

    system = ModelInteractionSystem()

    print("=== モデル間対話システム ===")
    print(f"トピック: {topic}")
    print(f"参加モデル: {models}")
    print()

    # 対話シーケンス生成
    interaction_plan = system.generate_interaction_sequence(topic, models)

    print("--- 対話計画 ---")
    print(f"総ステップ数: {interaction_plan['total_steps']}")
    print(f"推定所要時間: {interaction_plan['estimated_duration']}秒")
    print()

    print("役割割り当て:")
    for role, model in interaction_plan["roles"].items():
        if model:
            print(f"  {role}: {model}")
    print()

    print("対話シーケンス:")
    for step in interaction_plan["sequence"]:
        print(f"  ステップ{step['step']}: {step['speaker']} - {step['action']}")
        print(f"    期待応答: {step['expected_response']}")
    print()

    # 対話シミュレーション
    print("--- 対話シミュレーション実行 ---")
    interaction_result = system.simulate_interaction(interaction_plan)

    print("--- 対話分析結果 ---")
    analysis = interaction_result["analysis"]
    print(f"対話品質: {analysis['interaction_quality']}")
    print(f"平均確信度: {analysis['confidence_average']}")
    print(f"合意レベル: {analysis['consensus_level']}")
    print()

    print("感情分布:")
    for sentiment, count in analysis["sentiment_distribution"].items():
        print(f"  {sentiment}: {count}件")
    print()

    print("主要な洞察:")
    for i, insight in enumerate(analysis["key_insights"], 1):
        print(f"  {i}. {insight}")

    # 結果保存
    result_file = Path("model_interaction_result.json")
    with open(result_file, "w", encoding="utf-8") as f:
        json.dump(interaction_result, f, ensure_ascii=False, indent=2)

    print(f"\n結果を保存しました: {result_file}")


if __name__ == "__main__":
    main()
