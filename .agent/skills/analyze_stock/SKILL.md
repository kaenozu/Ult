---
name: analyze_stock
description: detailed technical and risk analysis of a specific stock ticker using Advanced Analytics.
---

# Analyze Stock (個別銘柄詳細分析)

指定された銘柄コード（Ticker）に対して、システムが持つ分析エンジン（LightGBM, Oracleなど）をフル稼働させ、詳細な診断レポートを出力します。
「なぜこのシグナルなのか？」「AIの確信度は？」といった疑問を解消するために使用します。

## 🚀 使い方 (Usage)

### Command
```bash
python backend/src/cli/analyze_ticker.py [Ticker]
```

### Example
```bash
python backend/src/cli/analyze_ticker.py 7203.T
```

## 📊 出力内容 (Output)
1.  **Data Health:** 取得できたデータ数（Data Starvationのチェック）。
2.  **Strategy Result:** 最終的なシグナル（BUY/SELL/HOLD）と確信度。
3.  **Black Box Peek:** モデルの「生」の予測確率（Raw Probability）。
4.  **Threshold Check:** 現在の基準値（Guardian Mode等）と、それを超えているかどうかの判定。

## 💡 いつ使うか？
*   「なんでこの銘柄は0%なんだ？」と思った時。
*   「本当に買っていいのか？」と不安になった時のセカンドオピニオンとして。
*   システムの健全性チェック（データが正しく流れているか）として。
