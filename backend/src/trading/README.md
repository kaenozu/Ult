# AGStock Trading Engine

The `src/trading` package contains the core logic for the automated trading system.

## Recent Refactoring (Phase 2)

As of late 2025, the monolithic `FullyAutomatedTrader` class has been refactored into modular components.

### 1. FullyAutomatedTrader (`fully_automated_trader.py`)
- **Role**: The main orchestrator (Facade).
- **Responsibilities**: 
  - Initializes the system components.
  - Runs the `daily_routine` loop.
  - Delegates specific tasks to `MarketScanner`, `TradeExecutor`, and `DailyReporter`.
  - Handles high-level safety checks (Daily PnL limit, VIX check).

### 2. MarketScanner (`market_scanner.py`)
- **Role**: The "Eyes" of the system.
- **Responsibilities**:
  - Fetches market data.
  - Runs `RegimeDetector` to identify market conditions.
  - Uses `StrategyOrchestrator` to generate trading signals.
  - Filters signals based on market caps and fundamentals.

### 3. TradeExecutor (`trade_executor.py`)
- **Role**: The "Hands" of the system.
- **Responsibilities**:
  - Receives candidate signals from the Scanner.
  - Runs "AI Veto" checks (`AIVetoAgent`).
  - Checks social sentiment heat (`SocialAnalyst`).
  - Executes orders via `ExecutionEngine`.

### 4. DailyReporter (`daily_reporter.py`)
- **Role**: The "Voice" and "Brain" (Reflection) of the system.
- **Responsibilities**:
  - Generates daily PnL reports and sends notifications (`SmartNotifier`).
  - Runs post-market analysis (`DailyReviewer`).
  - Conducts AI Self-Reflection loops (`FeedbackStore`).
  - Triggers weekly Strategy Evolution (`StrategyGenerator`).

---

## Usage

To start the automated trading loop:

```python
from src.trading.fully_automated_trader import FullyAutomatedTrader

trader = FullyAutomatedTrader("config.json")
trader.daily_routine()
```
