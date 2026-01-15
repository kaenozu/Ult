"""
What-if scenario simulator for current portfolio holdings.
"""

from typing import Dict

import pandas as pd

from src import demo_data
from src.paper_trader import PaperTrader

SCENARIOS = {
    "index_drop": {"label": "指数 -3%", "shock_pct": -0.03, "note": "日経・S&P一斉下落"},
    "fx_plus": {"label": "為替 +2円 (円安)", "shock_pct": 0.015, "note": "輸出株追い風/輸入株逆風"},
    "fx_minus": {"label": "為替 -2円 (円高)", "shock_pct": -0.015, "note": "輸出株逆風"},
    "sector_shock": {"label": "セクターショック -7%", "shock_pct": -0.07, "note": "特定セクター急落"},
}


def _load_positions(use_demo: bool = False) -> pd.DataFrame:
    if use_demo:
        return demo_data.generate_positions()
    pt = PaperTrader()
    try:
        positions = pt.get_positions()
    finally:
        pt.close()
    return positions


def simulate(use_demo: bool, key: str) -> Dict:
    positions = _load_positions(use_demo)
    if positions.empty:
        return {"has_data": False, "message": "ポジションがありません"}

    scenario = SCENARIOS.get(key, {})
    shock = float(scenario.get("shock_pct", 0.0))
    positions = positions.copy()
    positions["value"] = positions["quantity"] * positions["current_price"]
    positions["shocked_price"] = positions["current_price"] * (1 + shock)
    positions["shocked_value"] = positions["quantity"] * positions["shocked_price"]
    total = positions["value"].sum()
    shocked_total = positions["shocked_value"].sum()
    delta = shocked_total - total
    delta_pct = delta / total if total else 0.0

    if "sector" in positions:
        sector_pnl = (
            positions.assign(pnl=positions["shocked_value"] - positions["value"])
            .groupby("sector")["pnl"]
            .sum()
            .sort_values(ascending=True)
        )
    else:
        sector_pnl = None

    hedge = "指数ショートかプット買いでエクスポージャー半減" if shock < 0 else "利確・トレーリングで上昇取りこぼし防止"

    return {
        "has_data": True,
        "label": scenario.get("label", key),
        "note": scenario.get("note", ""),
        "delta": delta,
        "delta_pct": delta_pct,
        "positions": positions,
        "sector_pnl": sector_pnl,
        "hedge": hedge,
    }
