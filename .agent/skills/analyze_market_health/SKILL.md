---
name: Analyze Market Health
description: Analyze the current market health, portfolio status, and trading signals using the Ult Trading App API.
---

# Analyze Market Health

Use this skill to perform a comprehensive check of the trading system, including current market trends, portfolio performance, and potential trading opportunities.

## Usage

Run the script `scripts/market_health.py`.

### Example

```bash
python .agent/skills/analyze_market_health/scripts/market_health.py
```

### Output

Returns a JSON object with:
- **Portfolio**: Equity, Cash, PnL.
- **System**: Auto-Pilot status.
- **Market Summary**: Key indices status.
- **Watchlist**: Signals for major tickers.

