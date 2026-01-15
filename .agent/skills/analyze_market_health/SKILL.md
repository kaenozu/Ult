---
name: Analyze Market Health
description: Analyze the current market health, portfolio status, and trading signals using the Ult Trading App API.
---

# Analyze Market Health

Use this skill to perform a comprehensive check of the trading system, including current market trends, portfolio performance, and potential trading opportunities.

## Usage

Follow these steps to gather information and report to the user.

### 1. Check Portfolio Status

Call the `/api/v1/portfolio` endpoint to get the current financial health.

- **Total Equity**: Current total assets.
- **Unrealized PnL**: Current profit/loss status.
- **Cash**: Buying power available.

### 2. Check Auto-Pilot Status

Call `/api/v1/status/autotrade` to see if the system is running.

- **Status**: Running / Stopped
- **Scan Status**: Idle / Scanning / Sleeping

### 3. Scan Key Tickers

Check the status of major market movers (e.g., "9984.T" SoftBank G, "6758.T" Sony G).
For each ticker, call `/api/v1/signals/{ticker}`:

- **Signal**: Buy (1) / Sell (-1)
- **Target Price**: Where is it heading?

### 4. Provide Summary

Synthesize the above into a concise report:

- "The system is healthy/idle."
- "Portfolio is up X%."
- "Opportunity detected in [Ticker]!"

## Example Report

```
**Market Health Report**
- **System**: Auto-Pilot RUNNING (Sleeping)
- **Portfolio**: ¥1,050,000 (+5.0%)
- **Watchlist**:
  - SoftBank G: BUY Signal (Target: ¥9,200)
  - Sony G: WAIT
```
