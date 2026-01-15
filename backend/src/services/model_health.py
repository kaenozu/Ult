"""
Lightweight model health checker (drift/hit-rate) with a retrain flag helper.
"""

from pathlib import Path
from typing import Dict

import numpy as np
import pandas as pd

from src import demo_data
from src.paper_trader import PaperTrader


def _load_equity(use_demo: bool = False) -> pd.DataFrame:
    if use_demo:
        eq = demo_data.generate_equity_history(days=120)
        eq.columns = ["date", "total_equity"]
        return eq
    pt = PaperTrader()
    try:
        eq = pd.DataFrame(pt.get_equity_history(), columns=["date", "total_equity"])
    finally:
        pt.close()
    return eq


def compute_health(use_demo: bool = False) -> Dict:
    eq = _load_equity(use_demo)
    if eq.empty or "total_equity" not in eq.columns:
        return {"status": "unknown", "reason": "equity data missing"}

    eq["date"] = pd.to_datetime(eq["date"])
    eq = eq.sort_values("date")
    eq["ret"] = eq["total_equity"].pct_change().fillna(0)

    short_win = float((eq["ret"].tail(20) > 0).mean()) if len(eq) >= 5 else 0.0
    long_win = float((eq["ret"] > 0).mean()) if len(eq) >= 20 else short_win

    short_mean = float(eq["ret"].tail(20).mean())
    long_mean = float(eq["ret"].tail(60).mean()) if len(eq) >= 60 else short_mean
    drift = short_mean - long_mean

    peak = eq["total_equity"].cummax()
    dd = ((eq["total_equity"] - peak) / peak).min()
    max_dd = float(dd) if not np.isnan(dd) else 0.0

    status = "healthy"
    reason = "Win rate and drift are stable."
    if short_win < 0.45 or drift < -0.002:
        status = "degraded"
        reason = "Recent hit-rate is softening or drift is negative."
    if max_dd < -0.1:
        status = "alert"
        reason = "Drawdown exceeds 10%, consider refresh."

    return {
        "status": status,
        "reason": reason,
        "short_win": short_win,
        "long_win": long_win,
        "drift": drift,
        "max_dd": max_dd,
    }


def write_retrain_flag(reason: str) -> str:
    path = Path("reports")
    path.mkdir(exist_ok=True)
    flag = path / "retrain_flag.txt"
    flag.write_text(reason, encoding="utf-8")
    return str(flag)
