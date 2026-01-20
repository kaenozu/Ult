- [x] Phase 3: Realtime Synapse & Persona Protocol <!-- id: 0 -->
    - [x] [Backend] Implement WebSocket Server (FastAPI/Python) <!-- id: 1 -->
    - [x] [Frontend] Connect EcosystemGraph to WebSocket (MarketStatusCard implemented) <!-- id: 2 -->
    - [x] [Backend] Broadcast Regime State via WebSocket <!-- id: 3 -->
    - [x] [Frontend] Implement Dynamic Ghost Persona (React to Regime) <!-- id: 4 -->
    - [x] [Verification] Test Realtime Updates & Persona Switching <!-- id: 5 -->

- [x] Phase 4: Autonomous Ghost Personas (Council of Five) <!-- id: 6 -->
    - [x] [Safety] Implement CircuitBreaker (Hard Budget Limit & Kill Switch) <!-- id: 7 -->
    - [x] [Debt] Fix missing WebSocket types (ApprovalPayloads) <!-- id: 8a -->
    - [x] [Core] Async Agent Loop (Redis Stream / Fire-and-forget) <!-- id: 8 -->
    - [x] [UI] NeuralMonitor (Realtime Thought Process Display) <!-- id: 9 -->
    - [x] [Ops] Semi-Auto Mode (Human-in-the-loop approval) <!-- id: 10 -->
    - [x] [Critical] Approval Persistence (SQLite Integration) <!-- id: 10a -->
    - [x] [UI] Global Alert System (Circuit Breaker Visuals) <!-- id: 10b -->

- [ ] Phase 5: The Hybrid Singularity (Stabilization & Edge) <!-- id: 11 -->
    - [x] [Stabilization] Dashboard & API Hardening (GLM) <!-- id: 12 -->
        - [x] Backend Connection Resilience (config/imports/cors) <!-- id: 12a -->
        - [x] Frontend Reconnection Logic (useSynapse) <!-- id: 12b -->
        - [x] Frontend Config Fix (localhost proxy) <!-- id: 12c -->
    - [x] [Edge] Client-Side News Analysis (WASM) <!-- id: 14b -->
        - [x] [Worker] Create Sentiment Analysis WebWorker <!-- id: 27 -->
        - [x] [UI] Integrate into EarningsHunterPanel <!-- id: 28 -->
        - [ ] [Verification] Performance Benchmark (Server vs Client) <!-- id: 29 -->
    - [x] [Intelligence] Divine Voice Interface (Voice Feedback) <!-- id: 17 -->
        - [x] Create useSpeech hook (Web Speech API) <!-- id: 30 -->
        - [x] Integrate into AIAdvisorPanel <!-- id: 31 -->
        - [x] Integrate into VisionPanel <!-- id: 32 -->
    - [ ] [UI] WebXR & UI Polish (Pickle) <!-- id: 13 -->
        - [x] WebXR Spatial Interface (Stable) <!-- id: 13a -->
        - [ ] [Interaction] Parallax Effect (2.5D Mode) <!-- id: 13c -->
        - [x] UI Skills Application (text-balance, tabular-nums) <!-- id: 13b -->
    - [/] **Phase 12: Regime Classifier (The Weather Forecaster)** <!-- id: 16 -->
    - [x] [Model] Train XGBoost/RandomForest for Regime Detection (Trend/Range/Volatile) <!-- id: 16a -->
    - [ ] [System] Implement Strategy Router (Switch logic based on Regime) <!-- id: 16b -->

- [/] **Phase 13: Multi-Strategy Engine (The Arsenal)** <!-- id: 18 -->
    - [x] [Strategy] Implement 'The Guerilla' (Range Strategy) <!-- id: 18a -->
    - [x] [Strategy] Implement 'The Storm Chaser' (Volatility Strategy) <!-- id: 18b -->
    - [x] [System] Implement 'Strategy Router' (Switch logic based on Regime) <!-- id: 18c -->
    - [x] [API] Update `/signals/{ticker}` to support AUTO mode <!-- id: 18d -->
    - [x] [Backtest] Verify each strategy against specific regimes <!-- id: 18e -->

- [/] **Phase 14: The Blacksmith (Genetic Optimization)** <!-- id: 19 -->
    - [x] [Refactor] Update Base Strategy to support dynamic params `__init__(params=...)` <!-- id: 19a -->
    - [x] [Optimization] Implement `GeneticOptimizer` (Population, Fitness, Mutation) <!-- id: 19b -->
    - [x] [CLI] Create `optimize_strategy.py` tool <!-- id: 19c -->
    - [x] [Verify] Run optimization on 7203.T for 'The Guerilla' <!-- id: 19d -->

- [/] **Phase 15: The Hive (Mechanical Consensus)** <!-- id: 20 -->
    - [x] [Backend] Implement `ConsensusEngine` (Weighted Voting + Veto) <!-- id: 20a -->
    - [x] [Backend] Implement `RiskAgent` (VIX/ATR Monitor) <!-- id: 20b -->
    - [x] [API] Update `/signals/{ticker}` to return Consensus Result <!-- id: 20c -->
    - [x] [UI] Implement `HivePanel` (Visualization of Voting) <!-- id: 20d -->
    - [x] [Verify] Test Veto Logic (Force Risk -> Signal 0) <!-- id: 20e -->
    - [x] **Phase 15.5: The VADER Integration (News Agent)** <!-- id: 20f -->
        - [x] [Backend] Install `vaderSentiment` <!-- id: 20g -->
        - [x] [Backend] Implement `NewsAgent` using VADER <!-- id: 20h -->
        - [x] [Integration] Connect `NewsAgent` to `ConsensusEngine` <!-- id: 20i -->
        - [x] [Integration] Fetch `yfinance` news in `market.py` <!-- id: 20j -->

- [x] **Phase 16: The Neural Bridge (Vision Integration)** <!-- id: 30 -->
    - [x] [Backend] Implement `VisionAgent` (Wrapper for ChartVision) <!-- id: 30a -->
    - [x] [Backend] Update `ConsensusEngine` (Tech 40%, News 30%, Vision 20%, Risk 10%) <!-- id: 30b -->
    - [x] [API] Update `/signals/{ticker}` to call VisionAgent <!-- id: 30c -->
    - [x] [Verify] Test response time and scoring logic <!-- id: 30d -->

- [x] **Phase 17: Sovereign Operations (Automation)** <!-- id: 31 -->
    - [x] [Backend] Implement `Notifier` (Discord/Console) <!-- id: 31a -->
    - [x] [Backend] Implement `SovereignScheduler` (APScheduler/Loop) <!-- id: 31b -->
    - [x] [Script] Create `run_sovereign.py` (Daily Routine Entry Point) <!-- id: 31c -->
    - [x] [Verify] Run a simulated "Day in the Life" (Headless) <!-- id: 31d -->

- [ ] Phase 11: The Eyes of God (Multimodal Vision) <!-- id: 18 -->
    - [x] [UI] Chart Vision Analyst Interface <!-- id: 19 -->
        - [x] [Interaction] "Analyze Chart" Button & Capture Logic <!-- id: 19a -->
        - [x] [Display] Vision Analysis Result Card (Overlay/Panel) <!-- id: 19b -->
    - [x] [Backend] Chart Capture Service (Puppeteer -> html2canvas) <!-- id: 20 -->
    - [x] [Integration] Vision Brain (Gemini 1.5 Flash) <!-- id: 21 -->
    - [x] Phase 11.5: Screenshot Diary <!-- id: 22 -->
        - [x] [Backend] File Storage System (backend/data/screenshots) <!-- id: 23 -->
        - [x] [Backend] Journal Database Table (metadata & analysis) <!-- id: 24 -->
        - [x] [API] Save & Gallery Endpoints <!-- id: 25 -->
        - [x] [UI] "Save to Diary" Action & Gallery Grid <!-- id: 26 -->

