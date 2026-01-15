"""
Settings UI Module
Consolidates all application settings into a single tab.
"""

import json

import streamlit as st

from src.formatters import format_currency
from src.llm_reasoner import get_llm_reasoner
from src.paper_trader import PaperTrader


def render_settings_tab():
    """Renders the consolidated Settings tab."""
    st.header("⚙️ システム設定")

    # Top-level Toggle
    is_advanced = st.checkbox("🔧 専門家モード (Advanced Settings)", value=False)

    if is_advanced:
        _render_advanced_view()
    else:
        _render_simple_view()


def _render_simple_view():
    """Renders the Zero-Touch Status Dashboard."""
    st.markdown("### 🛡️ システムステータス (System Status)")

    col1, col2, col3 = st.columns(3)

    config = _load_config()
    res = get_llm_reasoner()

    with col1:
        st.metric("🧠 AI Brain", res.provider.upper())
        if config.get("openai_api_key") or config.get("gemini_api_key"):
            st.success("✅ Online")
        else:
            st.error("⚠️ Offline (No Key)")

    with col2:
        st.metric("🤖 Auto Trader", "Hyper-Autonomous")
        st.success("✅ Active (Background)")

    with col3:
        st.metric("🛡️ Risk Profile", "Adaptive (Regime-Based)")
        st.info("ℹ️ Auto-Adjusting")

    st.divider()

    # --- One-Touch Mode Control ---
    st.subheader("🎛️ 運用モード切替 (One-Touch)")

    # Define Modes
    MODES = {
        "攻めの運用 (Aggressive)": {
            "max_daily_trades": 10,
            "daily_loss_limit_pct": -8.0,
            "active_mode": True,
            "desc": "高リスク・高リターン。取引回数制限を緩和し、積極的な利益を狙います。",
        },
        "バランス (Balanced)": {
            "max_daily_trades": 5,
            "daily_loss_limit_pct": -5.0,
            "active_mode": True,
            "desc": "標準設定。リスクとリターンのバランスを重視します。（日次損失限度 -5%）",
        },
        "守りの運用 (Conservative)": {
            "max_daily_trades": 3,
            "daily_loss_limit_pct": -3.0,
            "active_mode": True,
            "desc": "安全第一。取引回数を抑え、損失限度を厳しく設定します。",
        },
        "監視のみ (Monitoring Only)": {
            "max_daily_trades": 0,
            "daily_loss_limit_pct": -2.0,
            "active_mode": True,
            "desc": "新規取引停止。既存ポジションの監視と緊急停止のみを行います。",
        },
    }

    auto_conf = config.get("auto_trading", {})
    alert_conf = config.get("alerts", {})

    # Detect current mode
    current_mode = "バランス (Balanced)"  # Default
    c_trades = int(auto_conf.get("max_daily_trades", 5))
    alert_conf.get("active_mode", False)

    if c_trades == 0:
        current_mode = "監視のみ (Monitoring Only)"
    elif c_trades >= 10:
        current_mode = "攻めの運用 (Aggressive)"
    elif c_trades <= 3:
        current_mode = "守りの運用 (Conservative)"

    selected_mode = st.selectbox(
        "現在の運用モード",
        options=list(MODES.keys()),
        index=list(MODES.keys()).index(current_mode),
        help="システムの振る舞いを一括で設定します。",
    )

    mode_info = MODES[selected_mode]
    st.info(f"ℹ️ {mode_info['desc']}")

    if selected_mode != current_mode:
        if st.button(f"「{selected_mode}」に切り替える"):
            # Update auto_trading
            if "auto_trading" not in config:
                config["auto_trading"] = {}
            config["auto_trading"]["max_daily_trades"] = mode_info["max_daily_trades"]
            config["auto_trading"]["daily_loss_limit_pct"] = mode_info["daily_loss_limit_pct"]

            # Update alerts
            if "alerts" not in config:
                config["alerts"] = {}
            config["alerts"]["active_mode"] = mode_info["active_mode"]

            _save_full_config(config)
            st.success(f"✅ モードを更新しました！ (新規取引上限: {mode_info['max_daily_trades']}回)")
            if hasattr(st, "rerun"):
                st.experimental_rerun()

    st.divider()
    st.caption("ℹ️ 詳細な設定を変更するには、上の「専門家モード」をONにしてください。")


def _render_advanced_view():
    """Renders the original detailed settings tabs."""
    st.caption("⚠️ 専門家向けの設定画面です。APIキーや通知設定を直接編集できます。")

    # Create tabs for different setting categories
    tab1, tab2, tab3 = st.tabs(["🔑 APIキー設定", "🔔 通知設定", "🎯 取引・リスク設定"])

    # --- Tab 1: API Keys ---
    with tab1:
        current_config = _load_config()
        reasoner = get_llm_reasoner()

        # Show current provider
        st.info(f"🔌 現在の接続先: **{reasoner.provider.upper()}**")

        st.divider()

        # --- OpenAI Section ---
        st.subheader("🤖 OpenAI API (推奨)")
        st.caption("GPT-4o-mini を使用します。課金アカウントで安定動作。")

        current_openai_key = current_config.get("openai_api_key", "")
        display_openai = (
            current_openai_key[:7] + "..." + current_openai_key[-4:] if len(current_openai_key) > 12 else ""
        )

        if display_openai:
            st.success(f"✅ 設定済み: `{display_openai}`")
        else:
            st.warning("⚠️ 未設定")

        new_openai_key = st.text_input("OpenAI API Key", type="password", placeholder="sk-...")

        if st.button("OpenAI キーを保存", key="save_openai"):
            if new_openai_key and new_openai_key.startswith("sk-"):
                _update_config("openai_api_key", new_openai_key)
                reasoner.set_openai_key(new_openai_key)
                st.success("✅ OpenAI APIキーを保存しました！")
                if hasattr(st, "rerun"):
                    st.experimental_rerun()
                else:
                    st.experimental_rerun()
            else:
                st.error("有効なAPIキーを入力してください (sk-...で始まります)")

        st.divider()

        # --- Gemini Section ---
        st.subheader("🌀 Google Gemini API")
        st.caption("無料プランはレート制限あり。Gemini 2.0 Flash使用。")

        current_gemini_key = current_config.get("gemini_api_key", "")
        display_gemini = (
            current_gemini_key[:6] + "..." + current_gemini_key[-4:] if len(current_gemini_key) > 10 else ""
        )

        if display_gemini:
            st.success(f"✅ 設定済み: `{display_gemini}`")
        else:
            st.warning("⚠️ 未設定")

        new_gemini_key = st.text_input(
            "Gemini API Key",
            type="password",
            placeholder="AIzaSy...",
            key="gemini_input",
        )

        if st.button("Gemini キーを保存", key="save_gemini"):
            if new_gemini_key and new_gemini_key.startswith("AIza"):
                _update_config("gemini_api_key", new_gemini_key)
                reasoner.set_gemini_key(new_gemini_key)
                st.success("✅ Gemini APIキーを保存しました！")
            else:
                st.error("有効なAPIキーを入力してください (AIza...で始まります)")

    # --- Tab 2: Notifications ---
    with tab2:
        st.subheader("LINE Notify")
        st.caption("取引実行時やアラート発生時にLINEで通知を受け取れます。")

        notifications = current_config.get("notifications", {})
        line_config = notifications.get("line", {})

        enable_line = st.checkbox("LINE通知を有効にする", value=line_config.get("enabled", False))

        line_token = st.text_input(
            "LINE Notify トークン",
            value=line_config.get("token", ""),
            type="password",
            disabled=not enable_line,
        )
        st.markdown("[トークン取得はこちら](https://notify-bot.line.me/my/)")

        if st.button("通知設定を保存"):
            new_line_config = {"enabled": enable_line, "token": line_token}
            # Deep update
            if "notifications" not in current_config:
                current_config["notifications"] = {}
            current_config["notifications"]["line"] = new_line_config

            _save_full_config(current_config)
            st.success("✅ 通知設定を保存しました！")

    # --- Tab 3: Trading & Risk ---
    with tab3:
        st.subheader("💰 資金設定")
        pt = PaperTrader()
        st.info(f"現在の初期資金: {format_currency(pt.initial_capital)}")
        st.caption("※ 初期資金を変更するには、データベースのリセットが必要です。")

        st.divider()

        st.subheader("🛡️ リスク許容度")

        risk_level = st.radio("AIのリスク特性を選択", ["安全重視（推奨）", "バランス", "積極的"], index=0)

        if risk_level == "安全重視（推奨）":
            st.info("✅ 損失回避を最優先します。ドローダウンを抑えます。")
        elif risk_level == "バランス":
            st.info("⚖️ リスクとリターンのバランスを取ります。")
        else:
            st.warning("⚠️ 高いリターンを狙いますが、ボラティリティも高くなります。")

        if st.button("リスク設定を適用"):
            st.success(f"✅ リスク設定「{risk_level}」を適用しました（シミュレーション）")


def _load_config():
    try:
        with open("config.json", "r", encoding="utf-8") as f:
            return json.load(f)
    except BaseException:
        return {}


def _update_config(key, value):
    config = _load_config()
    config[key] = value
    _save_full_config(config)


def _save_full_config(config):
    with open("config.json", "w", encoding="utf-8") as f:
        json.dump(config, f, indent=4, ensure_ascii=False)
