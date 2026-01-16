# Meeting Minutes: "Why 0%?" (The Starvation Issue)
**Date:** 2026-01-16
**Issue:** Even with Aggressive Mode, signals are 0.
**Diagnosis:** AI Data Starvation.

## 1. The Investigation
**Antigravity:** I ran a probe (`debug_signal.py`) into the AI's brain.
*   **Result:** `Model is NONE`. The AI never even *tried* to predict.
*   **Reason:** It refused to learn because it only had **122 days** of data.
*   **Requirement:** It needs at least **170 days** (Lookback 120 + Buffer 50) to form a valid opinion.

## 2. The Root Cause (The "5 Crumb" Rule)
**Qwen:** Why did it only have 122 days?
*   **Glitch:** In `src/core/constants.py`, a setting `MINIMUM_DATA_POINTS` was set to **5**.
*   **Consequence:** The Data Loader checked the cache, saw 122 days, said "122 > 5, that's plenty!", and served it to the AI.
*   **AI's Reaction:** "I cannot work with this." -> `Signal: 0`.

## 3. The Fix
**Decision:** change `MINIMUM_DATA_POINTS` to **200**.
*   **Effect:** The Data Loader will now say "122 < 200, this is insufficient!", force a redownload from the market (fetching 2-5 years), and feed the AI a full dataset.

**Status:** Code updated. Restarting system. The AI should wake up shortly.
