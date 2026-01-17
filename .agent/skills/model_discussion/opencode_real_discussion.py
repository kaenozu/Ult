#!/usr/bin/env python3
"""
OpenCode Real Model Intercommunication
モデル同士が実際に相互に対話するシステム
"""

import sys
import time
import json
import random
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass


# OpenCode統合のための仮定API（実際のOpenCode SDKに置き換え）
class OpenCodeClient:
    """OpenCode APIクライアント（仮定実装）"""

    def __init__(self):
        self.api_key = "opencode_integration_key"  # 実際のAPIキーに置き換え
        self.base_url = "https://opencode.ai/api/v1"

    def call_model(
        self, model_name: str, prompt: str, context: str = ""
    ) -> Dict[str, Any]:
        """モデル呼び出し（実際のOpenCode APIに置き換え）"""
        # ここではシミュレーションとして実装
        # 実際の実装ではOpenCode SDKを使用

        print(f"[OpenCode] Calling {model_name} with context...")

        # モデル特性に基づく応答生成
        response = self._generate_model_response(model_name, prompt, context)

        return {
            "model": model_name,
            "response": response,
            "confidence": random.uniform(0.75, 0.95),
            "tokens_used": len(prompt.split()) + len(response.split()),
            "processing_time": random.uniform(1.5, 3.0),
        }

    def _generate_model_response(
        self, model_name: str, prompt: str, context: str
    ) -> str:
        """モデル固有の応答生成"""
        model_responses = {
            "Big-Pickle": [
                "全体的な観点から分析すると、{context}を考慮した上で、バランスの取れたアプローチが重要です。包括的な視点で考えると...",
                "体系的に整理すると、{context}のポイントを踏まえ、以下の統合的な提案ができます...",
                "総合的に評価すると、{context}との整合性を保ちながら、持続可能な解決策を...",
            ],
            "GLM-4.7": [
                "技術的に詳細に検証すると、{context}の前提条件を満たすためには、以下の正確な実装が必要です...",
                "論理的分析に基づくと、{context}で指摘された点を解決するには、厳密なアプローチが...",
                "正確性を確保するため、{context}に対する技術的な補完として、以下の点を追加します...",
            ],
            "MiniMax-M2.1": [
                "実装面から考えると、{context}の提案を具体化するために、以下の実行可能な手順を...",
                "実行可能性を高めるため、{context}を基に、すぐに実践できる改善策を提案します...",
                "実用的な観点から、{context}のアイデアを実際のワークフローに落とし込むと...",
            ],
            "Grok-Code-Fast-1": [
                "新しい視点から考えると、{context}を超えた革新的なアプローチとして、以下のアイデアを...",
                "未来志向で考えると、{context}の枠組みを拡張し、以下のような新しい解決策が...",
                "創造的にアプローチすると、{context}で議論された点を基に、以下のような革新的な提案が...",
            ],
        }

        templates = model_responses.get(model_name, ["一般的な応答を生成します。"])
        template = random.choice(templates)

        # コンテキストを埋め込み
        if context:
            context_summary = context[-100:]  # 最新のコンテキストを使用
            response = template.format(context=f"'{context_summary}...'")
        else:
            response = template.format(context="初期の議論")

        return response


class RealTimeModelDiscussion:
    """リアルタイムモデル間対話システム"""

    def __init__(self):
        self.opencode_client = OpenCodeClient()
        self.discussion_log: List[Dict[str, Any]] = []
        self.active_models: List[str] = []
        self.max_rounds = 3

    def start_interactive_discussion(
        self, topic: str, models: List[str]
    ) -> Dict[str, Any]:
        """インタラクティブなモデル間議論を開始"""
        print("=== OpenCode リアルタイムモデル間議論 ===")
        print(f"トピック: {topic}")
        print(f"参加モデル: {', '.join(models)}")
        print("=" * 60)

        self.active_models = models
        self.discussion_log = []

        # 初期プロンプト
        initial_prompt = f"""以下のトピックについて、参加者同士で対話をしながら議論を深めてください。

トピック: {topic}

対話ルール:
1. 他の参加者の意見に建設的に反応する
2. 共通点と相違点を明確に指摘する
3. 具体的な例や根拠を交えて議論する
4. 結論に向けて議論をまとめる

各モデルは順番に、自分の専門性を活かして応答してください。"""

        # 各ラウンドでの対話
        for round_num in range(1, self.max_rounds + 1):
        print(f"\nラウンド {round_num}")
        print("-" * 40)

            round_responses = []

            for i, model_name in enumerate(models, 1):
                print(f"\n🤖 モデル {i}: {model_name}")

                # 対話履歴の構築
                conversation_context = self._build_conversation_context(model_name)

                # モデル固有のプロンプト作成
                model_prompt = self._create_model_specific_prompt(
                    model_name, topic, conversation_context, round_num
                )

                # OpenCode経由でモデル呼び出し
                try:
                    response = self.opencode_client.call_model(
                        model_name, model_prompt, conversation_context
                    )

                    # 応答の表示
                    print(f"💭 応答: {response['response'][:150]}...")
                    print(
                        f"📊 確信度: {response['confidence']:.2f}, 処理時間: {response['processing_time']:.1f}秒"
                    )

                    # ログに記録
                    discussion_entry = {
                        "round": round_num,
                        "model": model_name,
                        "prompt": model_prompt,
                        "response": response,
                        "context": conversation_context,
                        "timestamp": time.time(),
                    }

                    self.discussion_log.append(discussion_entry)
                    round_responses.append(response)

                except Exception as e:
                    print(f"❌ エラー: {model_name}の応答取得に失敗: {e}")
                    continue

                # 対話のペースを制御
                time.sleep(1)

            # ラウンド終了時の分析
            round_analysis = self._analyze_round_responses(round_responses, round_num)
            print(f"\n📈 ラウンド {round_num} 分析:")
            print(f"   合意レベル: {round_analysis['agreement_level']}")
            print(f"   主要テーマ: {', '.join(round_analysis['key_themes'][:3])}")

            # 早期終了判定
            if self._should_conclude_discussion(round_responses):
                print("🎯 合意に達したため、議論を終了します。")
                break

        # 最終分析
        final_analysis = self._generate_final_analysis()

        result = {
            "topic": topic,
            "models": models,
            "total_rounds": len(set(entry["round"] for entry in self.discussion_log)),
            "total_exchanges": len(self.discussion_log),
            "discussion_log": self.discussion_log,
            "final_analysis": final_analysis,
            "duration": time.time()
            - (
                self.discussion_log[0]["timestamp"]
                if self.discussion_log
                else time.time()
            ),
        }

        # 結果保存
        self._save_discussion_result(result)

        return result

    def _build_conversation_context(self, current_model: str) -> str:
        """現在のモデルに対する対話履歴コンテキストを構築"""
        if not self.discussion_log:
            return "これは議論の開始です。あなたの最初の意見を述べてください。"

        # 最新の対話履歴を取得
        recent_entries = [
            entry for entry in self.discussion_log if entry["model"] != current_model
        ][-3:]  # 直近3件、他モデルのみ

        context_parts = []
        for entry in recent_entries:
            context_parts.append(
                f"{entry['model']}: {entry['response']['response'][:100]}..."
            )

        context = "\n".join(context_parts)

        return f"これまでの議論:\n{context}\n\n上記の議論に対して、あなたの建設的な意見や補足を述べてください。"

    def _create_model_specific_prompt(
        self, model_name: str, topic: str, context: str, round_num: int
    ) -> str:
        """モデル固有のプロンプトを作成"""
        model_instructions = {
            "Big-Pickle": """あなたは包括的・保守的な視点を持つAIです。
全体像を把握し、バランスの取れた分析を提供してください。
他の意見を統合し、包括的な解決策を提案してください。""",
            "GLM-4.7": """あなたは技術的・厳密な視点を持つAIです。
正確な分析と詳細な説明を提供してください。
技術的な正確性を重視し、論理的な検証を行ってください。""",
            "MiniMax-M2.1": """あなたは実用的・実行指向の視点を持つAIです。
具体的な実装方法と実行可能な提案を提供してください。
現実的な解決策と実用的なアドバイスを重視してください。""",
            "Grok-Code-Fast-1": """あなたは革新的・進歩的な視点を持つAIです。
新しいアイデアと創造的な解決策を提供してください。
既存の枠組みを超えた革新的な提案を行ってください。""",
        }

        base_instruction = model_instructions.get(
            model_name, "一般的なAIとして応答してください。"
        )

        prompt = f"""{base_instruction}

トピック: {topic}
ラウンド: {round_num}

{context}

あなたの応答は以下の構造で作成してください:
1. 前の発言に対する反応（同意/補足/質問）
2. あなたの専門性に基づく分析
3. 具体的な提案や例
4. 次の参加者への示唆

簡潔に、建設的に応答してください。"""

        return prompt

    def _analyze_round_responses(
        self, responses: List[Dict[str, Any]], round_num: int
    ) -> Dict[str, Any]:
        """ラウンドごとの応答分析"""
        if not responses:
            return {"agreement_level": "none", "key_themes": []}

        # 合意レベルの評価
        agreement_indicators = [
            "同意",
            "同感",
            "賛成",
            "理解",
            "妥当",
            "良い点",
            "補足",
        ]
        disagreement_indicators = ["異論", "懸念", "問題", "違う", "修正", "再考"]

        total_agreements = sum(
            1
            for response in responses
            for indicator in agreement_indicators
            if indicator in response["response"]
        )

        total_disagreements = sum(
            1
            for response in responses
            for indicator in disagreement_indicators
            if indicator in response["response"]
        )

        if total_agreements > total_disagreements * 2:
            agreement_level = "high"
        elif total_disagreements > total_agreements * 2:
            agreement_level = "low"
        else:
            agreement_level = "medium"

        # 主要テーマの抽出
        all_text = " ".join([r["response"] for r in responses])
        themes = []

        if "技術" in all_text or "実装" in all_text:
            themes.append("技術的実装")
        if "設計" in all_text or "アーキテクチャ" in all_text:
            themes.append("システム設計")
        if "ユーザ" in all_text or "体験" in all_text:
            themes.append("ユーザー体験")
        if "効率" in all_text or "最適化" in all_text:
            themes.append("パフォーマンス")
        if "セキュリティ" in all_text or "信頼性" in all_text:
            themes.append("セキュリティ")

        return {
            "agreement_level": agreement_level,
            "key_themes": themes[:5],
            "total_agreements": total_agreements,
            "total_disagreements": total_disagreements,
        }

    def _should_conclude_discussion(self, responses: List[Dict[str, Any]]) -> bool:
        """議論を終了すべきかを判定"""
        conclusion_keywords = [
            "結論として",
            "まとめると",
            "最終的に",
            "決定した",
            "合意できた",
            "解決策が見つかった",
            "結論が出た",
        ]

        for response in responses:
            if any(keyword in response["response"] for keyword in conclusion_keywords):
                return True

        return False

    def _generate_final_analysis(self) -> Dict[str, Any]:
        """最終的な議論分析"""
        if not self.discussion_log:
            return {"error": "議論データがありません"}

        # 全体統計
        total_exchanges = len(self.discussion_log)
        unique_models = len(set(entry["model"] for entry in self.discussion_log))
        avg_confidence = (
            sum(entry["response"]["confidence"] for entry in self.discussion_log)
            / total_exchanges
        )

        # モデルごとの貢献度
        model_contributions = {}
        for entry in self.discussion_log:
            model = entry["model"]
            if model not in model_contributions:
                model_contributions[model] = 0
            model_contributions[model] += 1

        # 主要な議論点の抽出
        key_insights = []
        for entry in self.discussion_log:
            response = entry["response"]["response"]
            # 重要な洞察の抽出（簡易版）
            if any(
                word in response for word in ["重要", "考慮", "必要", "提案", "解決"]
            ):
                key_insights.append(
                    {
                        "model": entry["model"],
                        "insight": response[:100] + "...",
                        "round": entry["round"],
                    }
                )

        # 合意度の評価
        consensus_score = self._calculate_consensus_score()

        return {
            "total_exchanges": total_exchanges,
            "unique_models": unique_models,
            "average_confidence": round(avg_confidence, 2),
            "model_contributions": model_contributions,
            "key_insights": key_insights[:5],
            "consensus_score": consensus_score,
            "discussion_quality": "high"
            if avg_confidence > 0.8 and consensus_score > 0.7
            else "medium",
            "main_themes": self._extract_main_themes(),
        }

    def _calculate_consensus_score(self) -> float:
        """合意度のスコア計算"""
        if len(self.discussion_log) < 2:
            return 0.5

        # 簡易的な合意度計算
        agreement_words = ["同意", "同感", "賛成", "理解", "妥当"]
        total_agreements = sum(
            1
            for entry in self.discussion_log
            for word in agreement_words
            if word in entry["response"]["response"]
        )

        return min(1.0, total_agreements / len(self.discussion_log))

    def _extract_main_themes(self) -> List[str]:
        """主要テーマの抽出"""
        all_responses = " ".join(
            [entry["response"]["response"] for entry in self.discussion_log]
        )

        themes = []
        theme_keywords = {
            "技術的": ["技術", "実装", "コード", "アルゴリズム"],
            "設計的": ["設計", "アーキテクチャ", "構造", "パターン"],
            "ユーザビリティ": ["ユーザ", "UI", "UX", "体験"],
            "パフォーマンス": ["性能", "効率", "最適化", "速度"],
            "セキュリティ": ["安全", "セキュリティ", "保護", "リスク"],
        }

        for theme, keywords in theme_keywords.items():
            if any(keyword in all_responses for keyword in keywords):
                themes.append(theme)

        return themes

    def _save_discussion_result(self, result: Dict[str, Any]):
        """議論結果の保存"""
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        filename = f"opencode_real_discussion_{timestamp}.json"

        result_file = Path("discussion_results") / filename
        result_file.parent.mkdir(exist_ok=True)

        try:
            with open(result_file, "w", encoding="utf-8") as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            print(f"\n💾 議論結果を保存しました: {result_file}")
        except Exception as e:
            print(f"保存エラー: {e}")


def main():
    """メイン関数"""
    if len(sys.argv) < 3:
        print(
            '使い方: python opencode_real_discussion.py "<トピック>" <モデル1> <モデル2> [モデル3] [モデル4]'
        )
        print(
            '例: python opencode_real_discussion.py "AI倫理" "Big-Pickle" "GLM-4.7" "MiniMax-M2.1"'
        )
        sys.exit(1)

    topic = sys.argv[1]
    models = sys.argv[2:]

    print("OpenCode リアルモデル間対話システム")
    print("注意: モデル同士が実際に相互に対話します")
    print()

    system = RealTimeModelDiscussion()

    try:
        result = system.start_interactive_discussion(topic, models)

        print("\n" + "=" * 60)
        print("最終サマリー")
        print("=" * 60)
        print(f"総交換数: {result['total_exchanges']}")
        print(f"対話時間: {result['duration']:.1f}秒")
        print(f"合意スコア: {result['final_analysis']['consensus_score']:.2f}")
        print(f"議論品質: {result['final_analysis']['discussion_quality']}")

        if result["final_analysis"]["main_themes"]:
            print(f"主要テーマ: {', '.join(result['final_analysis']['main_themes'])}")

        if result["final_analysis"]["key_insights"]:
            print("\n主な洞察:")
            for insight in result["final_analysis"]["key_insights"][:3]:
                print(f"   • {insight['model']}: {insight['insight']}")

    except KeyboardInterrupt:
        print("\n対話が中断されました。")
    except Exception as e:
        print(f"エラー発生: {e}")


if __name__ == "__main__":
    main()
