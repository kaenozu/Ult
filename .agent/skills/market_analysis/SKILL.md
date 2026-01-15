---
name: Market Analysis
description: Fetch real-time stock prices and simple market analysis.
---

# Market Analysis Skill

This skill allows you to fetch current market data for specific tickers.

## Commands

### Check Price
Get the current price (close price of the most recent trading day) for a specific ticker.

```bash
python -m src.cli.market price <ticker>
```

**Example:**
```bash
python -m src.cli.market price 7203.T
```

## Notes
- Data is fetched using the `yfinance` library via `src.data_loader`.
- Prices are typically delayed by 15-20 minutes depending on the source.

## Citations
- [Market CLI](file:///c:/gemini-thinkpad/Ult/backend/src/cli/market.py)
- [Data Loader](file:///c:/gemini-thinkpad/Ult/backend/src/data_loader.py)
