---
name: Manage AutoTrade
description: Configure, enable, or disable the automated trading bot, and check its current status.
---

# Manage AutoTrade

This skill allows you to control the AutoTrader bot. You can check if it's running, enable/disable it, and set budget parameters.

## Usage

Run the following command in the terminal:

```bash
python backend/src/cli/autotrade.py <command> [options]
```

## Commands

### 1. Check Status
Get the current running status and configuration.

```bash
python backend/src/cli/autotrade.py status
```

### 2. Configure
Update settings or toggle the bot.

```bash
# Enable the bot
python backend/src/cli/autotrade.py config --enable

# Disable the bot
python backend/src/cli/autotrade.py config --disable

# Set maximum budget per trade (e.g. 500,000 JPY)
python backend/src/cli/autotrade.py config --budget 500000
```

## Output Format

Both commands return a JSON object with the current status:

```json
{
  "is_running": true,
  "scan_status": "Idle",
  "last_scan_time": "2024-01-01T12:00:00",
  "config": {
    "max_budget_per_trade": 500000,
    "max_total_invested": 2000000,
    "scan_interval": 60
  }
}
```
