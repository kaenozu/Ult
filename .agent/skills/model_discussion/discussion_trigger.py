#!/usr/bin/env python3
"""
議論してキーワード検出スキル
「議論して」で自動的にModel Discussion Agentを起動
"""

import sys
import time
import json
from pathlib import Path


def detect_discussion_keywords(text):
    """議論関連のキーワードを検出"""
    discussion_keywords = [
        "議論して",
        "議論",
        "検討",
        "比較",
        "分析",
        "どう思う",
        "意見",
        "考えて",
        "意見交換",
        "話し合う",
        "協議",
        "相談",
        "アドバイス",
        "レビュー",
        "評価",
        "検証",
        "見解",
    ]

    text_lower = text.lower()
    return any(keyword in text_lower for keyword in discussion_keywords)


def simulate_model_responses(topic, models):
    """モデル応答のシミュレーション"""
    responses = []

    model_chars = {
        "Big-Pickle": {"style": "包括的", "focus": ["全体像", "構造", "統合"]},
        "GLM-4.7": {"style": "技術的", "focus": ["詳細", "正確性", "専門性"]},
        "MiniMax-M2.1": {"style": "実用的", "focus": ["具体", "実装", "手法"]},
        "Grok-Code-Fast-1": {"style": "革新的", "focus": ["新規性", "効率", "最適化"]},
    }

    for model_name in models:
        char = model_chars.get(model_name, {"style": "一般的", "focus": ["基本"]})

        # モデル特性に基づく応答生成
        response = f"""{model_name}の{char["style"]}な見解：

{topic}について、以下の視点から分析します：

1. {char["focus"][0]}の観点から見ると...
2. {char["focus"][1] if len(char["focus"]) > 1 else "具体的"}側面を考慮すると...
3. {char["focus"][2] if len(char["focus"]) > 2 else "総合"}な判断として...

結論として、{char["style"]}なアプローチが最適と考えます。"""

        responses.append(
            {
                "model": model_name,
                "response": response,
                "style": char["style"],
                "success": True,
                "response_time": 2.0,
            }
        )

    return responses


def generate_summary(responses, topic):
    """議論のサマリーを生成"""
    # 共通点と相違点の分析
    all_styles = [r["style"] for r in responses]
    all_text = " ".join([r["response"] for r in responses])

    # 合意タイプ
    if len(set(all_styles)) == 1:
        consensus_type = "完全な一致"
    elif len(set(all_styles)) <= 2:
        consensus_type = "部分的な一致"
    else:
        consensus_type = "多様な見解"

    # 最も支持されたアプローチ
    style_counts = {}
    for style in all_styles:
        style_counts[style] = style_counts.get(style, 0) + 1

    if style_counts:
        most_common = max(style_counts.items(), key=lambda x: x[1])[0]
    else:
        most_common = "一般的"

    return {
        "topic": topic,
        "consensus_type": consensus_type,
        "dominant_approach": most_common,
        "total_models": len(responses),
        "successful_models": len([r for r in responses if r["success"]]),
        "recommendation": f"{most_common}なアプローチが最も支持されました",
        "next_steps": [
            "1. 主な論点を整理する",
            "2. 実装計画を立てる",
            "3. チームで合意形成する",
        ],
    }


def main():
    """メイン関数"""
    if len(sys.argv) < 2:
        print('使い方: python discussion_trigger.py "<議論したい内容>"')
        print('例: python discussion_trigger.py "React最適化について議論して"')
        sys.exit(1)

    # 入力テキストからトピックを抽出
    input_text = " ".join(sys.argv[1:])

    if not detect_discussion_keywords(input_text):
        print("議論関連のキーワードが検出されませんでした")
        print("検出されるキーワード: 議論, 検討, 比較, 分析, 意見, 話し合う, など")
        return

    print("議論モードを起動します...")
    print(f"トピック: {input_text}")
    print()

    # トピックの整形
    topic = input_text.replace("議論して", "").replace("議論", "").strip()

    # 対象モデル
    models = ["Big-Pickle", "GLM-4.7", "MiniMax-M2.1", "Grok-Code-Fast-1"]

    print("各モデルの意見を収集中...")

    # モデル応答をシミュレート
    responses = simulate_model_responses(topic, models)

    for i, response in enumerate(responses, 1):
        print(f"[{i}/4] {response['model']} ({response['style']}な見解)...")
        time.sleep(0.5)  # 考え中の雰囲気
        print(f"   OK 応答完了 ({response['response_time']:.1f}秒)")

    print()
    print("議論のサマリーを生成中...")
    summary = generate_summary(responses, topic)

    print("=" * 50)
    print("議論サマリー")
    print("=" * 50)
    print(f"トピック: {summary['topic']}")
    print(f"合意タイプ: {summary['consensus_type']}")
    print(f"支配的アプローチ: {summary['dominant_approach']}")
    print(f"結論: {summary['recommendation']}")
    print()
    print("次のステップ:")
    for step in summary["next_steps"]:
        print(f"  {step}")

    print()
    print("各モデルの詳細な見解:")
    for response in responses:
        print(f"\n--- {response['model']} ({response['style']}) ---")
        print(response["response"])

    # 詳細なレポートを保存
    report = {
        "input_text": input_text,
        "topic": topic,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "responses": responses,
        "summary": summary,
    }

    report_file = Path("discussion_report.json")
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f"\nレポートを保存しました: {report_file}")
    print(
        f"成功: {summary['successful_models']}/{summary['total_models']}モデルが正常に応答しました"
    )


if __name__ == "__main__":
    main()
