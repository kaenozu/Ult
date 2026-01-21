## 🐝 Phase 15-17: The Hive Awakens

This PR contains the implementation of the **Mechanical Consensus Engine** and related features.

### Features Included

#### Phase 15: The Hive (Mechanical Consensus)
- **ConsensusEngine**: Aggregates votes from Tech, News, and Risk agents.
- **RiskAgent**: Monitors VIX/ATR and can VETO trades.
- **HivePanel**: UI visualization of the voting process.

#### Phase 15.5: News Agent (VADER)
- **NewsAgent**: Lightweight sentiment analysis using VADER.
- Fetches news via `yfinance` and provides sentiment score.

#### Phase 16: The Neural Bridge (Vision Integration)
- **VisionAgent**: Connects chart image analysis (Gemini 1.5) to Consensus.
- Updated weights: Tech (40%), News (30%), Vision (20%), Risk (10%).

#### Phase 17: Sovereign Operations
- **Notifier**: Console and Discord webhook notifications.
- **SovereignScheduler**: Daily routine automation.
- **run_sovereign.py**: Entry point for headless operation.

### Testing
- `tests/verify_hive.py`: Consensus logic verification.
- `tests/verify_news.py`: VADER sentiment verification.
- `tests/verify_vision_consensus.py`: Vision integration verification.
- `tests/test_sovereign_cycle.py`: Scheduler and notification tests.

### Breaking Changes
- Consensus weights changed (Tech reduced from 50% to 40%).
- `/signals/{ticker}` now triggers Vision analysis (increased latency).
