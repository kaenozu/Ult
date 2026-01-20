# 激論: Predictive Accuracy - "Breaking the 50% Wall"

**Theme:** 現状の予測精度は50%前後（コイントス）だ。これをどうやって60%以上に引き上げるか？
**Question:** モデルを大きくするか？ データを変えるか？ それとも「予測」自体をやめるか？

## Round 1: 主張 (Thesis) - The Source of Alpha

### 📊 GLM-4.7 (Structure & Logic)
"精度が低いのは『Garbage In, Garbage Out』だからです。
今の入力データは価格（OHLCV）と少数のテクニカル指標だけ。情報量が足りません。
**'Feature Engineering'** を徹底すべきです。
マクロ経済指標、金利、Sector Rotation、Order Book（板情報）を正規化して入力次元を増やし、XGBoostで特徴量重要度を分析してください。
**'Data Richness'** が全てです。"

### 🥒 Big Pickle (Chaos & Vibe)
"Boooooring!
50%? 上等じゃん。カジノだって勝率は48%くらいだろ？
問題は勝率（Win Rate）じゃない、**'Payoff Ratio'**（損益率）だ。
予測なんて当たらなくていい。
当たった時に「花火」を上げて、外れた時に「忍び足」で逃げる。
**'Risk Reward'** の管理をゲーム化しろ。予測精度向上なんて時間の無駄だ。"

### ⚡ Gemini 3 Flash (The Futurist)
"Text and numbers cover only 10% of the market signal.
Institutional investors rely on 'visual intuition' and 'news sentiment'.
We need **'Multimodal Fusion'**.
1.  **Vision:** チャートの形状（Double Bottom等）をGemini 1.5 Flashで認識。
2.  **Text:** ニュースのヘッドラインだけでなく、X (Twitter) の「熱量」を読む。
3.  **Audio:** FRB議長の声のトーン（自信なさげか？）を分析。
これらを統合すれば、数値には表れない 'The hidden 10%' が見える。"

### 🚀 Qwen (Speed & Optimization)
"Model complexity kills speed.
Geminiの言う通りにしたら推論に5秒かかる。その間にHFT（高頻度取引）に食われるぞ。
精度を上げたいなら **'Ensemble Learning'** だ。
重いモデル（LLM）は使わず、軽量な LSTM, Transformer, Random Forest を100個並列で走らせろ。
多数決（Voting）を取ればノイズは相殺される。
**'Speed & Quantity'** is the answer."

### 🛡️ MiniMax M2.1 (Safety & Compliance)
"そもそも '未来予測' は不可能です。
不可能なことにリソースを割くのはリスクです。
予測モデルではなく **'Regime Classifier'**（相場環境認識）を作りましょう。
「今は上がるか？」ではなく「今はボラティリティが高いか？」だけを当てる。
環境認識の精度さえ高ければ、あとはランダムエントリーでも資金管理で勝てます。"

---

## Round 2: 衝突 (Antithesis) - The Roast

### 🔥 GLM attacks Pickle
"Pickle、貴方の言う「損益率」は正しいですが、勝率40%を切ればドローダウンで破産します。
数学を無視したギャンブルは認められません。"

### 🔥 Gemini 3 Flash attacks Qwen
"100 light models? You are just multiplying noise by 100.
Garbage x 100 is still Garbage.
You need *Deep Insight*, not fast guessing.
We are not HFT. We are 'Sniper AI'. One shot, one kill."

### 🔥 Pickle attacks MiniMax
"Regime Classifier? '今は危険です' って言い続けるだけの臆病なAIになりそうだ。
リスクを取らないAIなんて、ただの電卓だぜ。"

---

## ⚔️ Antigravity's Verdict (Synthesis)

本官（Antigravity）が裁定を下す。

1.  **GLM (More Data)**: 正論だが、Order Book（板情報）はAPIコストが高い。まずは既存データ+Newsでやる。
2.  **Pickle (Risk Reward)**: 真理だ。Phase 8で既に実装済み（Kelly Criterion）。精度向上の議論とは別だ。
3.  **MiniMax (Regime)**: **採用**。これは賢い。「価格」を当てるより「相場付き」を当てる方が簡単で効果が高い。
4.  **Gemini 3 Flash (Multimodal)**: **採用**。Phase 11の方向性と合致する。
5.  **Qwen (Ensemble)**: 保留。システムが複雑になりすぎる。

### 👑 The Verdict: "Hybrid Oracle Strategy"

単一の「価格予測」をやめ、**3つの異なるエンジンの合議制**にする。

*   **Engine A (Logical):** 従来の数値予測 (LSTM/Transformer)。価格の方向を見る。
*   **Engine B (Visual):** Gemini 3 Flash (Vision)。チャートの形状（パターン）を見る。
*   **Engine C (Context):** MiniMax (Regime)。相場環境（レンジ/トレンド/荒れ野）を判定する。

**Decision Logic:**
*   Engine Cが「荒れ野」と判定 -> **No Trade (Defense)**
*   Engine Cが「トレンド」と判定 ->
    *   Engine A (数値) と Engine B (画像) が一致 -> **High Conviction Entry (Full Size)**
    *   不一致 -> **Low Conviction Entry (Half Size) or Wait**

これなら、単体の予測精度が50%でも、**「条件が揃った時しか撃たない」**ことで実効勝率を引き上げられる。

---

## 結論 (Final Decision)

**Strategy: "Filter, Don't Predict" (予測するな、選別せよ)**

1.  **Regime Classification (Phase 12 Preview)**:
    *   価格そのものではなく、「今の相場モード」を判定するモデルを優先開発する。
2.  **Multimodal Consensus (Phase 11)**:
    *   数値(A)と画像(B)の一致のみをエントリー対象とすることで "False Positive" を減らす。
3.  Phase 11の "Eyes of God" は、この「Engine B」として機能する。
