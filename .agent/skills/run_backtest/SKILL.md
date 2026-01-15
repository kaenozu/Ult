---
name: Run Backtest
description: Run a strategy backtest for a specific ticker.
---

# Run Backtest

Use this skill to run a backtest simulation for a specific stock ticker. This helps evaluate how a strategy would have performed in the past.

## Usage

Run the python script `scripts/run_backtest.py`.

### Arguments

- `ticker`: The stock ticker (e.g., "7203.T").
- `--period`: Duration of data (default: "1y").
- `--strategy`: Strategy name (default: "RSI").

### Example

```bash
python .agent/skills/run_backtest/scripts/run_backtest.py 7203.T --period 1y
```

### Output

Returns a JSON summary of the backtest:
- Total Return
- Sharpe Ratio
- Max Drawdown
- Trades Count
