Project overview (plain language)
---------------------------------
- Purpose: Toolkit for analyzing trading data: manage a stock universe, detect supply/demand zones, measure market correlation, and analyze trade journals for patterns and psychological biases.
- Tech: Python backend modules with pytest tests; no external services required by the core logic.
- Structure: `backend/src` holds domain modules; `backend/tests` contains unit coverage; `skills/` and `docs/` hold meta-guides for automation and review processes.

Key modules
-----------
- Stock universe (`backend/src/ult_universe/universe.py`): add/remove/list symbols, validate formats, load/save JSON snapshots, and seed with default US/JP tickers.
- Supply/demand analysis (`backend/src/supply_demand/analyzer.py`, models.py): build volume-by-price maps, infer support/resistance zones with strength scores, detect breakouts, and fetch nearest levels.
- Market correlation (`backend/src/market_correlation/analyzer.py`, models.py): compute correlation and beta (NumPy optional), detect trends via regression slope, and combine market trend + individual signals into composite recommendations.
- Trade journal analysis (`backend/src/trade_journal_analyzer/analyzer.py`, models.py): ingest journal entries, compute win rates, find loss-chasing/overtrading, extract time/symbol patterns with caching, produce recommendations, and summarize performance by symbol.
- Performance + caching utilities (`backend/src/utils/performance_monitor.py`, `backend/src/cache/cache_manager.py`): decorators and helpers for timing, warnings, memoization, TTL caches with LRU eviction and stats.

How to exercise the code
------------------------
- Run tests: `pytest backend/tests` (no external data needed; uses synthetic fixtures).
- Typical usage flow: build a `StockUniverse`, analyze supply/demand zones from price-volume pairs, compute market correlation and trend, then feed trading journal entries to extract patterns and bias alerts.

Notes for contributors
----------------------
- Python only; prefer type hints and small, side-effect-free helpers.
- Keep tests deterministic; current suites rely on in-memory data (no network).
- Maintain the plain-language docs in `docs/` and the automation skill definitions under `skills/`.
