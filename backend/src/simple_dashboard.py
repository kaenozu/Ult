"""
個人投資家向けシンプルダッシュボード (Ultra Simple Version)

一目でわかる資産状況 - Zero-Touch Mode
"""

import logging
import os
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from src.constants import TICKER_NAMES
from src import demo_data
from src.data_loader import fetch_external_data
from src.paper_trader import PaperTrader
from src.services.defense import defense_status
from src.ui.playbooks import render_playbook_cards


def format_currency_jp(amount: float) -> str:
    """日本円を万円形式で表示"""
    if amount >= 100000000:
        return f"¥{amount/100000000:.2f}億"
    elif amount >= 10000:
        return f"¥{amount/10000:.1f}万"
    else:
        return f"¥{amount:,.0f}"


def _demo_mode() -> bool:
    env_flag = os.getenv("USE_DEMO_DATA", "")
    return bool(st.session_state.get("use_demo_data")) or env_flag.lower() in {"1", "true", "yes"}


def _apply_theme(theme: str):
    """テーマに応じた簡易CSSを注入。"""
    if theme == "navy":
        css = """
        <style>
        .stApp {background: radial-gradient(circle at 20% 20%, #0f1a2b, #070c14);}
        .stMetric, .stDataFrame {backdrop-filter: blur(6px);}
        </style>
        """
    elif theme == "dark-contrast":
        css = """
        <style>
        .stApp {background: linear-gradient(180deg, #0b0f16 0%, #0f1724 50%, #0b0f16 100%);}
        .stMetric, .stDataFrame {backdrop-filter: blur(8px); background: rgba(20,30,45,0.7); color: #e8f0ff;}
        </style>
        """
    else:
        css = """
        <style>
        .stApp {background: linear-gradient(180deg, #f7f9fc 0%, #eef2f7 50%, #e9eef6 100%);}
        </style>
        """
    st.markdown(css, unsafe_allow_html=True)


def _scenario_controls():
    """リスクプリセット/エクスポージャー上限をUIから調整。"""
    st.sidebar.subheader("シナリオプリセット")
    preset_labels = {"保守( drawdown最優先 )": "conservative", "中立": "neutral", "積極": "aggressive"}
    current = st.session_state.get("scenario", os.getenv("TRADING_SCENARIO", "neutral"))
    label_default = [k for k, v in preset_labels.items() if v == current]
    selection = st.sidebar.radio(
        "リスクプロファイル",
        list(preset_labels.keys()),
        index=0 if not label_default else list(preset_labels.keys()).index(label_default[0]),
    )
    scenario = preset_labels[selection]
    st.session_state["scenario"] = scenario
    os.environ["TRADING_SCENARIO"] = scenario

    st.sidebar.caption("銘柄/セクターの最大エクスポージャーを調整")
    default_ticker = float(os.getenv("MAX_PER_TICKER_PCT", 0.25))
    default_sector = float(os.getenv("MAX_PER_SECTOR_PCT", 0.35))
    max_ticker_pct = st.sidebar.slider("銘柄上限(%)", 5, 50, int(default_ticker * 100), step=1) / 100
    max_sector_pct = st.sidebar.slider("セクター上限(%)", 10, 80, int(default_sector * 100), step=1) / 100
    os.environ["MAX_PER_TICKER_PCT"] = str(max_ticker_pct)
    os.environ["MAX_PER_SECTOR_PCT"] = str(max_sector_pct)

    # プレビュー
    st.sidebar.write("シナリオ適用プレビュー")
    preview_equity = 1_000_000
    max_lot = preview_equity * (0.1 if scenario == "conservative" else 0.2 if scenario == "neutral" else 0.3)
    st.sidebar.metric("最大想定ロット", format_currency_jp(max_lot))
    st.sidebar.caption(f"シナリオ: {scenario} / 銘柄 {max_ticker_pct:.0%} / セクター {max_sector_pct:.0%}")


def _load_backtest_history(demo: bool, pt: PaperTrader = None) -> pd.DataFrame:
    if demo:
        return demo_data.generate_backtest_history(days=90)

    path = Path("reports/backtest_history.csv")
    if path.exists():
        try:
            df = pd.read_csv(path)
            if "date" in df.columns:
                df["date"] = pd.to_datetime(df["date"])
            return df
        except Exception as e:
            import logging
            logging.getLogger(__name__).debug(f"Failed to load backtest history from CSV: {e}")

    # Fallback: compute from equity/trade history
    if pt:
        equity_df = pd.DataFrame(pt.get_equity_history(), columns=["date", "total_equity"])
        if not equity_df.empty:
            equity_df["date"] = pd.to_datetime(equity_df["date"])
            equity_df["return"] = equity_df["total_equity"].pct_change()
            equity_df["win_rate"] = (equity_df["return"] > 0).rolling(10, min_periods=3).mean()
            equity_df["sharpe"] = (
                equity_df["return"].rolling(30, min_periods=5).mean()
                / (equity_df["return"].rolling(30, min_periods=5).std() + 1e-6)
                * (252**0.5)
            )
            return equity_df[["date", "win_rate", "sharpe"]].dropna()
    return pd.DataFrame()


def _show_backtest_history():
    demo = _demo_mode()
    pt = PaperTrader() if not demo else None
    try:
        hist = _load_backtest_history(demo, pt)
        if hist.empty:
            st.info("バックテスト履歴がありません")
            return
        hist = hist.sort_values("date")
        fig = go.Figure()
        if "win_rate" in hist.columns:
            fig.add_trace(
                go.Scatter(x=hist["date"], y=hist["win_rate"], mode="lines", name="勝率", line=dict(color="#2E86AB"))
            )
        if "sharpe" in hist.columns:
            fig.add_trace(
                go.Scatter(
                    x=hist["date"],
                    y=hist["sharpe"],
                    mode="lines",
                    name="シャープ比",
                    line=dict(color="#8E44AD"),
                    yaxis="y2",
                )
            )
            fig.update_layout(
                yaxis2=dict(title="シャープ比", overlaying="y", side="right"),
                yaxis=dict(title="勝率"),
            )
        fig.update_layout(title="日次バックテストトレンド", height=360, legend_orientation="h")
        st.plotly_chart(fig, use_container_width=True)
    finally:
        if pt:
            pt.close()


def _exposure_heatmap():
    """セクター/地域エクスポージャーを簡易表示"""
    demo = _demo_mode()
    pt = PaperTrader() if not demo else None
    try:
        positions = demo_data.generate_positions() if demo else pt.get_positions()
        if positions.empty:
            st.info("ポジションがありません")
            return

        # 地域推定
        def region(tkr: str) -> str:
            if tkr.endswith(".T"):
                return "Japan"
            elif tkr.endswith(".PA"):
                return "Europe"
            elif "USD" in tkr or tkr.startswith("BTC") or tkr.startswith("ETH"):
                return "Crypto/FX"
            else:
                return "US"

        positions["region"] = positions["ticker"].apply(region)
        positions["sector"] = positions.get("sector", "Unknown")
        if "sector" not in positions or positions["sector"].eq("Unknown").all():
            positions["sector"] = positions["region"]

        positions["value"] = positions["quantity"] * positions["current_price"]
        total = positions["value"].sum()
        pivot = positions.pivot_table(index="sector", columns="region", values="value", aggfunc="sum").fillna(0)
        pivot_pct = pivot / total if total else pivot

        fig = go.Figure(data=go.Heatmap(z=pivot_pct.values, x=pivot_pct.columns, y=pivot_pct.index, colorscale="Blues"))
        fig.update_layout(title="セクター x 地域 エクスポージャー(%)", height=320)
        st.plotly_chart(fig, use_container_width=True)
    finally:
        if pt:
            pt.close()


def _model_version_card():
    import json

    registry_path = Path("models/registry.json")
    data_registry_path = Path("models/data_versions/registry.json")

    cols = st.columns(2)
    with cols[0]:
        if registry_path.exists():
            try:
                reg = json.loads(registry_path.read_text())
                latest = None
                for model, items in reg.get("models", {}).items():
                    if items:
                        items_sorted = sorted(items, key=lambda x: x.get("timestamp", ""), reverse=True)
                        latest = items_sorted[0]
                        st.success(f"最新モデル: {model} / {latest.get('version')}")
                        st.caption(f"metrics: {latest.get('metrics')}")
                        break
                if not latest:
                    st.info("モデル登録なし")
            except Exception as exc:
                st.warning(f"モデル情報読み込み失敗: {exc}")
        else:
            st.info("モデル登録ファイルなし")
    with cols[1]:
        if data_registry_path.exists():
            try:
                reg = json.loads(data_registry_path.read_text())
                versions = reg.get("versions", [])
                if versions:
                    versions_sorted = sorted(versions, key=lambda x: x.get("version", ""), reverse=True)
                    v = versions_sorted[0]
                    st.success(f"データ版: {v.get('version')}")
                    st.caption(v.get("path"))
                else:
                    st.info("データスナップショットなし")
            except Exception as exc:
                st.warning(f"データ版読み込み失敗: {exc}")
        else:
            st.info("データスナップショットなし")


def _notification_hooks():
    st.subheader("通知フック")
    st.caption("Slack/Webhook/メールへの通知先を設定し、テスト送信できます。")
    slack_url = st.text_input("Slack Webhook URL", value=os.getenv("SLACK_WEBHOOK_URL", ""))
    message = st.text_area("テストメッセージ", "AGStock 通知テスト")
    quiet_hours = st.text_input("静音時間 (例 22:00-07:00)", value=os.getenv("QUIET_HOURS", "22:00-07:00"))
    os.environ["QUIET_HOURS"] = quiet_hours
    if st.button("Slackにテスト送信"):
        try:
            import requests

            resp = requests.post(slack_url, json={"text": message}, timeout=5)
            if resp.status_code == 200:
                st.success("Slack送信成功")
            else:
                st.warning(f"Slack送信失敗: {resp.status_code}")
        except Exception as exc:
            st.error(f"送信エラー: {exc}")


def _go_no_go():
    """取引前の簡易チェックリスト"""
    st.subheader("Go / No-Go チェック")
    from src.utils.health import quick_health_check

    health = quick_health_check()
    ext_ok = "✅" if all(k.startswith("api_latency") or v for k, v in health.items()) else "⚠️"
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Disk OK", "Yes" if health.get("disk_ok") else "Low")
    with col2:
        st.metric("Memory OK", "Yes" if health.get("memory_ok") else "Low")
    with col3:
        latency = health.get("api_latency_ms", 0.0)
        st.metric("API latency", f"{latency:.0f} ms", delta=None)
    st.caption(
        f"{ext_ok} システム健全性: disk={health.get('disk_ok')} mem={health.get('memory_ok')} api={health.get('api_ok')}"
    )

    vix_display = "N/A"
    try:
        ext = fetch_external_data(period="5d")
        vix_df = ext.get("VIX")
        if vix_df is not None and not vix_df.empty:
            vix_display = f"{float(vix_df['Close'].iloc[-1]):.2f}"
    except Exception as e:
        logging.getLogger(__name__).debug(f"Failed to fetch VIX: {e}")
    st.write(f"VIX: {vix_display}")

    safe_mode = st.checkbox("安全モード (BUY抑制)", value=os.getenv("SAFE_MODE", "").lower() in {"1", "true", "yes"})
    os.environ["SAFE_MODE"] = "1" if safe_mode else "0"
    if safe_mode:
        st.warning("安全モード中は新規BUYを抑制します。")


def _show_market_status():
    """市場開閉状況を表示"""
    now = datetime.now()
    hour = now.hour
    minute = now.minute
    weekday = now.weekday()  # 0=Monday, 6=Sunday

    markets = []

    # 東京証券取引所 (9:00-11:30, 12:30-15:00 JST)
    if weekday < 5:  # 平日
        if (9 <= hour < 11) or (hour == 11 and minute < 30) or (12 <= hour < 15 and not (hour == 12 and minute < 30)):
            markets.append("東証: 営業中")
        else:
            markets.append("東証: 休場中")
    else:
        markets.append("東証: 休場日")

    # NY証券取引所 (14:30-21:00 JST)
    if weekday < 5:  # 平日
        if (14 <= hour < 21) or (hour == 14 and minute >= 30):
            markets.append("NYSE: 営業中")
        else:
            markets.append("NYSE: 休場中")
    else:
        markets.append("NYSE: 休場日")

    # モード表示
    for market in markets:
        if "営業中" in market:
            st.success(market)
        else:
            st.info(market)


def _show_portfolio_summary():
    """ポートフォリオ概要を表示"""
    demo = _demo_mode()
    pt = PaperTrader() if not demo else None
    try:
        if demo:
            positions = demo_data.generate_positions()
            balance = {
                "total_equity": float(positions["market_value"].sum() * 1.1),
                "cash": float(positions["market_value"].sum() * 0.1),
                "unrealized_pnl": float(positions["market_value"].sum() * 0.05),
                "daily_pnl": float(positions["market_value"].sum() * 0.002),
            }
        else:
            balance = pt.get_current_balance()
            positions = pt.get_positions()

        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("総資産", format_currency_jp(balance["total_equity"]))
        with col2:
            st.metric("現金", format_currency_jp(balance["cash"]))
        with col3:
            st.metric(
                "評価損益",
                format_currency_jp(balance["unrealized_pnl"]),
                delta=format_currency_jp(balance["daily_pnl"]),
            )
        with col4:
            st.metric("保有銘柄数", len(positions))

        # ポジション詳細
        if not positions.empty:
            st.subheader("保有銘柄")
            # フィルタ
            with st.expander("フィルタ", expanded=False):
                show_gainers = st.checkbox("含み益のみ", value=False, key="filter_gainers")
                show_losers = st.checkbox("含み損のみ", value=False, key="filter_losers")
                max_mv = int(positions["market_value"].max() or 0)
                min_value = (
                    st.slider("最低保有額(円)", 0, max_mv if max_mv > 0 else 0, 0, step=1000) if max_mv > 0 else 0
                )

            positions_display = positions.copy()
            if show_gainers and not show_losers:
                positions_display = positions_display[positions_display.get("unrealized_pnl", 0) > 0]
            if show_losers and not show_gainers:
                positions_display = positions_display[positions_display.get("unrealized_pnl", 0) < 0]
            if min_value:
                positions_display = positions_display[positions_display["market_value"] >= min_value]

            positions_display["保有額"] = positions_display["current_price"] * positions_display["quantity"]
            positions_display["評価損益"] = positions_display["unrealized_pnl"]
            positions_display["評価損益率"] = positions_display["unrealized_pnl_pct"]

            # Map ticker to company name
            positions_display["company_name"] = (
                positions_display["ticker"].map(TICKER_NAMES).fillna(positions_display["ticker"])
            )

            # 列名を日本語に変換して表示
            display_df = positions_display[
                ["ticker", "company_name", "quantity", "current_price", "保有額", "評価損益", "評価損益率"]
            ].copy()
            display_df.columns = ["銘柄コード", "銘柄名", "数量", "現在価格", "保有額", "評価損益", "評価損益率"]

            # 数値のフォーマット
            display_df["現在価格"] = display_df["現在価格"].apply(lambda x: f"¥{x:,.0f}")
            display_df["保有額"] = display_df["保有額"].apply(format_currency_jp)
            display_df["評価損益"] = display_df["評価損益"].apply(format_currency_jp)
            display_df["評価損益率"] = display_df["評価損益率"].apply(lambda x: f"{x:.2%}")

            st.dataframe(display_df, use_container_width=True)
        else:
            st.info("現在保有銘柄はありません")

    finally:
        if pt:
            pt.close()


def _show_performance_chart():
    """パフォーマンスチャートを表示"""
    demo = _demo_mode()
    pt = PaperTrader() if not demo else None
    try:
        # 直近30日分のデータを取得
        if demo:
            equity_df = demo_data.generate_equity_history(days=30)
        else:
            equity_data = pt.get_equity_history(days=30)
            equity_df = pd.DataFrame(equity_data, columns=["date", "equity"]) if equity_data else pd.DataFrame()

        if not equity_df.empty:
            df = equity_df.copy()
            df.columns = ["date", "equity"]
            df["date"] = pd.to_datetime(df["date"])

            # グラフ作成
            fig = go.Figure()
            fig.add_trace(
                go.Scatter(
                    x=df["date"],
                    y=df["equity"],
                    mode="lines+markers",
                    name="総資産",
                    line=dict(color="#1f77b4", width=2),
                )
            )

            fig.update_layout(title="資産推移 (直近30日)", xaxis_title="日付", yaxis_title="総資産 (円)", height=400)

            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("パフォーマンスデータがありません")
    finally:
        if pt:
            pt.close()


def _return_distribution():
    """リターン分布のスパークラインと下方5%点を表示"""
    demo = _demo_mode()
    pt = PaperTrader() if not demo else None
    try:
        if demo:
            equity_df = demo_data.generate_equity_history(days=90)
        else:
            equity_data = pt.get_equity_history(days=120)
            equity_df = pd.DataFrame(equity_data, columns=["date", "equity"]) if equity_data else pd.DataFrame()

        if equity_df.empty:
            st.info("リターンデータがありません")
            return

        equity_df.columns = ["date", "equity"]
        equity_df["date"] = pd.to_datetime(equity_df["date"])
        equity_df["return"] = equity_df["equity"].pct_change().dropna()
        rets = equity_df["return"].dropna()
        if rets.empty:
            st.info("リターンデータがありません")
            return

        p5 = rets.quantile(0.05)
        fig = go.Figure()
        fig.add_trace(go.Histogram(x=rets, nbinsx=30, marker_color="#4a90e2", opacity=0.8, name="Returns"))
        fig.add_vline(
            x=p5, line_dash="dash", line_color="red", annotation_text=f"5%: {p5:.2%}", annotation_position="top right"
        )
        fig.update_layout(title="期待リターン分布と下方5%点", height=300, bargap=0.05)
        st.plotly_chart(fig, use_container_width=True)
    finally:
        if pt:
            pt.close()


def _show_daily_summary():
    """日次サマリーを表示"""
    demo = _demo_mode()
    pt = PaperTrader() if not demo else None
    try:
        if demo:
            hist = demo_data.generate_trade_history(days=5)
            today = datetime.now().date()
            todays = hist[hist["timestamp"].dt.date == today]
            pnl = float(todays["realized_pnl"].sum()) if not todays.empty else 0.0
            trades = len(todays) if not todays.empty else 0
            date = today.isoformat()
        else:
            daily_summary = pt.get_daily_summary()
            if daily_summary:
                latest = daily_summary[-1]
                date, pnl, trades = latest
            else:
                date, pnl, trades = datetime.now().date().isoformat(), 0.0, 0

        st.subheader("本日のサマリー")
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("日付", date)
        with col2:
            st.metric("損益", format_currency_jp(pnl))
        with col3:
            st.metric("取引数", trades)
    finally:
        if pt:
            pt.close()


def _show_stat_cards():
    """勝率/連勝/最大DDなどのミニカード"""
    demo = _demo_mode()
    if demo:
        hist = demo_data.generate_trade_history(days=60)
        equity = demo_data.generate_equity_history(days=60)
    else:
        pt = PaperTrader()
        hist = pt.get_trade_history(limit=500)
        equity_df = pt.get_equity_history()
        equity = pd.DataFrame(equity_df, columns=["date", "total_equity"]) if equity_df else pd.DataFrame()
        pt.close()

    win_rate = 0.0
    max_dd = 0.0
    win_streak = 0
    loss_streak = 0

    if not hist.empty and "realized_pnl" in hist.columns:
        wins = (hist["realized_pnl"] > 0).sum()
        total = (hist["realized_pnl"] != 0).sum()
        win_rate = wins / total if total else 0.0

        # streaks
        streak = 0
        max_win_streak = 0
        max_loss_streak = 0
        for val in hist["realized_pnl"]:
            if val > 0:
                streak = streak + 1 if streak >= 0 else 1
            elif val < 0:
                streak = streak - 1 if streak <= 0 else -1
            max_win_streak = max(max_win_streak, streak)
            max_loss_streak = min(max_loss_streak, streak)
        win_streak = max_win_streak
        loss_streak = abs(max_loss_streak)

    if not equity.empty and "total_equity" in equity.columns:
        eq = equity["total_equity"].astype(float)
        peak = eq.cummax()
        max_dd = float(((eq / peak) - 1).min()) if not eq.empty else 0.0

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("勝率", f"{win_rate*100:.1f}%")
    with col2:
        st.metric("最大DD", f"{max_dd*100:.2f}%")
    with col3:
        st.metric("連勝数", win_streak)
    with col4:
        st.metric("連敗数", loss_streak)


def create_simple_dashboard():
    """メインダッシュボード"""
    # st.set_page_config is handled in app.py (DO NOT Call it here)

    # テーマ & シナリオ (サイドバー)
    # Note: If running inside app.py tabs, sidebar elements will appear in the main sidebar.
    theme_choice = st.sidebar.selectbox("テーマ", ["light", "navy", "dark-contrast"], index=0)
    _apply_theme(theme_choice)
    _scenario_controls()

    st.subheader("個人投資家向けシンプルダッシュボード")

    # ステータスバナー
    demo = _demo_mode()
    mode_label = "デモ" if demo else "本番"
    with st.container():
        col1, col2, col3, col4, col5 = st.columns(5)
        with col1:
            st.info(f"モード: {mode_label}")
        with col2:
            # 最終更新（エクイティ）
            try:
                eq_df = (
                    demo_data.generate_equity_history(days=2)
                    if demo
                    else pd.DataFrame(PaperTrader().get_equity_history(), columns=["date", "total_equity"])
                )
                last_date = pd.to_datetime(eq_df["date"]).max().date() if not eq_df.empty else None
            except Exception:
                last_date = None
            st.success(f"データ更新: {last_date or 'N/A'}")
        with col3:
            vix_display = "N/A"
            try:
                ext = fetch_external_data(period="5d")
                vix_df = ext.get("VIX")
                if vix_df is not None and not vix_df.empty:
                    vix_display = f"{float(vix_df['Close'].iloc[-1]):.2f}"
            except Exception as e:
                logging.getLogger(__name__).debug(f"Failed to fetch VIX in header: {e}")
            st.warning(f"VIX: {vix_display}")
        with col4:
            scenario = st.session_state.get("scenario", os.getenv("TRADING_SCENARIO", "neutral"))
            st.success(f"シナリオ: {scenario}")
        with col5:
            if defense_status():
                st.error("🛡 防御ON")
            else:
                st.info("🟢 通常モード")

    with st.expander("🕒 時間帯プレイブック", expanded=True):
        render_playbook_cards()

    # 市場状況
    with st.expander("市場状況", expanded=True):
        _show_market_status()

    with st.expander("取引前チェック", expanded=True):
        _go_no_go()

    # ポートフォリオ概要
    with st.expander("ポートフォリオ概要", expanded=True):
        _show_portfolio_summary()

    # ミニカード
    with st.expander("ハイライト", expanded=True):
        _show_stat_cards()

    # パフォーマンスチャート
    with st.expander("パフォーマンス", expanded=True):
        _show_performance_chart()

    with st.expander("リターン分布", expanded=False):
        _return_distribution()

    # 日次サマリー
    with st.expander("日次サマリー", expanded=False):
        _show_daily_summary()

    with st.expander("エクスポージャー", expanded=False):
        _exposure_heatmap()

    with st.expander("モデル/データバージョン", expanded=False):
        _model_version_card()

    # 日次バックテスト履歴
    with st.expander("日次バックテスト軌跡", expanded=False):
        _show_backtest_history()

    # 通知フック
    with st.expander("通知設定", expanded=False):
        _notification_hooks()


if __name__ == "__main__":
    st.set_page_config(page_title="AGStock - ダッシュボード", page_icon="📈", layout="wide")
    create_simple_dashboard()
