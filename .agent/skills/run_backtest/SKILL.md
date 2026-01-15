---
name: Run Backtest
description: Execute a historical backtest for a specific stock ticker using a chosen strategy to evaluate performance.
---

# Run Backtest

This skill allows you to run a backtest simulation. It queries the backend API to simulate trading over a past period and returns performance metrics like Return, Sharpe Ratio, and Win Rate.

## Usage

Run the following command in the terminal:

```bash
python backend/src/cli/backtest.py <ticker> --strategy <strategy> --period <period> --capital <capital>
```

## Arguments

- `<ticker>`: The stock ticker symbol (e.g., `7203.T`, `6857.T`).
- `--strategy`: The trading strategy to test. Options: `LightGBM`, `RSI`. Default: `LightGBM`.
- `--period`: The historical period to test. data format is number + suffix (d=day, mo=month, y=year). Example: `1y`, `6mo`. Default: `1y`.
- `--capital`: Initial capital in JPY. Default: `1000000`.

## Example

```bash
# Test Toyota with LightGBM over 1 year
python backend/src/cli/backtest.py 7203.T --strategy LightGBM --period 1y

# Test Sony with RSI over 6 months
python backend/src/cli/backtest.py 6758.T --strategy RSI --period 6mo
```

## Output Format

The output is a JSON object containing the results:

```json
{
  "total_return": 0.15,
  "sharpe_ratio": 1.2,
  "max_drawdown": -0.05,
  "win_rate": 0.65,
  "total_trades": 24
}
```
