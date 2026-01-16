# Meeting Minutes: "How to Buy" Strategy (Sensitivity Tuning)
**Topic:** Balancing Safety vs Opportunity
**User Concern:** "If we are too safe, we never buy. We make 0 profit."

## 1. The Current Gatekeeper
**Antigravity:** The code `lightgbm.py` has a default threshold of **0.52** (52% confidence) to Buy.
**Qwen:** PLUS, the `Oracle2026` adds a "Risk Buffer". If market volatility (VIX) is high, the threshold jumps to **0.60+**.
**Big Pickle:** This is "Guardian Mode". It blocks 99% of trades to prevent losses. Great for preservation, bad for growth.

## 2. The Opportunity Cost
**Big Pickle:** We need a "Sniper Mode". Sometimes you have to take a shot at 48% probability if the Risk/Reward ratio is good.
**Antigravity:** Agree. A system that never trades is just a savings account.

## 3. Proposed Fix: "Aggressive Protocol"
We will adjust the `LightGBM` strategy parameters to be slightly more aggressive for this phase.

1.  **Lower Base Threshold:** `0.52` -> **0.505** (Barely above random chance, trusting the model's slight edge).
2.  **Calibration:** The `_calibrate_thresholds` function already tries to optimize this, but we will force a lower floor.
3.  **Oracle Override:** Allow "Sniper" strategies to bypass the "Absolute Defense" if volatility is moderate.

**Implementation Plan:**
*   Modify `lightgbm.py`: Change `default_positive_threshold` to `0.51`.
*   Result: More green signals, but potentially more false positives.

**User Decision Required:** Do you want to unlock "Aggressive Mode"?
