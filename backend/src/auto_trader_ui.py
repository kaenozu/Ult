# -*- coding: utf-8 -*-
import json
import os
import time
from datetime import datetime

import pandas as pd
import streamlit as st
from src.trading.fully_automated_trader import FullyAutomatedTrader

from src.paper_trader import PaperTrader


def create_auto_trader_ui():
    st.header("🚀 フルオート取引システム")
    st.write("完全自動化されたAI取引システムを管理します。")

    config_path = "config.json"
    config = load_config(config_path)

    col1, col2, col3 = st.columns([1, 1, 1])

    with col1:
        render_status_card(config)

    with col2:
        render_control_center(config, config_path)

    with col3:
        render_todays_summary()


def load_config(path):
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except BaseException:
            return {}
    return {}


def save_config(config, path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=4, ensure_ascii=False)


def render_status_card(config):
    auto_enabled = config.get("auto_trading", {}).get("enabled", False)
    rakuten_enabled = config.get("rakuten", {}).get("enabled", False)

    st.subheader("システム状態")

    if auto_enabled:
        st.success("✅ 自動取引: 有効")
    else:
        st.warning("⏸️ 自動取引: 停止中")

    if rakuten_enabled:
        st.info("楽天証券連携: ON")
    else:
        st.info("楽天証券連携: OFF (ペーパートレードのみ)")


def render_control_center(config, config_path):
    st.subheader("コントロールセンター")

    current_status = config.get("auto_trading", {}).get("enabled", False)
    on = st.checkbox("🤖 自動取引システム", value=current_status)

    if on != current_status:
        if "auto_trading" not in config:
            config["auto_trading"] = {}
        config["auto_trading"]["enabled"] = on
        save_config(config, config_path)
        if on:
            st.success("システムを起動しました")
        else:
            st.warning("システムを停止しました")
        time.sleep(1)
        st.experimental_rerun()

    if on:
        st.success("🟢 システム稼働中")

        if st.button("🚀 強制実行", use_container_width=True):
            with st.status("実行中...", expanded=True) as status:
                try:
                    trader = FullyAutomatedTrader(config_path)
                    trader.daily_routine(force_run=True)
                    status.update(label="✅ 完了", state="complete", expanded=False)
                    st.success("実行完了")
                    time.sleep(2)
                    st.experimental_rerun()
                except Exception as e:
                    status.update(label="❌ エラー", state="error")
                    st.error(f"エラー: {e}")

    # --- 資産クラス設定 ---
    st.markdown("---")
    st.subheader("🌍 取引対象資産設定")

    col_assets1, col_assets2 = st.columns(2)

    current_assets = config.get(
        "assets",
        {
            "japan_stocks": True,
            "us_stocks": True,
            "europe_stocks": True,
            "crypto": False,
            "fx": False,
        },
    )

    with col_assets1:
        jp_stocks = st.checkbox("🇯🇵 日本株 (Nikkei 225)", value=current_assets.get("japan_stocks", True))
        us_stocks = st.checkbox("🇺🇸 米国株 (S&P 500)", value=current_assets.get("us_stocks", True))
        eu_stocks = st.checkbox("🇪🇺 欧州株 (STOXX 50)", value=current_assets.get("europe_stocks", True))

    with col_assets2:
        crypto = st.checkbox("₿ 暗号資産 (Crypto)", value=current_assets.get("crypto", False))
        fx = st.checkbox("💱 FX (主要通貨ペア)", value=current_assets.get("fx", False))

    # Save logic
    new_assets = {
        "japan_stocks": jp_stocks,
        "us_stocks": us_stocks,
        "europe_stocks": eu_stocks,
        "crypto": crypto,
        "fx": fx,
    }

    if new_assets != current_assets:
        config["assets"] = new_assets
        save_config(config, config_path)
        st.success("資産クラス設定を更新しました")
        st.experimental_rerun()


def render_todays_summary():
    st.subheader("本日の実績")

    pt = PaperTrader()
    history = pt.get_trade_history()

    if history.empty:
        st.info("取引データなし")
        return

    if "timestamp" in history.columns:
        if not pd.api.types.is_datetime64_any_dtype(history["timestamp"]):
            history["timestamp"] = pd.to_datetime(history["timestamp"])
        today = datetime.now().date()
        today_trades = history[history["timestamp"].dt.date == today]
    else:
        today_trades = pd.DataFrame()

    if today_trades.empty:
        st.info("本日の取引はまだありません")
    else:
        buy_count = len(today_trades[today_trades["action"] == "BUY"])
        sell_count = len(today_trades[today_trades["action"] == "SELL"])
        pnl = today_trades["realized_pnl"].sum() if "realized_pnl" in today_trades.columns else 0

        col_a, col_b = st.columns(2)
        col_a.metric("約定回数", f"{len(today_trades)}回", f"買{buy_count}/売{sell_count}")
        col_b.metric("確定損益", f"¥{pnl:,.0f}", delta_color="normal")
