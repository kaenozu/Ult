---
name: Market Scan
description: Scan the market for trading opportunities and get a summary.
---

# Market Scan

Use this skill to scan the market for potential buy/sell signals and get a general market overview.

## Usage

Run the script `scripts/scan.py`.

### Example

```bash
python .agent/skills/market_scan/scripts/scan.py
```

### Output

Returns a JSON object with:
- **Market Summary**: Top gainers/losers.
- **Signals**: List of tickers with Buy/Sell signals.
