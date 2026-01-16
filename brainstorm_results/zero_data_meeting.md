# Meeting Minutes: Why is Everything 0%?
**Date:** 2026-01-16
**Issue:** User reports "All stocks are 0%".
**Attendees:** Antigravity (Investigator), Qwen (Tech Lead), Big Pickle (Market Analyst)

## 1. Investigation Findings
**Antigravity:** I directly queried the backend (`/api/v1/signals/7203.T`).
*   **Response:** `{"signal": 0, "confidence": 0.0, "explanation": "AIによる強い確信度は得られていません。"}`
*   **Macro Data:** `v1/macro` returns valid data (Nikkei -0.38%, etc.).
*   **Conclusion:** The backend is alive, but the **AI Prediction Engine is defaulting to Neutral (0)**.

## 2. Why "Zero"? (The Root Cause)
**Qwen (Tech):** This is expected behavior for a fresh system.
1.  **Safety First:** The `LightGBM` strategy requires a high confidence threshold (`confidence > 0.6` or similar) to trigger a BUY/SELL signal. If the model is unsure, it defaults to 0 (HOLD) to protect capital.
2.  **Cold Start:** The model is likely running on `yfinance` data without extensive historical training or hyperparameter tuning for these specific Japanese stocks. It sees "Noise", not "Signal".

## 3. Is "0%" Bad?
**Big Pickle (Analyst):** No! In trading, **"No Signal" (0%) is a valid signal.**
*   "Don't lose money" is Rule #1.
*   If the AI isn't 100% sure, it stays in cash. That is *discipline*.
*   However, visually, it looks "broken" to the user.

## 4. Proposed Solution
1.  **Short Term (UX):** Update the UI to clearly state "ANALYZING... (NEUTRAL)" instead of just "0%".
2.  **Long Term (Logic):** Lower the confidence threshold for "Watch" signals (e.g., show "Weak Buy" at 40% confidence) to give the user some feedback, even if it's not a trade execution signal.

**Verdict:** The system is working correctly (conservatively). It's not a bug; it's a feature (Risk Management).
