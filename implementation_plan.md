# Implementation Plan - Living Nexus & Strategy Shifter

We will enhance the previously implemented features to V2 status ("Living" and "Shifting").

# Goal Description
1.  **Living Nexus (Frontend):** Make the `EcosystemGraph` interactive ("Ghost in the Shell") and capable of handling live updates.
2.  **Strategy Shifter (Backend):** Integrate the "Crash Detection" logic into the core `RegimeDetector` and ensure it outputs strict risk parameters (Circuit Breaker).

## User Review Required
> [!IMPORTANT]
> We are merging the lightweight `strategies/ml/regime_detector.py` logic into the robust `backend/src/regime_detector.py`.
> The `CRASH` state will force `position_size: 0.0` (Hard Stop).

## Proposed Changes

### Frontend
#### [MODIFY] [EcosystemGraph.tsx](file:///c:/gemini-thinkpad/Ult/src/components/visualizations/EcosystemGraph.tsx)
-   Add `onNodeClick` handler to trigger a "Ghost" dialogue (simulated AI comment about the stock).
-   Add visual pulsing effects for "Live" feel.
-   Refine Cyberpunk aesthetics based on the concept art (if possible with CSS/Canvas adjustment).

### Backend
#### [MODIFY] [regime_detector.py](file:///c:/gemini-thinkpad/Ult/backend/src/regime_detector.py)
-   Add `CRASH` to `MarketRegime` enum (or string constants).
-   Implement `_detect_crash` logic (Drawdown < -10% or ADX + VIX extreme).
-   Update `get_regime_strategy` to return `position_size: 0.0` for `CRASH`.

#### [DELETE] [backend/src/strategies/ml/regime_detector.py](file:///c:/gemini-thinkpad/Ult/backend/src/strategies/ml/regime_detector.py)
-   Cleanup the duplicate experimental file.

## Verification Plan

### Automated Tests
-   Update unit tests for `regime_detector.py` to include CRASH scenarios.
-   Verify `get_regime_strategy('CRASH')` returns correct safety parameters.

### Manual Verification
-   **Frontend:** Click nodes in the graph and verify the "Ghost" speaks.
-   **Backend:** Mock a market crash data frame and assert the detector returns "CRASH".
