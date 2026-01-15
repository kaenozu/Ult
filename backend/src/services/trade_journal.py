"""
Trade journal generator with lightweight heuristics for next actions.
"""

import datetime
from pathlib import Path
from typing import Dict

import pandas as pd

from src import demo_data
from src.paper_trader import PaperTrader


def _load_data(use_demo: bool):
    if use_demo:
        trades = demo_data.generate_trade_history(days=120)
        positions = demo_data.generate_positions()
        equity = demo_data.generate_equity_history(days=120)
        equity.columns = ["date", "total_equity"]
        return trades, positions, equity

    pt = PaperTrader()
    try:
        trades = pt.get_trade_history()
        positions = pt.get_positions()
        equity = pd.DataFrame(pt.get_equity_history(), columns=["date", "total_equity"])
    finally:
        pt.close()
    return trades, positions, equity


def _metrics(trades: pd.DataFrame, equity: pd.DataFrame) -> Dict:
    win_rate = 0.0
    avg_win = 0.0
    avg_loss = 0.0
    profit_factor = 0.0
    max_dd = 0.0

    if not trades.empty and "realized_pnl" in trades.columns:
        closed = trades[trades["realized_pnl"] != 0]
        if not closed.empty:
            wins = closed[closed["realized_pnl"] > 0]["realized_pnl"]
            losses = closed[closed["realized_pnl"] < 0]["realized_pnl"]
            total = len(closed)
            win_rate = len(wins) / total if total else 0.0
            avg_win = wins.mean() if not wins.empty else 0.0
            avg_loss = losses.mean() if not losses.empty else 0.0
            profit_factor = (wins.mean() / abs(losses.mean())) if not losses.empty else 0.0

    if not equity.empty and "total_equity" in equity.columns:
        eq = equity["total_equity"].astype(float)
        peak = eq.cummax()
        dd = ((eq / peak) - 1).min()
        max_dd = float(dd) if pd.notna(dd) else 0.0

    return {
        "win_rate": win_rate,
        "avg_win": avg_win,
        "avg_loss": avg_loss,
        "profit_factor": profit_factor,
        "max_dd": max_dd,
    }


def _next_actions(metrics: Dict, positions: pd.DataFrame) -> Dict[str, str]:
    actions = []
    if metrics["win_rate"] < 0.45:
        actions.append("勝率が落ちています。ポジションサイズを一段階縮小し、エントリー条件を厳格化。")
    if metrics["max_dd"] < -0.08:
        actions.append("最大DDが大きいので防御モードをオンにし、ヘッジを検討。")
    if positions.empty:
        actions.append("ポジションなし。朝スキャン後のTOP3のみ小ロットでテスト。")
    else:
        top_pos = positions.sort_values("quantity", ascending=False).head(1)
        if not top_pos.empty:
            tkr = top_pos.iloc[0]["ticker"]
            actions.append(f"最大保有銘柄 {tkr} のストップを最新高値から再設定。")
    if not actions:
        actions.append("現状維持でOK。勝率とDDが安定しています。")
    return {"next_actions": actions}


def generate_journal(use_demo: bool = False) -> Dict:
    trades, positions, equity = _load_data(use_demo)
    m = _metrics(trades, equity)
    next_actions = _next_actions(m, positions)["next_actions"]

    lines = [
        "# トレード日誌",
        f"- 生成時刻: {datetime.datetime.now()}",
        f"- 勝率: {m['win_rate']:.0%}",
        f"- 平均勝ち: {m['avg_win']:,.0f} / 平均負け: {m['avg_loss']:,.0f}",
        f"- PF: {m['profit_factor']:.2f}",
        f"- 最大DD: {m['max_dd']:.2%}",
        "",
        "## 改善ポイント / 次の一手",
    ]
    for item in next_actions:
        lines.append(f"- {item}")

    report_path = save_journal(lines)
    return {"metrics": m, "next_actions": next_actions, "report_path": report_path}


def save_journal(lines: list) -> str:
    reports_dir = Path("reports")
    reports_dir.mkdir(exist_ok=True)
    stamp = datetime.datetime.now().strftime("%Y%m%d_%H%M")
    path = reports_dir / f"trade_journal_{stamp}.md"
    path.write_text("\n".join(lines), encoding="utf-8")
    return str(path)
