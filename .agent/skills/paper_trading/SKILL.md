---
name: Paper Trading
description: Manage paper trading portfolio, check balance, and execute orders.
---

# Paper Trading Skill

This skill allows you to interact with the Ult Trading App's paper trading system. You can check your balance, view open positions, and execute buy/sell orders.

## Commands

### Check Balance
View current cash, total equity, and daily PnL.

```bash
python -m src.cli.paper_trade balance
```

### Citations
- [PaperTrader](file:///c:/gemini-thinkpad/Ult/backend/src/paper_trader.py)
- [CLI Wrapper](file:///c:/gemini-thinkpad/Ult/backend/src/cli/paper_trade.py)

### View Positions
View all current open positions.

```bash
python -m src.cli.paper_trade positions
```

### Execute Buy Order
Buy a stock.

```bash
python -m src.cli.paper_trade buy <ticker> <quantity> <price>
```

**Example:** Buy 100 shares of Toyota (7203.T) at 2000 yen.
```bash
python -m src.cli.paper_trade buy 7203.T 100 2000
```

### Execute Sell Order
Sell a stock.

```bash
python -m src.cli.paper_trade sell <ticker> <quantity> <price>
```

**Example:** Sell 100 shares of Toyota (7203.T) at 2100 yen.
```bash
python -m src.cli.paper_trade sell 7203.T 100 2100
```

## Notes
- All prices are in JPY.
- Tickers should generally follow Yahoo Finance format (e.g., `7203.T` for Japanese stocks).
- Ensure you check the balance before placing large buy orders.
