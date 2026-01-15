"""
Dashboard Main UI Module
Handles the market scan results and main dashboard display.
"""

import datetime
import json
import os

import pandas as pd
import streamlit as st

from src.constants import TICKER_NAMES
from src.formatters import get_risk_level
from src.paper_trader import PaperTrader
from src.ui_components import display_best_pick_card, display_error_message, display_sentiment_gauge


def render_market_scan_tab(sidebar_config):
    """
    Renders the Market Scan tab content with performance optimizations.
    """
    st.header("市場全体スキャン")
    
    # 1. 統計情報のキャッシュ（1時間）
    @st.cache_data(ttl=3600)
    def load_cached_scan_results():
        if os.path.exists("scan_results.json"):
            try:
                with open("scan_results.json", "r", encoding="utf-8") as f:
                    data = json.load(f)
                    scan_date = datetime.datetime.strptime(data["scan_date"], "%Y-%m-%d %H:%M:%S")
                    if scan_date.date() == datetime.date.today():
                        return data
            except Exception:
                pass
        return None

    # Unpack config
    enable_fund_filter = sidebar_config["enable_fund_filter"]
    max_per = sidebar_config["max_per"]
    max_pbr = sidebar_config["max_pbr"]
    min_roe = sidebar_config["min_roe"]
    trading_unit = sidebar_config["trading_unit"]

    cached_results = load_cached_scan_results()
    if cached_results:
        st.success(f"✅ 最新のスキャン結果を読み込みました ({cached_results['scan_date']})")

    # 2. フラグメント化されたアクションボタン（UI全体の再描画を抑制）
    @st.fragment
    def render_scan_button():
        if st.button(
            "市場をスキャンして推奨銘柄を探す (再スキャン)" if cached_results else "市場をスキャンして推奨銘柄を探す",
            type="primary",
            use_container_width=True
        ):
            st.session_state["trigger_scan"] = True
            st.rerun()

    render_scan_button()

    if st.session_state.get("trigger_scan"):
        st.session_state["trigger_scan"] = False
        return True  # Signal to run fresh scan

    if cached_results:
        sentiment = cached_results["sentiment"]
        results_data = cached_results["results"]

        # === 3. インクリメンタル表示（センチメント） ===
        with st.expander("📰 市場センチメント分析", expanded=True):
            display_sentiment_gauge(sentiment["score"], sentiment.get("news_count", 0))

            st.subheader("📰 最新ニュース見出し")
            if sentiment.get("top_news"):
                for i, news in enumerate(sentiment["top_news"][:5], 1):
                    st.markdown(f"{i}. [{news['title']}]({news['link']})")

        # === 4. 高速なデータフィルタリング ===
        results_df = pd.DataFrame(results_data)
        if not results_df.empty:
            actionable_df = results_df[results_df["Action"] != "HOLD"].copy()

            if enable_fund_filter:
                mask = (actionable_df["PER"].isna() | (actionable_df["PER"] <= max_per)) & \
                       (actionable_df["PBR"].isna() | (actionable_df["PBR"] <= max_pbr)) & \
                       (actionable_df["ROE"].isna() | (actionable_df["ROE"] >= min_roe / 100.0))
                
                filtered_count = len(actionable_df) - mask.sum()
                actionable_df = actionable_df[mask]
                
                if filtered_count > 0:
                    st.info(f"財務フィルタにより {filtered_count} 件が除外されました。")

            actionable_df = actionable_df.sort_values(by="Return", ascending=False)

            if not actionable_df.empty:
                best_pick = actionable_df.iloc[0]
                risk_level = get_risk_level(best_pick.get("Max Drawdown", -0.15))

                # 5. オーダー処理の最適化
                def handle_best_pick_order(ticker, action, price):
                    pt = PaperTrader()
                    trade_action = "BUY" if "BUY" in action else "SELL"
                    if pt.execute_trade(ticker, trade_action, trading_unit, price, reason=f"Best Pick"):
                        st.balloons()
                        st.toast(f"{ticker} 注文完了")
                    else:
                        st.error("注文失敗")

                display_best_pick_card(
                    ticker=best_pick["Ticker"],
                    name=best_pick["Name"],
                    action=best_pick["Action"],
                    price=best_pick["Last Price"],
                    explanation=best_pick.get("Explanation", ""),
                    strategy=best_pick["Strategy"],
                    risk_level=risk_level,
                    on_order_click=handle_best_pick_order,
                )

    return False
