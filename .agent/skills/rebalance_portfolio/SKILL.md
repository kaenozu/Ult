---
name: rebalance_portfolio
description: Monitor portfolio correlation and automatically rebalance holdings to manage risk.
---

# Rebalance Portfolio

This skill monitors the current stock portfolio for high correlations between positions (which indicates concentration risk) and can automatically execute or simulate rebalancing trades to diversify holdings.

## Usage

### Check Rebalancing Status
Check if the portfolio needs rebalancing based on current correlations.

```bash
python backend/src/cli/rebalance.py check [--threshold <FLOAT>]
```

**Arguments:**
- `--threshold <FLOAT>`: Correlation threshold (0.0 to 1.0) above which pairs are flagged (default: 0.7).

### Execute Rebalancing
Perform rebalancing actions.

```bash
python backend/src/cli/rebalance.py execute [--dry-run] [--threshold <FLOAT>]
```

**Arguments:**
- `--dry-run`: Evaluate and return proposed actions WITHOUT executing real trades. **Always start with this.**
- `--threshold <FLOAT>`: Correlation threshold (default: 0.7).

## Output Format (JSON)

### Check Output
```json
{
  "needs_rebalance": true,
  "high_correlation_pairs": [
    {
      "ticker1": "7203.T",
      "ticker2": "7267.T",
      "correlation": 0.85
    }
  ]
}
```

### Execute Output
```json
{
  "executed": false,   // True if trades were actually placed
  "action_count": 1,
  "actions": [
    {
      "type": "REBALANCE",
      "sell": {
        "ticker": "7267.T",
        "quantity": 100,
        "price": 2500,
        "reason": "High correlation (0.85) with 7203.T"
      },
      "buy": {
        "ticker": "6758.T",
        "quantity": 20,
        "price": 12000,
        "reason": "Replacement for diversification"
      }
    }
  ]
}
```
