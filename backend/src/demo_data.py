"""Demo data generators for offline/dry-run modes."""

import datetime
import os
from typing import Optional

import numpy as np
import pandas as pd


def _rng(seed: Optional[int] = None):
    env_seed = os.getenv("DEMO_SEED")
    if seed is None and env_seed:
        try:
            seed = int(env_seed)
        except Exception:
            seed = None
    return np.random.default_rng(seed)


def generate_equity_history(
    days: int = 60, start_equity: float = 1_000_000, seed: Optional[int] = None
) -> pd.DataFrame:
    rng = pd.date_range(end=datetime.date.today(), periods=days, freq="D")
    gen = _rng(seed)
    returns = gen.normal(loc=0.0005, scale=0.01, size=days)
    equity = [start_equity]
    for r in returns:
        equity.append(equity[-1] * (1 + r))
    equity = equity[1:]
    return pd.DataFrame({"date": rng, "total_equity": equity})


def generate_positions(seed: Optional[int] = None) -> pd.DataFrame:
    gen = _rng(seed)
    prices = gen.uniform(120, 400, size=5)
    # Simulate some profit
    avg_prices = prices * gen.uniform(0.90, 0.98, size=5) 
    
    data = [
        {"ticker": "AAPL", "quantity": 50, "current_price": prices[0], "avg_price": avg_prices[0]},
        {"ticker": "MSFT", "quantity": 40, "current_price": prices[1], "avg_price": avg_prices[1]},
        {"ticker": "6758.T", "quantity": 100, "current_price": prices[2], "avg_price": avg_prices[2]},
        {"ticker": "AIR.PA", "quantity": 30, "current_price": prices[3], "avg_price": avg_prices[3]},
        {"ticker": "BTC-USD", "quantity": 0.5, "current_price": prices[4], "avg_price": avg_prices[4]},
    ]
    df = pd.DataFrame(data)
    df["market_value"] = df["quantity"] * df["current_price"]
    df["unrealized_pnl"] = (df["current_price"] - df["avg_price"]) * df["quantity"]
    df["unrealized_pnl_pct"] = (df["current_price"] / df["avg_price"]) - 1
    return df


def generate_trade_history(days: int = 30, seed: Optional[int] = None) -> pd.DataFrame:
    rng_dates = pd.date_range(end=datetime.date.today(), periods=days, freq="D")
    tickers = ["AAPL", "MSFT", "SPY", "6758.T", "AIR.PA"]
    gen = _rng(seed)
    records = []
    for i, dt in enumerate(rng_dates):
        records.append(
            {
                "date": dt.date().isoformat(),
                "timestamp": dt,
                "ticker": tickers[i % len(tickers)],
                "action": "BUY" if i % 3 else "SELL",
                "quantity": int(gen.integers(1, 50)),
                "price": float(gen.uniform(100, 400)),
                "realized_pnl": float(gen.uniform(-2000, 4000)),
                "reason": "demo",
            }
        )
    return pd.DataFrame(records)


def generate_backtest_history(days: int = 90, seed: Optional[int] = None) -> pd.DataFrame:
    """日次の勝率・シャープ比を疑似生成。"""
    rng_dates = pd.date_range(end=datetime.date.today(), periods=days, freq="D")
    gen = _rng(seed)
    win_rate = np.clip(gen.normal(loc=0.55, scale=0.08, size=days), 0.3, 0.75)
    sharpe = np.clip(gen.normal(loc=1.2, scale=0.4, size=days), -0.2, 2.5)
    return pd.DataFrame({"date": rng_dates, "win_rate": win_rate, "sharpe": sharpe})
