# Council of Five: The Mechanical Hive (Phase 15 Debate)

**Date:** 2026-01-20
**Topic:** How to implement "The Hive" (Consensus Engine) **without LLMs**.
**Constraint:** Pure Logic, Math, and Algorithms. No "Chat".

---

## 🎭 The Proposals

### 1. 📊 GLM-4.7: "The Weighted Matrix" (Mathematical Approach)
"LLMが使えないなら、数学が最強です。
各Agentの出力を `normalization` し、固定重みで加重平均します。

*   **Formula:** `Final Signal = Σ (Agent_Signal * Agent_Weight)`
*   **Weights:**
    *   Tech Agent (Router): 0.5 (実績あり)
    *   News Agent (Sentiment): 0.3 (Edge AI)
    *   Risk Agent (VIX/ATR): 0.2 (抑制役)

単純ですが、Backtestで最適化可能です（Phase 14のGenetic Optimizerをここにも適用できます）。"

### 2. 🥒 Big Pickle: "The Winner Takes All" (Tournament Approach)
"計算なんてまどろっこしい！
**『一番調子のいい奴』に従う**。これだろ！
直近5回のトレードで勝率が高いAgentを 'Leader' にする。
News Agentが絶好調なら、チャートが悪くてもNewsに従う。
**Dynamic Leadership** だ！"

### 3. 🛡️ MiniMax M2.1: "The Veto Protocol" (Safety Approach)
"合議制の欠点は『衆愚政治』です。
全員が「Buy」でも、致命的なリスク（例: VIX > 40）がある時は止めるべきです。
私は **'Hard Veto System' (拒否権)** を提案します。
`Risk Score > 0.8` なら、他が何と言おうと `Signal = 0` (Wait)。
スコア計算の前に、まず『安全確認』を行うべきです。"

### 4. ⚡ Gemini 3 Flash: "The Signal Mix" (Hybrid Approach)
"Mix them using `Signal Clustering`.
Tech, News, Riskの3次元ベクトルを作り、過去の「勝パターン」に近いかどうかを判定する...
いや、LLMなしなら複雑すぎるか。
GLMの加重平均に、MiniMaxのVetoを加えるのが現実的だ。
`Mechanical Hive` = `Weighted Average` + `Safety Override`.

---

## ⚖️ Antigravity's Verdict

**Analysis:**
*   **Weighted Matrix (GLM):** 実装が容易で、Phase 14の最適化とも相性が良い。
*   **Dynamic Leadership (Pickle):** 面白いが、実装コストが高い（各Agentの個別成績追跡が必要）。
*   **Veto (MiniMax):** **必須機能**。これが無いと「暴落中の買い向かい」が起きる。

**Decision:** **"The Iron Hive" (Weighted + Veto)**
論理的かつ安全なコンセンサスエンジンを構築する。

**Algorithm:**
1.  **Safety Check**: Risk Agentが `Danger` を出したら即時撤退 (Veto)。
2.  **Scoring**:
    *   Tech (-1 to 1) * 0.5
    *   News (-1 to 1) * 0.3
    *   Risk (Inverse 0 to 1) * 0.2
3.  **Threshold**: 合計スコアが `> 0.3` でBuy, `< -0.3` でSell。

**Implementation Plan:**
1.  **New Module:** `backend/src/agents/consensus_engine.py`
2.  **Agents Integration:**
    *   `StrategyRouter` -> Tech Score
    *   `EarningsHunter` (or new logic) -> News Score
    *   `MarketStatus` -> Risk Score
3.  **Visualization:** フロントエンドに「会議室（投票結果）」を表示するパネルを作成。

This provides the "Sovereign" feel logic without external dependency costs.
