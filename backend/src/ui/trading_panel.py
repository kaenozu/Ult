"""
Trading Panel UI Module
Handles the Paper Trading interface (manual trading, positions, history).
"""

import plotly.graph_objects as go
import streamlit as st


from src.constants import MARKETS, TICKER_NAMES
from src.data_loader import fetch_stock_data
from src.formatters import format_currency
from src.paper_trader import PaperTrader
import pandas as pd
from datetime import datetime, timedelta


def render_trading_panel(sidebar_config):
    """
    Renders the Paper Trading tab content.
    """
    st.header("ペーパートレーディング (仮想売買)")
    st.write("リアルタイムの株価チャートを用い、仮想資金でトレード練習ができます。")

    pt = PaperTrader()

    # Refresh Button
    if st.button("最新価格で評価額を更新"):
        with st.spinner("現在値を更新中..."):
            pt.update_daily_equity()
            st.success("更新完了")

    # Dashboard
    balance = pt.get_current_balance()

    col1, col2, col3 = st.columns(3)
    col1.metric("現金残高 (Cash)", format_currency(balance["cash"]))
    col2.metric("総資産 (Total Equity)", format_currency(balance["total_equity"]))

    pnl = balance["total_equity"] - pt.initial_capital
    pnl_pct = (pnl / pt.initial_capital) * 100
    col3.metric("全期間損益", format_currency(pnl), delta=f"{pnl_pct:+.1f}%")

    st.divider()

    col_left, col_right = st.columns([2, 1])

    with col_left:
        st.subheader("現在の保有ポジション")
        positions = pt.get_positions()
        if not positions.empty:
            # Format for display
            pos_display = positions.copy()

            # Add Company Name
            pos_display["name"] = pos_display["ticker"].map(lambda x: TICKER_NAMES.get(x, x))

            # Calculate metrics
            if "current_price" in pos_display.columns:
                pos_display["unrealized_pnl_pct"] = (
                    pos_display["current_price"] - pos_display["entry_price"]
                ) / pos_display["entry_price"]
            else:
                pos_display["unrealized_pnl_pct"] = 0.0

            pos_display["acquisition_cost"] = pos_display["entry_price"] * pos_display["quantity"]

            # Select and Reorder columns - Market Value is usually returned by get_positions as 'market_value'
            # If not, calculate it
            if "market_value" not in pos_display.columns:
                pos_display["market_value"] = pos_display["current_price"] * pos_display["quantity"]

            target_cols = [
                "name",
                "ticker",
                "quantity",
                "entry_price",
                "current_price",
                "acquisition_cost",
                "market_value",
                "unrealized_pnl",
                "unrealized_pnl_pct",
            ]
            
            # --- Date Calculation Logic ---
            # Ensure entry_date is available and calculate estimated exit
            if "entry_date" in pos_display.columns:
                # Fill NaN with today's date or leave as is, converting to datetime
                pos_display["entry_date"] = pd.to_datetime(pos_display["entry_date"], errors='coerce')
                
                # Calculate estimated exit (Dynamic AI Prediction)
                # Goal: +10% gain.
                # Speed: Volatility (Price units per day). Assumption: 0.5 sigma move per day on average towards trend
                def calc_ai_date(row):
                    start_date = row["entry_date"]
                    if pd.isna(start_date): return start_date
                    
                    target_price = row["entry_price"] * 1.10
                    current = row["current_price"]
                    gap = target_price - current
                    vol = row.get("volatility", 0.0)
                    
                    if gap <= 0: return start_date + timedelta(days=1) # Already reached?
                    
                    days_needed = 14 # Default
                    if vol > 0:
                        # Gap / (0.3 * Volatility) -> Conservative estimate of daily trend progress
                        days_needed = int(gap / (vol * 0.3))
                        days_needed = max(1, min(days_needed, 60)) # Cap between 1 and 60 days
                    
                    # Logic is relative to TODAY if we are recalculating, or Entry?
                    # "Prediction" usually implies "From Now".
                    # Let's say: Today + Remaining Days needed.
                    
                    return datetime.now() + timedelta(days=days_needed)

                pos_display["estimated_exit_date"] = pos_display.apply(calc_ai_date, axis=1)
                
                # Format for display (YYYY-MM-DD)
                pos_display["entry_date"] = pos_display["entry_date"].dt.strftime('%Y-%m-%d').fillna("-")
                pos_display["estimated_exit_date"] = pos_display["estimated_exit_date"].dt.strftime('%Y-%m-%d').fillna("-")
                
                target_cols.extend(["entry_date", "estimated_exit_date"])
            
            existing_cols = [c for c in target_cols if c in pos_display.columns]
            pos_display = pos_display[existing_cols]

            # Rename for display
            # Map robustly based on what exists
            col_map = {
                "name": "銘柄名",
                "ticker": "コード",
                "quantity": "保有数量",
                "entry_price": "取得単価",
                "current_price": "現在値",
                "acquisition_cost": "取得金額",
                "market_value": "時価評価額",
                "unrealized_pnl": "評価損益",
                "unrealized_pnl_pct": "損益比率",
                "entry_date": "購入日",
                "estimated_exit_date": "AI予測売却日",
            }
            pos_display = pos_display.rename(columns=col_map)

            # Apply styling
            st.dataframe(
                pos_display.style.format(
                    {
                        "取得単価": "¥{:,.0f}",
                        "現在値": "¥{:,.0f}",
                        "取得金額": "¥{:,.0f}",
                        "時価評価額": "¥{:,.0f}",
                        "評価損益": "¥{:,.0f}",
                        "損益比率": "{:.1%}",
                    }
                ),
                use_container_width=True,
            )
        else:
            st.info("現在保有しているポジションはありません。")

    with col_right:
        st.subheader("手動注文")
        with st.form("order_form"):
            ticker_input = st.text_input("銘柄コード (例: 7203.T)")
            action_input = st.selectbox("売買", ["BUY", "SELL"])
            # Unit size logic from sidebar config
            trading_unit_step = sidebar_config.get("trading_unit", 100)

            qty_input = st.number_input("数量", min_value=1, step=trading_unit_step, value=trading_unit_step)

            submitted = st.form_submit_button("注文実行")
            if submitted and ticker_input:
                # Get current price
                price_data = fetch_stock_data([ticker_input], period="1d")
                if ticker_input in price_data and not price_data[ticker_input].empty:
                    current_price = price_data[ticker_input]["Close"].iloc[-1]

                    if pt.execute_trade(
                        ticker_input,
                        action_input,
                        qty_input,
                        current_price,
                        reason="Manual",
                    ):
                        st.success(f"{action_input}注文完了しました: {ticker_input} @ {current_price}")
                        st.experimental_rerun()
                    else:
                        st.error("注文失敗しました。資金不足または保有株不足です。")
                else:
                    st.error("価格チャートの取得に失敗しました。")

    st.divider()
    st.subheader("取引履歴")
    history = pt.get_trade_history()
    if not history.empty:
        st.dataframe(history, use_container_width=True)
    else:
        st.info("取引履歴はありません。")

    # --- Equity Curve Visualization (Added from previous app.py logic) ---
    st.divider()
    st.subheader("資産推移")
    equity_history = pt.get_equity_history()
    if not equity_history.empty:
        fig_equity = go.Figure()
        fig_equity.add_trace(
            go.Scatter(
                x=equity_history["date"],
                y=equity_history["total_equity"],
                mode="lines",
                name="Total Equity",
                line=dict(color="gold", width=2),
            )
        )
        fig_equity.add_hline(
            y=pt.initial_capital,
            line_dash="dash",
            line_color="gray",
            annotation_text="初期資産",
        )
        fig_equity.update_layout(
            title="資産推移 - ペーパートレーディング -",
            xaxis_title="日付",
            yaxis_title="資産 (円)",
            hovermode="x unified",
        )
        st.plotly_chart(fig_equity, use_container_width=True)
    else:
        st.info("まだ推移チャートがありません。")

    # --- Alert Config (Placeholder) ---
    st.divider()
    st.subheader("🔔 アラート設定")
    st.write("価格変動アラートを設定できます（準備実装中）。")

    # Use selected market ticker list for suggestion
    selected_market = sidebar_config.get("selected_market", "Japan")
    markets_list = MARKETS.get(selected_market, MARKETS["Japan"])

    alert_ticker = st.selectbox(
        "監視する銘柄",
        options=markets_list[:10],
        format_func=lambda x: f"{x} - {TICKER_NAMES.get(x, '')}",
    )

    col_a1, col_a2 = st.columns(2)
    with col_a1:
        alert_type = st.selectbox("アラートタイプ", ["価格上昇", "価格下落"])
    with col_a2:
        threshold = st.number_input("閾値 (%)", min_value=1.0, max_value=50.0, value=5.0, step=0.5)

    if st.button("アラートを設定"):
        st.success(f"✅{alert_ticker} の{alert_type}アラート({threshold}%)を設定しました (デモ)")
