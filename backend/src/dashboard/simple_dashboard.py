"""
超シンプルダッシュボード
3画面だけのわかりやすいUI
"""

import time
from datetime import datetime

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from src.constants import TICKER_NAMES
from src.dashboard_utils import check_and_execute_missed_trades
from src.formatters import format_currency
from src.paper_trader import PaperTrader

# ページ設定
st.set_page_config(
    page_title="AGStock",
    page_icon="💰",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# カスタムCSS - 超シンプル
st.markdown(
    """
<style>
    /* 全体 */
    .main {
        padding: 2rem;
        max-width: 1200px;
        margin: 0 auto;
    }

    /* 大きな数字 */
    .big-number {
        font-size: 3rem;
        font-weight: bold;
        margin: 1rem 0;
    }

    .positive {
        color: #10b981;
    }

    .negative {
        color: #ef4444;
    }

    /* カード */
    .card {
        background: white;
        border-radius: 12px;
        padding: 1.5rem;
        margin: 1rem 0;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        color: #1f2937;
    }

    /* 保有銘柄 */
    .stock-item {
        padding: 1rem;
        margin: 0.5rem 0;
        border-radius: 8px;
        border-left: 4px solid;
        color: #1f2937;
    }

    .stock-profit {
        border-left-color: #10b981;
        background: #f0fdf4;
    }

    .stock-loss {
        border-left-color: #ef4444;
        background: #fef2f2;
    }

    /* ボタン */
    .stButton > button {
        width: 100%;
        padding: 0.75rem;
        font-size: 1.1rem;
        border-radius: 8px;
    }

    /* ステータス */
    .status-ok {
        color: #10b981;
        font-size: 1.2rem;
    }

    .status-warning {
        color: #f59e0b;
        font-size: 1.2rem;
    }
</style>
""",
    unsafe_allow_html=True,
)


def show_main_dashboard():
    """メインダッシュボード"""
    pt = PaperTrader()
    balance = pt.get_current_balance()
    positions = pt.get_positions()

    # ヘッダー: 総資産
    total_equity = balance["total_equity"]
    initial_capital = pt.initial_capital
    total_pnl = total_equity - initial_capital
    total_pnl_pct = (total_pnl / initial_capital) * 100 if initial_capital > 0 else 0

    st.title("💰 AGStock")

    # 大きく総資産を表示
    color_class = "positive" if total_pnl >= 0 else "negative"
    emoji = "📈" if total_pnl >= 0 else "📉"

    st.markdown(
        f"""
    <div style="text-align: center; padding: 2rem; border-radius: 16px; color: white; margin-bottom: 2rem;
         background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
        <div style="font-size: 1.2rem; opacity: 0.9;">あなたの資産</div>
        <div class="big-number">{format_currency(total_equity)}</div>
        <div style="font-size: 1.5rem; margin-top: 1rem;">
            <span class="{color_class}">
                {format_currency(total_pnl, show_sign=True)} ({total_pnl_pct:+.1f}%) {emoji}
            </span>
        </div>
    </div>
    """,
        unsafe_allow_html=True,
    )

    # ステータス
    st.markdown("### 🎯 今日のステータス")

    # プロセス実行確認
    import psutil

    is_trading_running = False
    for proc in psutil.process_iter(["pid", "name", "cmdline"]):
        try:
            cmdline = proc.info["cmdline"]
            if cmdline and "python" in cmdline[0] and "fully_automated_trader.py" in " ".join(cmdline):
                is_trading_running = True
                break
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass

    col1, col2, col3 = st.columns(3)

    with col1:
        if is_trading_running:
            st.warning("⚠️ 自動取引プログラムが実行中です。完了までそのままお待ちください。")
            st.markdown(
                """
            <div class="card" style="background: #e0f2fe; border: 2px solid #3b82f6; animation: pulse 2s infinite;">
                <div style="color: #0369a1; font-weight: bold; font-size: 1.2rem;">🔄 取引処理中...</div>
                <div style="color: #0c4a6e; font-size: 0.9rem;">市場をスキャンしています</div>
            </div>
            <style>
            @keyframes pulse {
                0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
                70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
                100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
            }
            </style>
            """,
                unsafe_allow_html=True,
            )
            time.sleep(3)
            st.experimental_rerun()  # 処理中は自動更新
        else:
            st.markdown(
                '<div class="status-ok">✅ システム正常稼働中</div>',
                unsafe_allow_html=True,
            )

    with col2:
        now = datetime.now()
        if now.weekday() < 5:  # 平日
            st.markdown(
                '<div class="status-ok">⏰ 次回取引: 今日 15:30</div>',
                unsafe_allow_html=True,
            )
        else:
            st.markdown(
                '<div class="status-warning">⏰ 次回取引: 月曜 15:30</div>',
                unsafe_allow_html=True,
            )

    with col3:
        num_positions = len(positions)
        st.markdown(
            f'<div class="status-ok">📊 保有銘柄: {num_positions}件</div>',
            unsafe_allow_html=True,
        )

    st.markdown("---")

    # 本日の取引状況
    st.markdown("### 📊 本日の取引状況")

    from datetime import datetime as dt

    history = pt.get_trade_history()

    today_trades_exist = False

    if not history.empty and "timestamp" in history.columns:
        # 今日の取引をフィルター
        # timestampが文字列かdatetimeか確認して処理
        try:
            history["timestamp"] = pd.to_datetime(history["timestamp"])
            today = dt.now().date()
            today_trades = history[history["timestamp"].dt.date == today]

            if not today_trades.empty:
                today_trades_exist = True
                # 取引があった
                buy_count = len(today_trades[today_trades["action"] == "BUY"])
                sell_count = len(today_trades[today_trades["action"] == "SELL"])

                col1, col2, col3 = st.columns(3)

                with col1:
                    st.markdown(
                        f"""
                    <div class="card" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white;">
                        <div style="font-size: 1.1rem; font-weight: bold; margin-bottom: 0.5rem;">✅ 本日の取引</div>
                        <div style="font-size: 2rem; font-weight: bold;">{len(today_trades)}件</div>
                        <div style="font-size: 1rem; margin-top: 0.3rem;">買い: {buy_count}件 | 売り: {sell_count}件</div>
                    </div>
                    """,
                        unsafe_allow_html=True,
                    )

                with col2:
                    # 最新の取引
                    latest = today_trades.iloc[-1]

                    company_name = TICKER_NAMES.get(latest["ticker"], latest["ticker"])
                    action_emoji = "🟢" if latest["action"] == "BUY" else "🔴"

                    st.markdown(
                        f"""
                    <div class="card">
                        <div style="font-size: 1.1rem; font-weight: bold; margin-bottom: 0.5rem;">最新の取引</div>
                        <div style="font-size: 1.3rem; font-weight: bold;">{action_emoji} {company_name}</div>
                        <div style="font-size: 0.9rem; color: #666; margin-top: 0.3rem;">
                            {latest['timestamp'].strftime('%H:%M')} | {latest['quantity']}株
                        </div>
                    </div>
                    """,
                        unsafe_allow_html=True,
                    )

                with col3:
                    # 本日の損益
                    daily_pnl = 0
                    if "realized_pnl" in today_trades.columns:
                        daily_pnl = today_trades["realized_pnl"].sum()

                    pnl_color = "#10b981" if daily_pnl >= 0 else "#ef4444"
                    pnl_emoji = "📈" if daily_pnl >= 0 else "📉"

                    st.markdown(
                        f"""
                    <div class="card">
                        <div style="font-size: 1.1rem; font-weight: bold; margin-bottom: 0.5rem;">本日の損益</div>
                        <div style="font-size: 2rem; font-weight: bold; color: {pnl_color};">{format_currency(daily_pnl, show_sign=True)}</div>
                        <div style="font-size: 1.3rem; margin-top: 0.3rem;">{pnl_emoji}</div>
                    </div>
                    """,
                        unsafe_allow_html=True,
                    )
        except Exception as e:
            st.error(f"取引履歴の表示中にエラーが発生しました: {e}")

    if not today_trades_exist:
        # 今日の取引がない - 理由を表示
        # ログから最新の実行結果を確認
        import os

        signal_count = 0
        last_run_time = "不明"

        if os.path.exists("logs/auto_trader.log"):
            try:
                with open("logs/auto_trader.log", "r", encoding="utf-8", errors="ignore") as f:
                    lines = f.readlines()
                    for line in reversed(lines[-100:]):  # 最後の100行を逆順で確認
                        if "検出シグナル数:" in line or "signal" in line.lower():
                            # シグナル数を抽出
                            import re

                            match = re.search(r"(\d+)", line)
                            if match:
                                signal_count = int(match.group(1))
                                break
                        if "自動トレーダー" in line and "終了" in line:
                            # 実行時刻を抽出
                            time_match = re.search(r"\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\]", line)
                            if time_match:
                                last_run_time = time_match.group(1)
            except Exception:
                pass

        st.markdown(
            f"""
        <div class="card" style="background: #fef3c7; border-left: 4px solid #f59e0b;">
            <div style="font-size: 1.3rem; font-weight: bold; color: #92400e; margin-bottom: 0.5rem;">📅 本日の取引: なし</div>
            <div style="color: #78350f; font-size: 1rem; line-height: 1.6;">
                <strong>理由:</strong> 市場スキャンの結果、買いシグナルが検出されませんでした（検出数: {signal_count}件）<br>
                <strong>最終実行:</strong> {last_run_time}<br>
                <strong>次回実行:</strong> 明日 15:30（市場終了後）
            </div>
            <div style="margin-top: 1rem; padding: 0.75rem; background: white; border-radius: 6px; color: #1f2937;">
                💡 <strong>補足:</strong> AIが全銘柄を分析した結果、現在の市場状況では「買い」と判断できる銘柄がありませんでした。
                これは市場全体の不安定さや出来高不足などが原因と考えられます。
            </div>
        </div>
        """,
            unsafe_allow_html=True,
        )

    st.markdown("---")

    # 資産配分
    st.markdown("### 💼 資産配分")

    positions = pt.get_positions()

    # 株式の評価額を計算
    if not positions.empty:
        stock_value = (positions["quantity"] * positions["current_price"]).sum()
    else:
        stock_value = 0

    cash_value = balance["cash"]
    total = balance["total_equity"]

    # パーセンテージ計算
    stock_pct = (stock_value / total * 100) if total > 0 else 0
    cash_pct = (cash_value / total * 100) if total > 0 else 0

    col1, col2 = st.columns(2)

    with col1:
        st.markdown(
            f"""
        <div class="card">
            <div style="font-size: 1.1rem; font-weight: bold; margin-bottom: 0.5rem;">💵 現金</div>
            <div style="font-size: 2rem; font-weight: bold; color: #3b82f6;">{format_currency(cash_value)}</div>
            <div style="font-size: 1.2rem; color: #666; margin-top: 0.3rem;">{cash_pct:.1f}%</div>
        </div>
        """,
            unsafe_allow_html=True,
        )

    with col2:
        st.markdown(
            f"""
        <div class="card">
            <div style="font-size: 1.1rem; font-weight: bold; margin-bottom: 0.5rem;">📊 株式</div>
            <div style="font-size: 2rem; font-weight: bold; color: #8b5cf6;">{format_currency(stock_value)}</div>
            <div style="font-size: 1.2rem; color: #666; margin-top: 0.3rem;">{stock_pct:.1f}%</div>
        </div>
        """,
            unsafe_allow_html=True,
        )

    # 円グラフで視覚化
    if total > 0:
        import plotly.graph_objects as go

        fig = go.Figure(
            data=[
                go.Pie(
                    labels=["現金", "株式"],
                    values=[cash_value, stock_value],
                    hole=0.4,
                    marker=dict(colors=["#3b82f6", "#8b5cf6"]),
                    textinfo="label+percent",
                    textfont=dict(size=14),
                )
            ]
        )

        fig.update_layout(showlegend=False, height=250, margin=dict(l=20, r=20, t=20, b=20))

        st.plotly_chart(fig, use_container_width=True)

    st.markdown("---")

    # 保有銘柄
    st.markdown("### 💼 保有銘柄")

    if positions.empty:
        st.info("まだ銘柄を保有していません。次回の自動取引（15:30）をお待ちください。")
    else:
        for idx, pos in positions.iterrows():
            ticker = pos.get("ticker", idx)
            quantity = pos.get("quantity", 0)
            unrealized_pnl = pos.get("unrealized_pnl", 0)
            unrealized_pnl_pct = pos.get("unrealized_pnl_pct", 0)
            current_price = pos.get("current_price", 0)
            entry_date = pos.get("entry_date", "")
            entry_price = pos.get("entry_price", 0)

            # 会社名取得

            company_name = TICKER_NAMES.get(ticker, ticker)

            # 日付フォーマット
            if entry_date:
                try:
                    date_obj = datetime.fromisoformat(str(entry_date))
                    formatted_date = date_obj.strftime("%Y/%m/%d")
                except Exception:
                    formatted_date = str(entry_date)
            else:
                formatted_date = "不明"

            # 色分け
            if unrealized_pnl >= 0:
                card_class = "stock-profit"
                emoji = "🟢"
            else:
                card_class = "stock-loss"
                emoji = "🔴"

            st.markdown(
                f"""
            <div class="stock-item {card_class}">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-size: 1.3rem; font-weight: bold;">
                            {emoji} {company_name}
                        </div>
                        <div style="color: #888; font-size: 0.9rem; margin-top: 0.2rem;">{ticker}</div>
                        <div style="color: #666; margin-top: 0.5rem;">
                            {quantity}株 | 現在価格: {format_currency(current_price)}
                        </div>
                        <div style="color: #888; font-size: 0.85rem; margin-top: 0.3rem;">
                            購入日: {formatted_date} | 購入価格: {format_currency(entry_price)}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.9rem; color: #555; margin-bottom: 0.2rem;">評価損益</div>
                        <div style="font-size: 1.5rem; font-weight: bold;">
                            {format_currency(unrealized_pnl, show_sign=True)}
                        </div>
                        <div style="font-size: 1.2rem; margin-top: 0.3rem;">
                            ({unrealized_pnl_pct:+.1f}%)
                        </div>
                    </div>
                </div>
            </div>
            """,
                unsafe_allow_html=True,
            )

    st.markdown("---")

    # アクションボタン
    col1, col2, col3 = st.columns(3)

    with col1:
        if st.button("🚀 今すぐ取引", use_container_width=True, type="primary"):
            with st.spinner("市場をスキャン中..."):
                import subprocess

                try:
                    # 強制実行フラグ付きで自動トレーダーを起動
                    result = subprocess.run(
                        ["python", "fully_automated_trader.py", "--force"],
                        capture_output=True,
                        text=True,
                        timeout=60,
                    )

                    if result.returncode == 0:
                        st.success("✅ 取引完了！ページを更新して結果を確認してください。")
                        st.balloons()
                        time.sleep(2)
                        st.experimental_rerun()
                    else:
                        st.error(f"❌ エラーが発生しました: {result.stderr}")
                except subprocess.TimeoutExpired:
                    st.warning("⏱️ 処理に時間がかかっています。バックグラウンドで実行中です。")
                except Exception as e:
                    st.error(f"❌ エラー: {e}")

    with col2:
        if st.button("📈 詳細を見る", use_container_width=True):
            st.session_state.page = "detail"
            st.experimental_rerun()

    with col3:
        if st.button("⚙️ 設定", use_container_width=True):
            st.session_state.page = "settings"
            st.experimental_rerun()


def show_detail_page():
    """詳細ページ"""
    pt = PaperTrader()

    st.title("📈 詳細")

    if st.button("← 戻る"):
        st.session_state.page = "main"
        st.experimental_rerun()

    st.markdown("---")

    # 資産推移グラフ
    st.subheader("📊 資産の推移")

    equity_history = pt.get_equity_history()

    if not equity_history.empty:
        fig = go.Figure()
        fig.add_trace(
            go.Scatter(
                x=equity_history["date"],
                y=equity_history["total_equity"],
                mode="lines+markers",
                name="総資産",
                line=dict(color="#667eea", width=3),
                marker=dict(size=6),
            )
        )

        # 初期資金ライン
        fig.add_hline(
            y=pt.initial_capital,
            line_dash="dash",
            line_color="gray",
            annotation_text="初期資金",
        )

        fig.update_layout(
            height=400,
            hovermode="x unified",
            showlegend=False,
            plot_bgcolor="white",
            xaxis=dict(title="日付", showgrid=True, gridcolor="#f0f0f0"),
            yaxis=dict(title="資産 (円)", showgrid=True, gridcolor="#f0f0f0"),
        )

        st.plotly_chart(fig, use_container_width=True)
    else:
        st.info("まだデータがありません")

    st.markdown("---")

    # 取引履歴
    st.subheader("📝 最近の取引")

    history = pt.get_trade_history()

    if not history.empty:
        recent = history.tail(10).sort_values("date", ascending=False)

        for idx, trade in recent.iterrows():
            date = pd.to_datetime(trade["date"]).strftime("%m/%d %H:%M")
            ticker = trade["ticker"]
            action = trade["action"]
            quantity = trade.get("quantity", 0)
            price = trade.get("price", 0)
            realized_pnl = trade.get("realized_pnl", 0)

            if action == "BUY":
                emoji = "🟢"
                action_text = "購入"
            else:
                emoji = "🔴"
                action_text = "売却"

            pnl_text = ""
            if action == "SELL" and realized_pnl != 0:
                pnl_text = f" ({format_currency(realized_pnl, show_sign=True)})"

            st.markdown(
                f"""
            <div style="padding: 1rem; margin: 0.5rem 0; background: #f9fafb; border-radius: 8px; color: #1f2937;">
                {emoji} {date} - {ticker} {action_text} {quantity}株 @ {format_currency(price)}{pnl_text}
            </div>
            """,
                unsafe_allow_html=True,
            )
    else:
        st.info("取引履歴がありません")


def show_settings_page():
    """設定ページ"""
    st.title("⚙️ 設定")

    if st.button("← 戻る"):
        st.session_state.page = "main"
        st.experimental_rerun()

    st.markdown("---")

    # 初期資金
    st.subheader("💰 初期資金")
    pt = PaperTrader()
    st.info(f"現在の初期資金: {format_currency(pt.initial_capital)}")
    st.caption("※ 初期資金を変更するには、ペーパートレードをリセットしてください")

    st.markdown("---")

    # リスク設定
    st.subheader("🎯 リスク設定")

    risk_level = st.radio("リスク許容度を選択", ["安全重視（推奨）", "バランス", "積極的"], index=0)

    if risk_level == "安全重視（推奨）":
        st.success("✅ 損失を最小限に抑えます。初心者におすすめです。")
    elif risk_level == "バランス":
        st.info("⚖️ リスクとリターンのバランスを取ります。")
    else:
        st.warning("⚠️ 高いリターンを狙いますが、損失リスクも高まります。")

    st.markdown("---")

    # 通知設定
    st.subheader("🔔 通知設定")

    enable_line = st.checkbox("LINE通知を受け取る", value=False)

    if enable_line:
        st.text_input("LINEトークン", type="password")
        st.caption("トークンの取得方法: https://notify-bot.line.me/")

    st.markdown("---")

    # 保存ボタン
    if st.button("💾 設定を保存", type="primary", use_container_width=True):
        st.success("✅ 設定を保存しました！")
        st.balloons()


def main():
    """メイン処理"""

    # ページ状態の初期化
    if "page" not in st.session_state:
        st.session_state.page = "main"

    # 起動時の自動取引チェック
    check_and_execute_missed_trades()

    # ページ表示
    if st.session_state.page == "main":
        show_main_dashboard()
    elif st.session_state.page == "detail":
        show_detail_page()
    elif st.session_state.page == "settings":
        show_settings_page()


if __name__ == "__main__":
    main()
