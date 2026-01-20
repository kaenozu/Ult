# State of the Union: Source Code Review (2026-01-19)

## 1. Overview
The AGStock Ult codebase has grown significantly, transitioning from a simple trading bot to a "Sovereign AI Ecosystem".

*   **Total Phased Completed:** 13 Phases (Last: Multi-Strategy Engine)
*   **Architecture:** Hybrid (Next.js Frontend + Python FastAPI Backend + Edge Workers)
*   **Code Health:**
    *   **Frontend:** Modern, component-based (React), visually polished (Vibe Coding).
    *   **Backend:** Feature-rich but becoming monolithic. `backend/src` has 238 files.
    *   **Data:** Mixed (SQLite + Parquet + JSON). No centralized "Data Lake" implementation yet.

## 2. Critical Findings (The Good, The Bad, The Spaghetti)

### 🟢 Strengths (The Good)
*   **Strategy Diversity:** Phase 13 successfully introduced a structured approach to strategies (`Range`, `Volatile`, `Trend`).
*   **UI/UX:** "Divine Voice", "Vision Panel", and "Vibe" styling set a high bar for user experience.
*   **Edge AI:** Phase 5's use of Web Workers for sentiment analysis is a standout architectural decision (Client-side compute).

### 🔴 Weaknesses (The Bad)
*   **Backend Sprawl:** `backend/src` contains EVERYTHING. `strategies` folder is decently organized, but `backend/src` root is cluttered (`.py` files mixed with folders).
*   **Data Integrity:** We rely heavily on `yfinance` which is prone to breakage (`LEARNINGS.md`). No robust failover data provider (e.g. Alpha Vantage, Polygon) is fully integrated as a backup.
*   **Testing Gaps:** While `tests/` exists, coverage for complex interactions (e.g. "Does the Ghost Persona actually change the strategy?") is manual.

### 🍝 Technical Debt (The Spaghetti)
*   **Duplicate Logic:** `src/strategies/technical` vs `src/strategies/base.py` vs individual strategy files. Some indicators are re-calculated in multiple places.
*   **Config Scatter:** Configuration is likely scattered between `config.py`, hardcoded constants, and `.env`.

## 3. The Crossroads (Council Agenda)

We stand at the precipice of **Phase 14**. The system can speak, see, and switch strategies.
**What is missing?**

1.  **Memory & Evolution:** The system acts in the "Now". It doesn't *really* learn from last month's specific mistakes (Continuual Learning is conceptual).
2.  **True Autonomy:** It still asks for approval for everything (Semi-Auto).
3.  **Global Macro:** It looks at charts but ignores the "World" (News integration is local/limited).

---

# 議事録: The Council of Five - Strategic Debate (Phase 14)

**Topic:** What is the next Evolutionary Leap?

### 🥒 Big Pickle (Chaos & Vibe)
"おい、コードが綺麗とかどうでもいいんだよ！
今のAGStockに足りないのは **'Soul' (魂)** だ！
今の『Divine Voice』はただ喋るだけだろ？
俺は **'Virtual YouTuber Mode'** を提案する！
トレード中にLive2Dのアバターが動いて、儲かったら踊り、損したら机を叩く。
これこそが 'Review' の先にある 'Entertainment' だ！"

### 📊 GLM-4.7 (Structure & Logic)
"Pickle、正気ですか？ 我々は金融システムを作っているのです。
私のコードレビューに基づく提案は **'Quantitative Optimization Engine' (定量的最適化)** です。
Phase 13で戦略は増えましたが、パラメータ（BBのσ、RSIの期間）は固定です。
**'Hyperparameter Evolution' (遺伝的アルゴリズム)** を実装し、寝ている間に勝手に最強のパラメータを探させるべきです。
Backendのスパゲッティコードを整理する良い機会でもあります。"

### ⚡ Gemini 3 Flash (Futurist)
"Evolution is good, GLM. But slow.
I propose **'The Oracle of Delphi' (未来予知)**.
We have `Vision` (Phase 11). Why not feed *Social Media Screenshots* or *CNBC Video Feeds* into the Vision API?
市場の『空気』を視覚的に読む。
**Multimodal Sentiment v2** だ。"

### 🛡️ MiniMax M2.1 (Safety & Compliance)
"お二人の案はリスクが高すぎます。
コードレビューで気になったのは **'Data Fragility'** です。
Yahoo Financeが死んだら、我々は盲目になります。
次フェーズは **'Resilience Protocol' (要塞化)** であるべきです。
バックアップ用データソースの確保、Databaseの正規化、そして完全な単体テスト網羅です。"

### > Qwen (The Tactician - Guest)
"Wait. Use **DeepSeek-R1**.
最近話題の 'Reasoning Model' を組み込む。
『なぜそのトレードをしたのか？』を、DeepSeekに事後分析させる。
**'Post-Trade Psychoanalysis' (トレード精神分析)**。
自分の負けパターンを論理的に説教される機能だ。"

---

## ⚔️ Antigravity's Verdict

**Theme:** "Evolution through Introspection" (内省による進化)

Pickleのエンタメ性、GLMの最適化、Geminiのマルチモーダル、MiniMaxの堅牢性。
全て魅力的だが、**GLMの「自己最適化」** が最もROI（投資対効果）が高い。

今のAGStockは「武器」を手に入れたが、「武器の手入れ」を知らない。
**Phase 14: Genetic Optimization (The Blacksmith)** を提案する。

### Plan Phase 14:
1.  **Refactor Backend:** `backend/src` を整理し、モジュール化を進める（Strategyのパラメータを外部化）。
2.  **Implement GA (Genetic Algorithm):** 過去データを使って、各戦略（Sniper, Guerilla, Storm Chaser）の最適パラメータ（期間、閾値）を自動探索するスクリプトを作成する。
3.  **Self-Correction:** 週末に「自己対戦」を行い、パラメータを更新するワークフローを確立する。

**Decision:** **Phase 14 = The Blacksmith (Genetic Optimization & Refactoring)**
