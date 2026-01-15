---
name: Portfolio Status
description: Get the current status of the portfolio (Holdings, Balance, PnL).
---

# Portfolio Status

Use this skill to view the current risk and performance of the portfolio managed by the system.

## Usage

Run the script `scripts/get_portfolio.py`.

### Example

```bash
python .agent/skills/portfolio_status/scripts/get_portfolio.py
```

### Output

Returns a JSON object with:
- **Cash**: Available cash.
- **Invested**: Total amount invested.
- **Total Equity**: Cash + Invested.
- **Positions**: List of current positions (Ticker, Qty, PnL).
