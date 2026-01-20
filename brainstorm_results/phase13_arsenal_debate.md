# 激論: Phase 13 - Designing the Arsenal (武器庫の設計)

**Theme:** Phase 12で「天気（環境）」は読めるようになった。次は「武器（戦略）」だ。
**Question:** 具体的にどのような戦略を実装すべきか？ 単純なRSI逆張りで勝てるほど甘い世界なのか？

---

## Round 1: 提案 (Proposals)

### 🥒 Big Pickle (Chaos & Vibe)
"おいおい、ちまちました戦略はいらねえぞ。
**'Volatility Breakout'** だ！
価格が一定ラインを超えたら、順張りでドカンと乗る。
「荒れ野」判定が出たら、ビビって逃げるんじゃなくて、**嵐の中でサーフィンするんだよ！**
ロジックは簡単だ。「昨日の高値を越えたら買い」。シンプルこそ最強だ。"

### 📊 GLM-4.7 (Structure & Logic)
"Pickleの案はダマシ（False Breakout）で死にます。
私は **'Statistical Mean Reversion' (統計的平均回帰)** を提案します。
ボリンジャーバンド2σではなく、**「線形回帰チャネル」** を使い、標準偏差±2σからの反発を狙います。
さらに、RSIだけでなく、**Volume Price Trend (VPT)** を組み合わせて「価格は下がったが、売り圧は弱い」瞬間を狙い撃ちします。"

### ⚡ Gemini 3 Flash (Futurist)
"Old school indicators again?
We should use **'Pattern Matching'**.
類似した過去のチャートパターン（DTW: Dynamic Time Warping）を見つけ、その後の値動きを確率的に予測する。
「今の波形は、2008年のリーマンショック前に似ている」といった洞察に基づくトレードだ。
これが本当のAIトレードだろう？"

### 🛡️ MiniMax M2.1 (Safety & Compliance)
"Geminiの案は計算コストが高すぎます。
私は **'Cash is a Position'** 戦略を提案します。
Regimeが「不明確」な時は、MMF（マネー・マネジメント・ファンド）や債券ETFに資金を退避させるロジックです。
「攻め」の戦略ばかりでなく、「守り」の戦略もArsenalに加えるべきです。"

---

## Round 2: 批判 (Critique)

### > Qwen attacks Gemini 🚀
"DTW is too slow for real-time.
推論に時間がかかれば、エントリーの好機を逃す。
GLMの統計的アプローチの方が、計算が速く、エッジが明確だ。"

### > Pickle attacks MiniMax 🥒💢
"守り？ MMF？ 寝言は寝て言え！
俺たちはリスクを取りに来てるんだ。
『休む』機能はPhase 12 (Regime) で実装済みだろ？ Phase 13は**殺るか殺られるか**だ！"

### > GLM attacks Pickle 📊
"単純なブレイクアウトはHFTの餌食です。
少なくとも「ATRによるボラティリティ・フィルタ」をかけないと、往復ビンタで資産が溶けます。"

---

## ⚔️ Antigravity's Verdict (Synthesis)

**"Build a Balanced Arsenal." (バランスの取れた武器庫を作れ)**

極端な案が出たが、全て採用するわけにはいかない。
初期実装（Phase 13）では、**堅実かつ実装容易な2つ**に絞る。

### 採用戦略 (The Chosen Strategies)

#### 1. The Sniper (Trend Strategy) - *Existing*
*   **Logic**: LightGBM + Regime "TREND"
*   **Role**: 本命。トレンド相場で大きく利益を伸ばす。

#### 2. The Guerilla (Range Strategy) - *New (Based on GLM)*
*   **Logic**: **Bollinger Band Mean Reversion**
    *   Regimeが "RANGE" の時のみ稼働。
    *   BB -2σ タッチ + RSI < 30 で買い。
    *   BB Center line で利益確定（早逃げ）。
*   **Role**: トレンドがない時期の「小遣い稼ぎ」。

#### 3. The Storm Chaser (Volatility Strategy) - *New (Based on Pickle)*
*   **Logic**: **ATR Breakout (Modified)**
    *   Regimeが "VOLATILE" の時のみ稼働。
    *   「価格 > (Open + k * ATR)」でエントリー。
    *   **Trailing Stop** をタイトに設定し、反転したら即撤退。
*   **Role**: 暴落・暴騰時の「火事場泥棒」。

### 却下・保留
*   **Pattern Matching (Gemini)**: 計算コスト過大のため保留。Phase 40 (AI Evolution) で検討。
*   **Cash Strategy (MiniMax)**: Base Systemのエグジットロジックとして組み込む（個別の戦略ではない）。

---

## 結論 (Final Decision)

**Phase 13の実装方針:**

1.  **Guerilla (Range)**: ボリンジャーバンド逆張りロジックを実装。
2.  **Storm Chaser (Volatile)**: ATRブレイクアウトロジックを実装。
3.  **Strategy Router**: Phase 12の判定結果に基づき、上記3つ（Sniper含）を動的に切り替える仕組みを作る。

**"A weapon for every war." (あらゆる戦場に対応する武器を)**
