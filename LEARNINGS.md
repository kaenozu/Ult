# AGStock Project Learnings
*A living record of architectural decisions, bug fixes, and optimization patterns.*

## [2026-01-19] [Data Integration]
**Context:** Implementing Earnings Hunter with `yfinance`.
**Insight:** `yfinance.calendar` return type is inconsistent (sometimes list, sometimes dict) depending on the ticker and internal API changes.
**Action/Rule:** Always verify `yfinance` return types dynamically. Use `isinstance` checks before iterating.

## [2026-01-19] [Testing]
**Context:** Verifying backend modules (`NewsShockDefense`) with standalone scripts.
**Insight:** Python scripts in the root directory fail to import `backend.src` modules if their dependencies (`data_loader`, `schemas`) perform implicit relative imports or assume a specific `sys.path` order.
**Action/Rule:** For verification scripts, always perform `sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))` AND be wary of importing the entire app instance (`server` or `execution_engine`) when testing a single class. Use `unittest.mock` to bypass heavy dependencies.

## [2026-01-19] [Architecture]
**Context:** Phase 8 Neural Connection.
**Insight:** A "Brain" (Sentinel/Sentiment) is useless without a direct "Nerve" connection to "Hands" (Execution). Pure analysis without parameterized impact on Logic (Position Sizing/Risk) is just "dashboard decoration".
**Action/Rule:** When adding AI features, always define the "Actuator" first. How does this AI output change a float variable in the Core Engine?
