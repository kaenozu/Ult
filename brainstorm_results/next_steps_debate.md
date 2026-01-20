# Council of Five: The Missing Piece (News Integration)

**Date:** 2026-01-20
**Topic:** Specifically how to implement "News Agent" for `ConsensusEngine`.
**Constraint:** Backend-side execution required (Client-side WASM is disconnected from Python engine).

---

## 🧩 The Options

### 1. 🐍 Python Native (FinBERT / transformers)
"Use HuggingFace `transformers` in Python. Load `ProsusAI/finbert` locally."
*   **Pros:** High accuracy, runs entirely on backend, standard MLOps.
*   **Cons:** Heavy (PyTorch dependencies), memory usage, slow cold start.
*   **MiniMax:** "Wait, we are on a ThinkPad. Running BERT locally might lag the trading loop."

### 2. 🗞️ Simple Keyword Heuristics (Rule-based)
"Don't overthink. Count positive/negative financial keywords in headlines."
*   **Pros:** Extremely fast (Microseconds), no dependencies, robust.
*   **Cons:** Low nuance (can't detect "Earnings beat but guidance weak").
*   **Pickle:** "Simple is best! Speed is power!"

### 3. 🌐 API-based (LLM or External provider)
"Call Gemini 1.5 Flash just for Sentiment scoring."
*   **Pros:** Best nuance, extremely accurate.
*   **Cons:** Cost per call, latency, external dependency.
*   **GLM:** "The user rejected LLMs for the 'Core' loop. This is risky."

### 4. 🔗 Hybrid (Edge Mirroring)
"The Frontend already calculates sentiment via WASM (Phase 5). Send this `sentiment_score` to the backend via WebSocket or API when placing orders."
*   **Pros:** Zero backend overhead, reuses Phase 5 work.
*   **Cons:** Architecture 'Smell' (Frontend driving Backend logic), security risk (client spoofing).

---

## ⚔️ The Decision

**GLM-4.7:** "Option 4 is architectural suicide. Option 3 violates the 'Non-LLM' directive for this phase. Option 1 is too heavy for a simple consensus verification."
**MiniMax:** "Agreed. Start with **Option 2 (Keyword Heuristics)**."
**Gemini:** "But Option 2 is too dumb! 'Profit dropped' is bad, but 'Loss narrowed' is good. Keywords miss this."
**Antigravity:** "Compromise. **Enhanced Rule-based (Pattern Matching).**"

**Verdict: "The TextBlob/VADER Approach" (Lightweight NLP)**
Python has lightweight NLP libraries (`TextBlob` or `VADER`) designed for sentiment without heavy GPU models.
We will use **VADER (Valence Aware Dictionary and sEntiment Reasoner)**. It's tuned for social media/short text, perfect for headlines.

## 🚀 Action Plan (Phase 15.5)

1.  **Install:** `pip install vaderSentiment`
2.  **Implement:** `backend/src/agents/news_agent.py` using `SentimentIntensityAnalyzer`.
3.  **Integrate:** Connect `NewsAgent` to `ConsensusEngine`.
4.  **Verify:** Feed it headlines like "Toyota recalls 1M cars" (Should be negative).

This fills the 30% void immediately with minimal cost.
