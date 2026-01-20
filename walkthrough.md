# Walkthrough - Phase 11: The Eyes of God (Multimodal Vision)

**"The AI now sees what we see."**

We have integrated Gemini 1.5 Flash's vision capabilities directly into the trading interface, allowing "Multimodal Consensus" between numerical data and visual chart patterns.

## Changes

### 1. Backend Vision API
*   **New Endpoint**: `POST /api/v1/vision/analyze`
*   **Logic**: Accepts base64 image -> Gemini 1.5 Flash -> Returns JSON Analysis (Patterns, Support/Res, Verdict).
*   **Refactor**: Updated `ChartVisionEngine` to support direct byte analysis without re-plotting data.

### 2. Frontend Vision Analyst
*   **Component**: `VisionPanel` (Side panel with "Scanning" animation and results).
*   **Privacy & Security**: Implemented `useChartCapture` hook using `html2canvas`. This ensures we **ONLY** capture the specific chart DOM element (`#price-chart-container`), preventing any data leakage from other tabs or personal information on screen.
*   **Integration**: Added "Analyze Vision" button to `StockDetailPage` (`/stocks/[ticker]`).

## Verification Results

### Backend Connectivity
Verified via script. The endpoint is reachable and correctly handles requests.
```json
// Response Structure
{
  "patterns": ["Head and Shoulders", "Bearish Divergence"],
  "support": 1450.0,
  "resistance": 1500.0,
  "verdict": "BEARISH",
  "visual_rationale": "Clear rejection at standard resistance line..."
}
```

### Frontend Integration
*   **Build Check**: `npm run typecheck` passed for the new feature files.
*   **UI Flow**:
    1.  User clicks Eye Button.
    2.  `html2canvas` generates base64.
    3.  VisionPanel opens and shows "Scanning...".
    4.  Result is displayed after API response.

## Next Steps
*   **Phase 11.5**: Implement "Screenshot Diary" (saving these images to `StockData` DB for historical replay).

### Phase 11.5: Screenshot Diary Integration (2026-01-19)

**Feature:** Local trading journal with AI vision analysis.

**Changes:**
1.  **Backend:**
    *   Added `screenshot_journal` table to SQLite.
    *   New endpoints: `/vision/save`, `/gallery/{ticker}`, `/image/{filename}`.
    *   Image storage at `backend/data/screenshots/`.
2.  **Frontend:**
    *   `VisionPanel`: Added "Save to Diary" button.
    *   `DiaryGallery`: New component to view past analyses in a grid layout.
    *   Integrated into `StockDetailPage`.

**Verification:**
*   Backend logic verified via `tests/test_vision_journal.py` (API flow confirmed).
*   Frontend `typecheck` passed after fixing `useChartCapture` types.

---

## Phase 5: Edge AI News Refinery (2026-01-19)

**Feature:** Client-side AI sentiment analysis using WebAssembly (Transformers.js).

**Changes:**
1.  **EdgeNewsRefinery.tsx:** New component with:
    *   WebWorker integration for Transformers.js
    *   Real-time progress indicators during model loading/inference
    *   Sentiment badges (POSITIVE/NEGATIVE) with confidence scores
    *   Summary statistics (Bullish/Bearish counts, overall sentiment %)

2.  **EarningsHunterPanel.tsx:** Updated to include collapsible Edge AI section.

**Benefits:**
*   🚀 Zero latency (all inference in-browser)
*   💰 Zero API cost (no server calls for analysis)
*   🔒 Privacy (data never leaves client)

**PR:** [#27](https://github.com/kaenozu/Ult/pull/27)

---

## Phase 5: Divine Voice Interface (2026-01-19)

**Feature:** Browser-native text-to-speech using Web Speech API.

**Changes:**
1.  **useSpeech.ts:** Custom hook wrapping Web Speech API with:
    *   Japanese language support (`ja-JP`)
    *   Configurable rate, pitch, volume
    *   Speaking state management
    *   No API key required

2.  **AIAdvisorPanel.tsx:** Added 🔊 Read Aloud button to read AI advice.

3.  **VisionPanel.tsx:** Added 🔊 Read Aloud button alongside Save to Diary.

**Benefits:**
*   🚀 Zero cost (browser-native)
*   🔒 Privacy (local audio generation)
*   ⚡ No latency

**PR:** [#28](https://github.com/kaenozu/Ult/pull/28)

---

## Phase 12: Regime Classifier (The Weather Forecaster) (2026-01-19)

**Feature:** Heuristic-based logic to detect market environment (Trend, Range, Volatile).

**Changes:**
1.  **RegimeClassifier (Backend):**
    *   Logic to classify market based on ADX, ATR, and Bollinger Bands.
    *   **TREND:** ADX > 25
    *   **RANGE:** ADX < 20
    *   **VOLATILE:** ATR > 2% (Iron Dome Trigger)

2.  **API:** `GET /api/v1/market/regime/{ticker}`
    *   Returns `{ regime: 'TREND_UP', confidence: 0.9, ... }`

**Benefits:**
*   🚦 Enables strategy switching (Multi-Strategy Engine)
*   🛡️ "Iron Dome" safety triggers on high volatility
*   🧠 Context-aware AI advice

**PR:** [#29](https://github.com/kaenozu/Ult/pull/29)

---

## Phase 13: Multi-Strategy Engine (The Arsenal) (2026-01-19)

**Feature:** Automatic routing between Trend, Range, and Volatile strategies based on Regime.

**Changes:**
1.  **New Strategies:**
    *   **The Guerilla (Range):** Bollinger Band Mean Reversion (Buy Low BB, Sell Mid BB).
    *   **The Storm Chaser (Volatile):** ATR Breakout + Trailing Stop.
2.  **Strategy Router:**
    *   Uses `RegimeClassifier` to pick the best strategy.
    *   Trend -> Sniper (LightGBM)
    *   Range -> Guerilla
    *   Volatile -> Storm Chaser
3.  **API Update:** `/signals/{ticker}` now uses `AUTO` mode by default to route requests.

**Verification:**
*   `tests/test_strategies_v2.py`: Verified Router correctly switches strategies based on synthetic data (Sine Wave -> Guerilla, Breakout -> Storm Chaser).

**Next:** Deploy The Arsenal.

---

## Phase 14: The Blacksmith (Genetic Optimization) (2026-01-19)

**Feature:** Genetic Algorithm (GA) to automatically find optimal parameters for strategy (RSI Period, BB Deviation, etc.).

**Changes:**
1.  **Backend Refactoring:**
    *   Updated `Strategy`, `RangeStrategy`, `VolatilityStrategy` to accept `params` dictionary in `__init__`.
    *   Updated `StrategyRouter` to support parameter injection.
2.  **Genetic Optimizer:**
    *   `src/optimization/genetic_optimizer.py`: Implements Evolution logic (Selection, Crossover, Mutation).
    *   Optimization Goal: Maximize `Sharpe Ratio * Return` (with penalty for losses).
3.  **CLI Tool:**
    *   `python -m src.cli.optimize_strategy --strategy Guerilla --ticker 7203.T` to run optimization loop.

**Verification:**
*   **Unit Tests:** `tests/test_strategies_v2.py` PASSED (ensured refactoring didn't break logic).
*   **Dry Run:** Ran Optimization CLI for 2 generations on 7203.T.
    *   Result: Successfully evolved parameters (e.g. `bb_window: 40`).

**Next:** Phase 11 Vision or Deployment.

---

## Phase 15: The Hive (Mechanical Consensus) (2026-01-20)

**Feature:** A "Brain-like" Consensus Engine that aggregates inputs from multiple specialized agents (Tech, News, Risk) to make robust decisions without relying on LLMs for every tick.

**Changes:**
1.  **Backend Agents:**
    *   **Risk Agent:** Monitors VIX and Asset Volatility. Has VETO power if risk is too high.
    *   **Consensus Engine:** `Score = Tech*0.5 + News*0.3 + Risk*0.2`.
2.  **Frontend:**
    *   `HivePanel.tsx`: Visualizes the "Meeting Room" where agents vote.
    *   Updated `SignalResponse` type to include detailed voting logs.
3.  **API:**
    *   Updated `/signals/{ticker}` to support `strategy=CONSENSUS` mode.

**Verification:**
*   **Script:** `tests/verify_hive.py` confirmed that High Risk (VIX > 30) triggers a VETO even if Technical signals are bullish.
*   **Safety:** "The Iron Hive" logic ensures we don't buy during market crashes.

---

## Phase 15.5: The VADER Integration (News Agent)

We integrated a lightweight News Agent using VADER sentiment analysis.
-   **NewsAgent**: Fetches headlines via `yfinance` and calculates a sentiment score (-1.0 to 1.0).
-   **ConsensusEngine**: News now carries a 30% weight in the final decision.
-   **Verification**: Tested with mock headlines (Positive/Negative/Mixed) to ensure correct scoring.

## Phase 16: The Neural Bridge (Vision Integration)

We successfully connected "The Eyes of God" (Vision Phase 11) to "The Hive" (Consensus Phase 15), creating a true multimodal trading brain.

### Changes
1.  **VisionAgent**: A new agent that wraps `ChartVisionEngine` (Gemini 1.5 Flash). It reads the chart image and outputs a score (-1.0 to 1.0).
2.  **Consensus Weights**: Adjusted to accommodate Vision:
    *   **Tech (Strategist)**: 40% (was 50%)
    *   **News (Observer)**: 30% (Unchanged)
    *   **Vision (Seer)**: 20% (New)
    *   **Risk (Guardian)**: 10% (was 20%, but maintains absolute Veto power)
3.  **UI Update**: Added "The Seer" card to `HivePanel`.

### Verification
*   **Script**: `tests/verify_vision_consensus.py`
*   **Results**:
    *   Confirmed that a Bullish/Bearish Vision score correctly impacts the final Weighted Average.
    *   Verified that the API call flow works (ConsensusEngine -> VisionAgent -> ChartVisionEngine).

### Next Steps
*   **Phase 17**: Sovereign Operations (Automation & Scheduling).
