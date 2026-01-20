# Council of Five: The Crossroads (Post-Vision)

**Date:** 2026-01-20
**Context:** The Hive is awake and has Eyes (Vision). But it sits still, waiting for user commands.

---

## 🔮 The Proposals

### Proposal A: "Sovereign Operations" (Phase 17)
**Champion:** 🛡️ **MiniMax** (The Guardian)
**Concept:** "The Heartbeat."
*   **Goal:** Automate the daily routine.
*   **Tasks:**
    1.  **Scheduler:** Cron-like capability (Python `apscheduler` or OS Cron).
    2.  **Notification:** Send "Morning Briefing" and "Trade Alerts" to Discord or LINE.
    3.  **Headless Mode:** Run without the UI open.
*   **Argument:** "A sovereign agent doesn't wait for its master to wake up. It wakes the master up."

### Proposal B: "The Turbo Engine" (Phase 18)
**Champion:** 🥒 **Pickle** (The Speedster)
**Concept:** "Speed is Life."
*   **Goal:** Parallelize everything.
*   **Tasks:**
    1.  **Optimization:** Use `multiprocessing` for Genetic Algorithms (Phase 14).
    2.  **Backtesting:** Run backtests for 50 tickers simultaneously.
    3.  **Caching:** Redis/SQLite optimization.
*   **Argument:** "Our brain is big (Vision + News), but it's slow. We need to think faster."

### Proposal C: "Paper to Reality" (Phase 19)
**Champion:** ⚡ **Gemini** (The Visionary)
**Concept:** "Skin in the Game."
*   **Goal:** Connect to a real (or realistic) broker API for paper trading execution.
*   **Problem:** Currently `PaperTrader.py` is a mock simulation.
*   **Argument:** "We are simulating a simulation. Let's connect to Alpaca Paper API (US) or just build a rigorous local ledger that mimics real slippage/fees perfectly."

---

## ⚔️ The Debate

*   **MiniMax:** "If we don't build **Option A (Ops)**, this project remains a 'Dashboard Demo'. It needs to run 24/7 on a server."
*   **Antigravity:** "Agreed. 'Agentic' means autonomous. Creating a `run_daily_cycle.py` script that manages the whole day (Fetch -> Analyze -> Trade -> Notify) is the essence of this project."
*   **Gemini:** "But Option B (Speed) is sexy..."
*   **Antigravity:** "Speed is optimization. Autonomy is **functionality**. We choose Autonomy first."

## 🏛️ The Verdict

**Consensus:** **Phase 17: Sovereign Operations.**

**Why:**
1.  The system is feature-rich but passive.
2.  Making it active (Alerts, Scheduling) changes the user relationship from "User uses Tool" to "Agent serves User".
3.  This fulfills the "Sovereign" promise.

**Proposed Implementation Plan (Phase 17):**
1.  **Notification Service:** `src/notifications/discord_bot.py` (or LINE).
2.  **Scheduler:** `src/scheduler/daily_routine.py`.
3.  **Workflow:**
    *   08:50 AM: Pre-market Scan (News/Macro).
    *   09:00 AM: Market Open Alert.
    *   14:55 PM: Closing Cross Analysis (The Hive Deliberation).
    *   15:05 PM: Daily Summary Report.
