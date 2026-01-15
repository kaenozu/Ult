---
name: Analyze Stock
description: detailed technical and risk analysis of a specific stock ticker using Advanced Analytics.
---

# Analyze Stock

Use this skill to perform a deep-dive analysis on a specific Japanese stock ticker. It calculates risk metrics, volatility, and performance indicators using the backend's `AdvancedAnalytics` engine.

## Usage

Run the python script `scripts/analyze.py` with the ticker symbol.

### Arguments

- `ticker`: The stock ticker symbol (e.g., "7203.T" for Toyota).

### Example Command

```bash
python .agent/skills/analyze_stock/scripts/analyze.py 7203.T
```

### Output

The script returns a JSON object containing:
- **Risk Metrics**: Sharpe Ratio, Sortino Ratio, Max Drawdown, Volatility.
- **Price Info**: Latest close price.
- **Summary**: A text summary of the analysis.

## Interpretation

- **Sharpe Ratio > 1.0**: Good risk-adjusted return.
- **Max Drawdown < -0.2**: High risk, significantly down from peak.
- **Volatility > 0.4**: High volatility asset.
