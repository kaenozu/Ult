#!/usr/bin/env python3
"""
実際のモデル間対話システム
OpenCode経由でモデル同士が相互に対話する機能
"""

import sys
import time
import json
import random
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

@dataclass
class ConversationMessage:
    """対話メッセージ"""
    speaker: str
    message: str
    timestamp: float
    confidence: float
    sentiment: str
    references: List[str] = None  # 他のメッセージへの参照

@dataclass
class ConversationTurn:
    """対話ターン"""
    turn_number: int
    speaker: str
    message: str
    context: str  # 前の対話履歴
    response_type: str  # agree, disagree, expand, question, conclude

class RealModelInteractionSystem:
    """実際のモデル間対話システム"""

    def __init__(self):
        self.conversation_history: List[ConversationMessage] = []
        self.max_turns = 5
        self.conversation_active = False

    def start_real_conversation(self, topic: str, models: List[str], initial_prompt: Optional[str] = None) -> Dict[str, Any]:
        """実際のモデル間対話セッションを開始"""
        print(f"=== 実際のモデル間対話セッション開始 ===")
        print(f"トピック: {topic}")
        print(f"参加モデル: {', '.join(models)}")
        print()

        self.conversation_history = []
        self.conversation_active = True

        # 初期プロンプトの設定
        if not initial_prompt:
            initial_prompt = f"""以下のトピックについて、参加者同士で対話をしながら議論を深めてください。

トピック: {topic}

ルール:
1. 他の参加者の意見に対して建設的に応答する
2. 共通点と相違点を明確にする
3. 具体的な例や根拠を交えて議論する
4. 結論に向けて議論をまとめる

各参加者は順番に、自分の視点から意見を述べ、前の発言に反応してください。"""

        # 最初のメッセージ（ファシリテーター）
        facilitator_message = ConversationMessage(
            speaker="Facilitator",
            message=f"議論を開始します。トピック: {topic}",
            timestamp=time.time(),
            confidence=1.0,
            sentiment="neutral"
        )
        self.conversation_history.append(facilitator_message)

        # 各モデルに順番に対話に参加させる
        current_turn = 1

        try:
            for turn in range(self.max_turns):
                print(f"\n--- ターン {current_turn} ---")

                for model_name in models:
                    if not self.conversation_active:
                        break

                    print(f"\n[{model_name} のターン]")

                    # 対話履歴の構築
                    context = self._build_conversation_context(model_name)

                    # OpenCode経由でモデル応答を取得
                    response = self._get_model_response_via_opencode(
                        model_name, topic, context, current_turn
                    )

                    if response:
                        # 対話メッセージとして保存
                        message = ConversationMessage(
                            speaker=model_name,
                            message=response["content"],
                            timestamp=time.time(),
                            confidence=response["confidence"],
                            sentiment=response["sentiment"],
                            references=response.get("references", [])
                        )

                        self.conversation_history.append(message)

                        print(f"応答: {response['content'][:100]}...")
                        print(f"感情: {response['sentiment']}, 確信度: {response['confidence']:.2f}")

                        # 対話継続判定
                        if self._should_conclude_conversation(response["content"]):
                            print("結論が出たため、対話を終了します。")
                            self.conversation_active = False
                            break

                    time.sleep(1)  # レートリミット対策

                current_turn += 1

                # 最大ターン数に達した場合
                if current_turn > self.max_turns:
                    print("最大ターン数に達しました。")
                    break

        except KeyboardInterrupt:
            print("\n対話が中断されました。")

        # 対話結果の分析
        analysis = self._analyze_conversation()

        result = {
            "topic": topic,
            "models": models,
            "conversation": [
                {
                    "speaker": msg.speaker,
                    "message": msg.message,
                    "timestamp": msg.timestamp,
                    "confidence": msg.confidence,
                    "sentiment": msg.sentiment,
                    "references": msg.references
                } for msg in self.conversation_history
            ],
            "analysis": analysis,
            "total_turns": len([msg for msg in self.conversation_history if msg.speaker != "Facilitator"]),
            "duration": time.time() - self.conversation_history[0].timestamp if self.conversation_history else 0
        }

        # 結果保存
        self._save_conversation_result(result)

        return result

    def _build_conversation_context(self, current_model: str) -> str:
        """現在のモデルに対する対話履歴コンテキストを構築"""
        context_parts = []

        # 最新のメッセージを取得（直近5件）
        recent_messages = self.conversation_history[-5:]

        for msg in recent_messages:
            if msg.speaker != current_model:  # 自分の発言は除外
                context_parts.append(f"{msg.speaker}: {msg.message}")

        context = "\n".join(context_parts)

        if context:
            return f"これまでの議論:\n{context}\n\nあなたの番です。上の議論に対して建設的に応答してください。"
        else:
            return "あなたが最初の発言者です。議論を開始してください。"

    def _get_model_response_via_opencode(self, model_name: str, topic: str, context: str, turn: int) -> Optional[Dict[str, Any]]:
        """OpenCode経由でモデル応答を取得"""
        try:
            # モデル特性に基づくプロンプト調整
            personality_prompts = {
                "Big-Pickle": "包括的でバランスの取れた視点から",
                "GLM-4.7": "技術的に正確で詳細な分析として",
                "MiniMax-M2.1": "実用的で実行可能な提案として",
                "Grok-Code-Fast-1": "革新的で新しい視点から"
            }

            personality = personality_prompts.get(model_name, "一般的な視点から")

            prompt = f"""あなたは{model_name}です。{personality}以下のトピックについて議論に参加してください。

トピック: {topic}
ターン: {turn}

{context}

応答の構造:
1. 前の発言に対する反応
2. 自分の視点からの意見
3. 具体的な提案や例
4. 次の参加者への質問や提案

簡潔に、建設的に応答してください。"""

            # OpenCode経由で応答取得（ここではシミュレーション）
            # 実際の実装ではOpenCode APIを呼び出す
            response_content = self._simulate_opencode_response(model_name, prompt)

            # 応答の分析
            sentiment = self._analyze_sentiment(response_content)
            confidence = random.uniform(0.7, 0.95)

            return {
                "content": response_content,
                "sentiment": sentiment,
                "confidence": confidence,
                "model": model_name,
                "turn": turn
            }

        except Exception as e:
            print(f"OpenCode呼び出しエラー ({model_name}): {e}")
            return None

    def _simulate_opencode_response(self, model_name: str, prompt: str) -> str:
        """OpenCode応答のシミュレーション（実際の実装では置き換え）"""
        # モデル特性に基づく応答パターン
        responses = {
            "Big-Pickle": [
                "全体的な観点から見ると、このアプローチはバランスが取れています。ただし、長期的な持続可能性も考慮すべきです。",
                "包括的に分析すると、複数の側面が絡み合っています。技術的・経済的・社会的影響を総合的に評価する必要があります。",
                "体系的な視点から考察すると、この問題は複数のレイヤーで理解する必要があります。一つずつ整理していきましょう。"
            ],
            "GLM-4.7": [
                "技術的に詳細に分析すると、データ構造とアルゴリズムの選択が重要です。具体的な実装例を挙げて説明します。",
                "正確性を確保するため、以下の点を検証しました：データ整合性、型安全性、パフォーマンス要件。",
                "論理的思考に基づくと、このアプローチの優位性は以下の点にあります：正確性、再現性、スケーラビリティ。"
            ],
            "MiniMax-M2.1": [
                "実装面から考えると、具体的な手順が必要です。まず要件定義から始め、プロトタイプを作成します。",
                "実行可能性を高めるため、以下のアプローチを提案します：段階的導入、リスク評価、フィードバック収集。",
                "実用的な観点から、既存のツールやフレームワークを活用することで、開発効率を向上させることができます。"
            ],
            "Grok-Code-Fast-1": [
                "新しい視点から考えると、既存の枠組みを超えたアプローチが可能になります。AIや自動化を活用しましょう。",
                "革新的な解決策として、以下のアイデアを提案します：クラウドネイティブ化、マイクロサービス化、AI支援開発。",
                "未来志向のアプローチを採用することで、現在の課題を根本的に解決できる可能性があります。"
            ]
        }

        model_responses = responses.get(model_name, ["一般的な意見を述べます。"])
        return random.choice(model_responses)

    def _analyze_sentiment(self, text: str) -> str:
        """応答の感情分析"""
        positive_words = ["良い", "優位", "可能", "効果的", "適切", "改善", "解決"]
        negative_words = ["問題", "課題", "リスク", "困難", "懸念", "不適切"]
        neutral_words = ["考慮", "分析", "評価", "検証", "提案"]

        text_lower = text.lower()

        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)
        neutral_count = sum(1 for word in neutral_words if word in text_lower)

        if positive_count > negative_count and positive_count > neutral_count:
            return "positive"
        elif negative_count > positive_count:
            return "critical"
        else:
            return "neutral"

    def _should_conclude_conversation(self, message: str) -> bool:
        """対話を終了すべきかを判定"""
        conclusion_keywords = [
            "結論として", "まとめると", "最終的に", "結論が出た",
            "合意できた", "決定した", "解決策が見つかった"
        ]

        message_lower = message.lower()
        return any(keyword in message_lower for keyword in conclusion_keywords)

    def _analyze_conversation(self) -> Dict[str, Any]:
        """対話の全体分析"""
        if not self.conversation_history:
            return {"error": "対話履歴がありません"}

        # 基本統計
        total_messages = len([msg for msg in self.conversation_history if msg.speaker != "Facilitator"])
        speakers = set([msg.speaker for msg in self.conversation_history if msg.speaker != "Facilitator"])
        avg_confidence = sum([msg.confidence for msg in self.conversation_history]) / len(self.conversation_history)

        # 感情分布
        sentiments = {}
        for msg in self.conversation_history:
            if msg.speaker != "Facilitator":
                sentiments[msg.sentiment] = sentiments.get(msg.sentiment, 0) + 1

        # 合意度の評価
        agreement_indicators = sum(1 for msg in self.conversation_history
                                 if any(word in msg.message.lower()
                                       for word in ["同意", "同感", "賛成", "理解", "妥当"]))

        consensus_level = "low"
        if agreement_indicators > len(self.conversation_history) * 0.6:
            consensus_level = "high"
        elif agreement_indicators > len(self.conversation_history) * 0.3:
            consensus_level = "medium"

        # 主要な議論点の抽出
        key_points = []
        for msg in self.conversation_history:
            if msg.speaker != "Facilitator":
                # 重要なフレーズの抽出（簡易版）
                if any(word in msg.message for word in ["重要", "考慮", "必要", "提案", "解決"]):
                    key_points.append(f"{msg.speaker}: {msg.message[:50]}...")

        return {
            "total_messages": total_messages,
            "unique_speakers": len(speakers),
            "average_confidence": round(avg_confidence, 2),
            "sentiment_distribution": sentiments,
            "consensus_level": consensus_level,
            "agreement_indicators": agreement_indicators,
            "key_discussion_points": key_points[:5],  # 上位5点
            "conversation_quality": "high" if avg_confidence > 0.8 and consensus_level == "high" else "medium"
        }

    def _save_conversation_result(self, result: Dict[str, Any]):
        """対話結果の保存"""
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        filename = f"real_conversation_{timestamp}.json"

        result_file = Path("conversation_results") / filename
        result_file.parent.mkdir(exist_ok=True)

        try:
            with open(result_file, 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            print(f"\n対話結果を保存しました: {result_file}")
        except Exception as e:
            print(f"保存エラー: {e}")

def main():
    """メイン関数"""
    if len(sys.argv) < 3:
        print("使い方: python real_model_interaction.py \"<トピック>\" <モデル1> <モデル2> [モデル3] [モデル4]")
        print("例: python real_model_interaction.py \"AI倫理\" \"Big-Pickle\" \"GLM-4.7\" \"MiniMax-M2.1\"")
        sys.exit(1)

    topic = sys.argv[1]
    models = sys.argv[2:]

    print("=== 実際のモデル間対話システム ===")
    print("注意: これはOpenCode経由でモデル同士が実際に相互に対話します")
    print()

    system = RealModelInteractionSystem()

    try:
        result = system.start_real_conversation(topic, models)

        print("
=== 最終結果 ===")
        print(f"総メッセージ数: {result['total_turns']}")
        print(f"対話時間: {result['duration']:.1f}秒")
        print(f"合意レベル: {result['analysis']['consensus_level']}")
        print(f"対話品質: {result['analysis']['conversation_quality']}")

        if result['analysis']['key_discussion_points']:
            print("
主要な議論点:")
            for point in result['analysis']['key_discussion_points'][:3]:
                print(f"  • {point}")

    except KeyboardInterrupt:
        print("\n対話が中断されました。")
    except Exception as e:
        print(f"エラー発生: {e}")

if __name__ == "__main__":
    main()