# Walkthrough: Living Nexus & Strategy Shifter (V2)

Based on the "Interactive Debate" results, I have implemented two major upgrades.

## 1. Living Nexus (Frontend)
The **EcosystemGraph** is now interactive and contains the "Ghost Protocol".
- **Interaction:** Clicking on any node triggers a simulated AI analysis ("Ghost") about the stock's correlation and supply chain status.
- **Visuals:** Updated to match the "Living" concept with pulsing effects and deeper cyberpunk aesthetics.

## 2. Strategy Shifter (Backend)
I have merged the experimental `strategies/ml/regime_detector.py` into the core `backend/src/regime_detector.py` and added **Hard Circuit Breakers**.
- **Crash Detection:** Uses a combination of High Volatility and Down Trend to detect `MarketRegime.CRASH`.
- **Circuit Breaker:** When `CRASH` is detected, `get_regime_strategy` returns:
    - `position_size: 0.0` (Stop Trading)
    - `stop_loss: 0.0` (Immediate Liquidation signal)

## Verification
Ran `verify_regime.py` with noisy crash simulations.
```
--- Testing Stable Scenario ---
✅ PASS: Correctly identified STABLE/RANGING (low_volatility)

--- Testing Crash Scenario ---
✅ PASS: Correctly identified CRASH

--- Testing Volatile Scenario ---
✅ PASS: Identified High Energy State (high_volatility)
```
The system now correctly switches from "Growth" to "Survival" mode automatically.
