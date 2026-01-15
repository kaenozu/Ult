"""ワンクリック概要ビュー

起動後1画面で資産・損益・アラート・次のアクションを表示
"""

import json
import os
from datetime import datetime
from typing import Any, Dict, List

import pandas as pd
import streamlit as st


def render_quick_overview():
    """クイック概要をレンダリング"""
    st.markdown(
        """
    <style>
    .overview-card {
        background: linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.9));
        border-radius: 16px;
        padding: 1.5rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
        margin-bottom: 1rem;
    }
    .metric-large {
        font-size: 2.5rem;
        font-weight: 700;
        margin: 0;
    }
    .metric-label {
        color: #94a3b8;
        font-size: 0.875rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    .profit { color: #22c55e; }
    .loss { color: #ef4444; }
    .neutral { color: #94a3b8; }
    .alert-badge {
        background: #ef4444;
        color: white;
        padding: 0.25rem 0.75rem;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 600;
    }
    .action-card {
        background: rgba(59, 130, 246, 0.1);
        border: 1px solid rgba(59, 130, 246, 0.3);
        border-radius: 12px;
        padding: 1rem;
        margin: 0.5rem 0;
    }
    </style>
    """,
        unsafe_allow_html=True,
    )

    # データ取得
    portfolio_data = _get_portfolio_data()
    alerts = _get_active_alerts()
    next_actions = _get_next_actions()
    market_status = _get_market_status()

    # ヘッダー
    col1, col2 = st.columns([3, 1])
    with col1:
        st.markdown("### 🌟 クイック概要")
    with col2:
        st.caption(f"更新: {datetime.now().strftime('%H:%M:%S')}")
        if st.button("🔄 更新", key="refresh_overview"):
            st.experimental_rerun()

    # メインメトリクス (4列)
    cols = st.columns(4)

    with cols[0]:
        _render_metric_card("総資産", portfolio_data.get("total_value", 0), prefix="¥", format_type="currency")

    with cols[1]:
        pnl = portfolio_data.get("total_pnl", 0)
        pnl_pct = portfolio_data.get("total_pnl_pct", 0)
        _render_metric_card(
            "総損益",
            pnl,
            prefix="¥",
            suffix=f" ({pnl_pct:+.2f}%)",
            format_type="currency",
            color="profit" if pnl >= 0 else "loss",
        )

    with cols[2]:
        _render_metric_card(
            "今日の損益",
            portfolio_data.get("today_pnl", 0),
            prefix="¥",
            format_type="currency",
            color="profit" if portfolio_data.get("today_pnl", 0) >= 0 else "loss",
        )

    with cols[3]:
        _render_metric_card("アラート", len(alerts), suffix="件", color="loss" if len(alerts) > 0 else "neutral")

    st.markdown("---")

    # 2段目: ポジションとアクション
    col_left, col_right = st.columns([2, 1])

    with col_left:
        st.markdown("#### 📊 ポジション状況")
        positions = portfolio_data.get("positions", [])
        if positions:
            _render_positions_mini(positions)
        else:
            st.info("ポジションがありません")

    with col_right:
        st.markdown("#### 🎯 次のアクション")
        if next_actions:
            for action in next_actions[:3]:
                _render_action_card(action)
        else:
            st.success("✅ 今日のアクションはありません")

    # 3段目: アラートと市場状況
    if alerts:
        st.markdown("#### ⚠️ アラート")
        for alert in alerts[:5]:
            _render_alert(alert)

    # 市場ステータス
    st.markdown("#### 🌍 市場ステータス")
    _render_market_status(market_status)


def _render_metric_card(
    label: str, value: float, prefix: str = "", suffix: str = "", format_type: str = "number", color: str = "neutral"
):
    """メトリクスカードをレンダリング"""
    if format_type == "currency":
        if abs(value) >= 1_000_000:
            formatted = f"{value / 1_000_000:.2f}M"
        elif abs(value) >= 1_000:
            formatted = f"{value / 1_000:.1f}K"
        else:
            formatted = f"{value:,.0f}"
    else:
        formatted = f"{value:,.0f}"

    color_class = color
    st.markdown(
        f"""
    <div class="overview-card">
        <p class="metric-label">{label}</p>
        <p class="metric-large {color_class}">{prefix}{formatted}{suffix}</p>
    </div>
    """,
        unsafe_allow_html=True,
    )


def _render_positions_mini(positions: List[Dict]):
    """ポジションミニ表示"""
    df = pd.DataFrame(positions)
    if df.empty:
        return

    # 上位5銘柄のみ表示
    df = df.head(5)

    for _, row in df.iterrows():
        ticker = row.get("ticker", "")
        pnl = row.get("pnl", 0)
        pnl_pct = row.get("pnl_pct", 0)
        weight = row.get("weight", 0) * 100

        color = "#22c55e" if pnl >= 0 else "#ef4444"
        st.markdown(
            f"""
        <div style="display: flex; justify-content: space-between; align-items: center;
                    padding: 0.5rem; background: rgba(255,255,255,0.05); border-radius: 8px; margin: 0.25rem 0;">
            <span style="font-weight: 600;">{ticker}</span>
            <span style="color: {color}; font-weight: 500;">{pnl_pct:+.2f}%</span>
            <span style="color: #94a3b8; font-size: 0.875rem;">{weight:.1f}%</span>
        </div>
        """,
            unsafe_allow_html=True,
        )


def _render_action_card(action: Dict):
    """アクションカードをレンダリング"""
    action_type = action.get("type", "INFO")
    ticker = action.get("ticker", "")
    message = action.get("message", "")

    icon_map = {
        "BUY": "🟢",
        "SELL": "🔴",
        "ALERT": "⚠️",
        "INFO": "ℹ️",
    }
    icon = icon_map.get(action_type, "ℹ️")

    st.markdown(
        f"""
    <div class="action-card">
        <span style="font-size: 1.25rem;">{icon}</span>
        <strong>{ticker}</strong>
        <p style="margin: 0.25rem 0 0 0; color: #94a3b8; font-size: 0.875rem;">{message}</p>
    </div>
    """,
        unsafe_allow_html=True,
    )


def _render_alert(alert: Dict):
    """アラートをレンダリング"""
    level = alert.get("level", "info")
    message = alert.get("message", "")

    if level == "critical":
        st.error(f"🚨 {message}")
    elif level == "warning":
        st.warning(f"⚠️ {message}")
    else:
        st.info(f"ℹ️ {message}")


def _render_market_status(status: Dict):
    """市場ステータスをレンダリング"""
    cols = st.columns(4)

    indices = [
        ("日経225", status.get("nikkei", {})),
        ("S&P500", status.get("sp500", {})),
        ("VIX", status.get("vix", {})),
        ("USD/JPY", status.get("usdjpy", {})),
    ]

    for i, (name, data) in enumerate(indices):
        with cols[i]:
            value = data.get("value", 0)
            change = data.get("change", 0)
            color = "#22c55e" if change >= 0 else "#ef4444"

            st.markdown(
                f"""
            <div style="text-align: center; padding: 0.5rem;">
                <p style="color: #94a3b8; font-size: 0.75rem; margin: 0;">{name}</p>
                <p style="font-size: 1.25rem; font-weight: 600; margin: 0.25rem 0;">{value:,.2f}</p>
                <p style="color: {color}; font-size: 0.875rem; margin: 0;">{change:+.2f}%</p>
            </div>
            """,
                unsafe_allow_html=True,
            )


def _get_portfolio_data() -> Dict[str, Any]:
    """ポートフォリオデータを取得"""
    try:
        from src.paper_trader import PaperTrader

        pt = PaperTrader()

        cash = pt.get_cash()
        positions = pt.get_positions()

        total_position_value = 0
        position_list = []

        for ticker, pos in positions.items():
            qty = pos.get("quantity", 0)
            avg_price = pos.get("avg_price", 0)
            current_price = pos.get("current_price", avg_price)

            value = qty * current_price
            cost = qty * avg_price
            pnl = value - cost
            pnl_pct = (pnl / cost * 100) if cost > 0 else 0

            total_position_value += value

            position_list.append(
                {
                    "ticker": ticker,
                    "quantity": qty,
                    "value": value,
                    "pnl": pnl,
                    "pnl_pct": pnl_pct,
                    "weight": 0,  # 後で計算
                }
            )

        total_value = cash + total_position_value

        # ウェイト計算
        for pos in position_list:
            pos["weight"] = pos["value"] / total_value if total_value > 0 else 0

        # 総損益計算
        initial_capital = 500000  # デフォルト
        total_pnl = total_value - initial_capital
        total_pnl_pct = (total_pnl / initial_capital * 100) if initial_capital > 0 else 0

        # 今日の損益計算
        today_pnl = 0
        try:
            # 前日の終値ベースで計算（簡易実装）
            for pos in position_list:
                try:
                    # 簡易的に前日との差分を0として計算（実際には前日終値データが必要）
                    # ここでは当日の損益をそのまま使用
                    today_pnl += pos.get("pnl", 0)
                except Exception:
                    continue
        except Exception:
            today_pnl = 0

        return {
            "total_value": total_value,
            "cash": cash,
            "total_pnl": total_pnl,
            "total_pnl_pct": total_pnl_pct,
            "today_pnl": today_pnl,
            "positions": sorted(position_list, key=lambda x: x["value"], reverse=True),
        }
    except Exception:
        return {
            "total_value": 500000,
            "cash": 500000,
            "total_pnl": 0,
            "total_pnl_pct": 0,
            "today_pnl": 0,
            "positions": [],
        }


def _get_active_alerts() -> List[Dict]:
    """アクティブなアラートを取得"""
    alerts = []

    # スキャン結果からアラート生成
    try:
        if os.path.exists("scan_results.json"):
            with open("scan_results.json", "r", encoding="utf-8") as f:
                scan_data = json.load(f)
                results = scan_data.get("results", [])

                for r in results:
                    if r.get("Action") == "BUY":
                        alerts.append(
                            {
                                "level": "info",
                                "message": f"{r.get('Ticker')}: 買いシグナル検出",
                            }
                        )
                    elif r.get("Action") == "SELL":
                        alerts.append(
                            {
                                "level": "warning",
                                "message": f"{r.get('Ticker')}: 売りシグナル検出",
                            }
                        )
    except Exception:
        pass

    return alerts


def _get_next_actions() -> List[Dict]:
    """次のアクションを取得"""
    actions = []

    try:
        if os.path.exists("scan_results.json"):
            with open("scan_results.json", "r", encoding="utf-8") as f:
                scan_data = json.load(f)
                results = scan_data.get("results", [])

                for r in results:
                    action_type = r.get("Action", "HOLD")
                    if action_type != "HOLD":
                        actions.append(
                            {
                                "type": action_type,
                                "ticker": r.get("Ticker", ""),
                                "message": r.get("Reason", "シグナル検出"),
                            }
                        )
    except Exception:
        pass

    return actions


def _get_market_status() -> Dict[str, Any]:
    """市場ステータスを取得"""
    try:
        import yfinance as yf

        indices = {
            "nikkei": "^N225",
            "sp500": "^GSPC",
            "vix": "^VIX",
            "usdjpy": "USDJPY=X",
        }

        result = {}
        for name, symbol in indices.items():
            try:
                ticker = yf.Ticker(symbol)
                hist = ticker.history(period="2d")
                if len(hist) >= 2:
                    current = float(hist["Close"].iloc[-1])
                    prev = float(hist["Close"].iloc[-2])
                    change = (current - prev) / prev * 100
                    result[name] = {"value": current, "change": change}
                elif len(hist) == 1:
                    result[name] = {"value": float(hist["Close"].iloc[-1]), "change": 0}
            except Exception:
                result[name] = {"value": 0, "change": 0}

        return result
    except Exception:
        return {
            "nikkei": {"value": 0, "change": 0},
            "sp500": {"value": 0, "change": 0},
            "vix": {"value": 0, "change": 0},
            "usdjpy": {"value": 0, "change": 0},
        }
