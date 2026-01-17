#!/usr/bin/env python3
"""
Demo: Simulated Qwen Command Meeting about Japan's Capital
"""

import json
import time
from datetime import datetime
from pathlib import Path


class MockQwenMeeting:
    """Mock meeting simulator for demonstration."""

    def __init__(self, topic: str, duration: int = 10):
        self.topic = topic
        self.duration = duration
        self.start_time = datetime.now()
        self.messages = []

    def add_message(self, role: str, content: str, speaker: str = None):
        """Add a message to transcript."""
        message = {
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat(),
            "speaker": speaker or role,
        }
        self.messages.append(message)

    def simulate_qwen_response(self, user_input: str) -> str:
        """Simulate Qwen response based on user input."""
        if "首都" in user_input or "shuto" in user_input:
            return """日本の首都である東京について、いくつかの重要な側面があります：

1. **歴史的背景**: 1868年の明治維新により、京都から東京（当時は江戸）へ遷都されました。この決定は、近代化の推進と国際的な開国を目指す明治政府の戦略的な選択でした。

2. **経済的重要性**: 東京は日本のGDPの約30%を占め、世界有数の経済都市です。金融、商業、文化の中心地として機能しています。

3. **政治機能**: 国会、内閣、最高裁判所など、日本の三権が全て集中しており、政治の中枢を担っています。

皆さんは東京の首都機能について、どのようなご意見がありますか？特に交通インフラや防災面について議論できます。"""

        elif "交通" in user_input or "kotsu" in user_input:
            return """東京の交通インフラについて、以下の特徴があります：

1. **世界最高水準の鉄道網**: JR、私鉄、地下鉄が複雑に連携し、1日約800万人が利用します。特に山手線は都心の重要な環状線として機能しています。

2. **空の玄関**: 成田・羽田の2大国際空港を持ち、アジアのハブ空港として重要な役割を果たしています。

3. **課題**: 通勤ラッシュの混雑、都市部の渋滞、アクセシビリティの向上など、改善の余地も多くあります。

防災面では、大規模地震に備えたインフラ強化が進んでいます。このような都市機能について、皆様はどのようにお考えですか？"""

        elif "大阪" in user_input or "osaka" in user_input:
            return """大阪を副首都または候補地とする議論は、日本にとって重要なテーマです：

**大阪の強み**:
- 関西経済の中心地であり、経済規模は東京都に次ぐ第2位
- 関西国際空港を持ち、国際的なハブ機能
- 独自の文化・経済圏を形成

**首都機能移転のメリット**:
- リスク分散（首都直下地震への備え）
- 地域均衡発展
- 新しい都市モデルの構築

**課題**:
- 莫大な移転コスト
- 機能分散の難しさ
- 国際社会への影響

このような首都機能の分散について、皆様のご意見をお聞かせください。"""

        else:
            return f"""「{user_input}」について、興味深い視点ですね。

日本の首都機能については、歴史、経済、政治、文化、防災など多角的な検討が必要です。

特に以下の点について議論を深めることができます：
- 首都機能の最適配置
- 地方創生との関係
- 緊急時の代替拠点
- デジタル化によるリモート統治

他にどのような側面について議論したいですか？"""

    def start_meeting(self):
        """Start simulated meeting."""
        print(f"\n{'=' * 60}")
        print(f"Qwen Command Meeting Agent - {self.topic}")
        print(f"{'=' * 60}")
        print(f"\nMeeting: {self.topic}")
        print(f"Duration: {self.duration} minutes")
        print(f"Mode: Simulation (qwen command demo)")

        # Opening message
        opening = """皆様、こんにちは。本日は「日本の首都について」議論させていただきます。

日本の首都東京は、単なる政治の中心地だけでなく、経済、文化、イノベーションのハブとして機能しています。しかし、首都一極集中には課題もあり、近年では地方創生や防災の観点から首都機能の分散も議論されています。

本日の議論では、以下の点について考察したいと思います：
1. 東京の首都としての役割と課題
2. 首都機能分散の可能性と課題
3. 地方都市との連携強化
4. デジタル時代の新しい首都像

皆様のご意見をお聞かせください。まず、東京の首都機能についてどのようにお考えですか？"""

        print(f"\nQwen AI:")
        print(f"{opening}")
        self.add_message("assistant", opening, "Qwen AI")

        return opening

    def run_simulation(self):
        """Run interactive simulation."""
        self.start_meeting()

        # Simulate some rounds of discussion
        sample_inputs = [
            "東京の首都機能について詳しく教えてください",
            "交通インフラの課題はありますか？",
            "大阪を副首都とする意見についてどう思いますか？",
        ]

        print(f"\n{len(sample_inputs)}回の模擬対話を実行します...\n")

        for i, user_input in enumerate(sample_inputs, 1):
            print(f"--- Round {i} ---")
            print(f"User: {user_input}")
            self.add_message("user", user_input, "User")

            time.sleep(1)  # Simulate thinking time

            response = self.simulate_qwen_response(user_input)
            print(f"\nQwen AI:")
            print(f"{response}\n")
            self.add_message("assistant", response, "Qwen AI")

            time.sleep(2)  # Pause between exchanges

        # Closing remarks
        closing = """本日は「日本の首都について」活発な議論をいただき、ありがとうございました。

議論のまとめとして、以下の重要な点が確認できました：

1. **東京の重要性**: 政治・経済・文化の中心として不可欠な役割
2. **課題の認識**: 首都一極集中によるリスクと機会不均等
3. **解決策の模索**: 機能分散、デジタル化、地域連携の方向性
4. **未来展望**: 柔軟でレジリエントな首都像の構築

この議論を通じて、日本の持続可能な発展には、従来の首都概念を見直し、より分散的で災害に強い統治体制を構築する必要性があることが分かりました。

今後も様々な視点からこの重要テーマを議論し続けることが重要だと考えています。

皆様、貴重なご意見ありがとうございました。今後の日本の発展に向けて、今日の議論を活かさせていただきます。"""

        print(f"Qwen AI - Closing Remarks:")
        print(f"{closing}")
        self.add_message("assistant", closing, "Qwen AI")

        # Save transcript
        self.save_transcript()

    def save_transcript(self):
        """Save meeting transcript."""
        timestamp_str = self.start_time.strftime("%Y%m%d_%H%M%S")
        filename = f"japan_capital_meeting_{timestamp_str}.json"
        filepath = Path("meeting_transcripts") / filename
        filepath.parent.mkdir(exist_ok=True)

        transcript_data = {
            "meeting_config": {
                "topic": self.topic,
                "duration_minutes": self.duration,
                "language": "ja",
                "mode": "simulation",
            },
            "start_time": self.start_time.isoformat(),
            "end_time": datetime.now().isoformat(),
            "messages": self.messages,
        }

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(transcript_data, f, ensure_ascii=False, indent=2)

        print(f"\nMeeting transcript saved to: {filepath}")


def main():
    """Run demo meeting."""
    print("日本の首都について議論する模擬会議を開始します...")

    meeting = MockQwenMeeting("日本の首都についての議論", duration=10)
    meeting.run_simulation()

    print("\n模擬会議が完了しました。")
    print("実際のqwenコマンドをインストールすると、リアルタイムで対話できます。")
    print("   インストール: pip install qwen")


if __name__ == "__main__":
    main()
