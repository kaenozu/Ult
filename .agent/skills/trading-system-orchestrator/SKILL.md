---
name: trading-system-orchestrator
description: Automates development workflows for the Ult Trading System, including running verification tests, managing the dual-stack server environment (Backend/Frontend), and checking system health. Use when users ask to "test the system", "verify logic", "start the app", or "check status".
---

# Trading System Orchestrator

This skill provides automated workflows for the Ult Trading System (Next.js + Python FastAPI).

## 1. System Verification

Use `scripts/run_verification.cjs` to run specific or all verification scripts with the correct environment variables (PYTHONPATH) automatically configured.

### Usage

```javascript
// Run all verifications
run_shell_command("node <skill_path>/scripts/run_verification.cjs all")

// Run specific verification
run_shell_command("node <skill_path>/scripts/run_verification.cjs <target>")
```

### Targets

- `time-machine`: Verifies historical simulation (Backtesting engine).
- `router`: Verifies Strategy Router (Regime detection & Strategy switching).
- `hive`: Verifies Consensus Engine (News/Tech/Risk voting).
- `all`: Runs all of the above sequentially.

## 2. System Startup

Use `scripts/start_system.cjs` to launch the entire stack. This handles:
1. Backend (Uvicorn on port 8000)
2. Frontend (Next.js on port 3000)
3. Opens distinct PowerShell windows for each to allow log monitoring.

### Usage

```javascript
// Start the system
run_shell_command("node <skill_path>/scripts/start_system.cjs")
```

**Note**: Warn the user that this will open new windows on their desktop.

## 3. Manual Troubleshooting Tips

If automated scripts fail, fallback to manual commands:

**Backend Test Manual:**
```powershell
cd backend
$env:PYTHONPATH = $PWD
python verify_time_machine.py
```

**Frontend Build:**
```powershell
npm run build
```