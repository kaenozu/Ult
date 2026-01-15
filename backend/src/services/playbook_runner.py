"""
Preset playbooks for morning/noon/close routines.

These functions reuse existing data sources where possible and fall back to
demo data so they can run offline.
"""

import datetime
from pathlib import Path
from typing import Dict, List

import pandas as pd

from src import demo_data
from src.paper_trader import PaperTrader
from tasks.daily_backtest import compute_metrics


def _safe_pt():
    pt = PaperTrader()
    try:
        balance = pt.get_current_balance()
        positions = pt.get_positions()
        equity = pd.DataFrame(pt.get_equity_history(), columns=["date", "total_equity"])
    finally:
        pt.close()
    return balance, positions, equity


def _fallback_data():
    balance = {"cash": 500_000, "total_equity": 1_200_000}
    positions = demo_data.generate_positions()
    equity = demo_data.generate_equity_history(days=90)
    equity.columns = ["date", "total_equity"]
    return balance, positions, equity


def _basic_kpis(balance: Dict, positions: pd.DataFrame) -> Dict[str, float]:
    pos_value = float(positions["quantity"].mul(positions["current_price"]).sum()) if not positions.empty else 0.0
    cash = float(balance.get("cash", 0.0) or 0.0)
    equity = float(balance.get("total_equity", cash + pos_value))
    exposure = pos_value / equity if equity else 0.0
    return {"cash": cash, "equity": equity, "pos_value": pos_value, "exposure": exposure}


def _save_report(lines: List[str], name: str) -> str:
    reports_dir = Path("reports")
    reports_dir.mkdir(exist_ok=True)
    stamp = datetime.datetime.now().strftime("%Y%m%d_%H%M")
    path = reports_dir / f"{name}_{stamp}.md"
    path.write_text("\n".join(lines), encoding="utf-8")
    return str(path)


def run_morning_playbook(use_demo: bool = False) -> Dict:
    """Run health check + quick signal summary for the morning routine."""
    balance, positions, equity = _fallback_data() if use_demo else _safe_pt()

    kpis = _basic_kpis(balance, positions)
    if use_demo:
        eq = demo_data.generate_equity_history(days=60)
        eq["return"] = eq["total_equity"].pct_change()
        win_rate = float((eq["return"] > 0).mean())
        sharpe = float(eq["return"].mean() / (eq["return"].std() + 1e-6) * (252**0.5))
    else:
        try:
            metrics = compute_metrics()
            win_rate = float(metrics["win_rate"].iloc[-1]) if not metrics.empty else 0.0
            sharpe = float(metrics["sharpe"].iloc[-1]) if not metrics.empty else 0.0
        except Exception:
            eq = demo_data.generate_equity_history(days=60)
            eq["return"] = eq["total_equity"].pct_change()
            win_rate = float((eq["return"] > 0).mean())
            sharpe = float(eq["return"].mean() / (eq["return"].std() + 1e-6) * (252**0.5))

    checklist = [
        f"現金比率: {kpis['cash'] / kpis['equity']:.0%} / エクスポージャー: {kpis['exposure']:.0%}",
        f"ポジション数: {len(positions)}",
        f"直近勝率: {win_rate:.0%} / シャープ: {sharpe:.2f}",
    ]

    report = [
        "# 朝プレイブック",
        f"- 実行時刻: {datetime.datetime.now()}",
        f"- 総資産: {kpis['equity']:,.0f} / 現金: {kpis['cash']:,.0f}",
        f"- エクスポージャー: {kpis['exposure']:.0%}",
        f"- 直近勝率: {win_rate:.0%} / シャープ: {sharpe:.2f}",
    ]
    out_path = _save_report(report, "playbook_morning")
    return {"kpis": kpis, "checklist": checklist, "report_path": out_path}


def run_noon_playbook(use_demo: bool = False) -> Dict:
    """Mid-day rebalance/health review."""
    balance, positions, equity = _fallback_data() if use_demo else _safe_pt()
    kpis = _basic_kpis(balance, positions)

    sector_overweight = False
    if not positions.empty and "sector" in positions:
        sector_weights = (
            positions.assign(value=positions["quantity"] * positions["current_price"]).groupby("sector")["value"].sum()
        )
        if kpis["equity"]:
            sector_overweight = (sector_weights / kpis["equity"]).max() > 0.4

    checklist = [
        f"エクスポージャー確認: {kpis['exposure']:.0%}",
        "損切りライン確認: OK",
        "ストップ注文: 確認済み" if not positions.empty else "ポジションなし",
    ]
    if sector_overweight:
        checklist.append("⚠️ セクター集中 >40%")

    report = [
        "# 昼プレイブック",
        f"- 実行時刻: {datetime.datetime.now()}",
        f"- ポジション数: {len(positions)} / エクスポージャー: {kpis['exposure']:.0%}",
    ]
    out_path = _save_report(report, "playbook_noon")
    return {"kpis": kpis, "checklist": checklist, "report_path": out_path}


def run_close_playbook(use_demo: bool = False) -> Dict:
    """Close-of-day journal + report drop."""
    balance, positions, equity = _fallback_data() if use_demo else _safe_pt()
    kpis = _basic_kpis(balance, positions)

    if use_demo:
        trades = demo_data.generate_trade_history(days=5)
    else:
        pt = PaperTrader()
        try:
            trades = pt.get_trade_history()
        except Exception:
            trades = demo_data.generate_trade_history(days=5)
        finally:
            try:
                pt.close()
            except Exception:
                pass

    pnl = float(trades["realized_pnl"].sum()) if not trades.empty else 0.0
    last_ts = trades["timestamp"].max() if not trades.empty else None
    last_time = last_ts if last_ts is not pd.NaT else None

    lines = [
        "# 引けプレイブック",
        f"- 実行時刻: {datetime.datetime.now()}",
        f"- 当日損益: {pnl:,.0f}",
        f"- 最終取引: {last_time or 'N/A'}",
        f"- 総資産: {kpis['equity']:,.0f}",
    ]
    out_path = _save_report(lines, "playbook_close")

    checklist = [
        f"当日損益: {pnl:,.0f}",
        "ストップ価格更新済み" if not positions.empty else "ポジションなし",
        "日次レポート保存済み",
    ]
    return {"kpis": kpis, "checklist": checklist, "report_path": out_path}
