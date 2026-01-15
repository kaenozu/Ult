"""
統合ダッシュボード - All-in-One
朝活ダッシュボード + 週末戦略会議 + 設定管理

使い方:
  streamlit run unified_dashboard.py
  または
  run_unified_dashboard.bat
"""

import json
from datetime import datetime
from pathlib import Path

import streamlit as st

from src.anomaly_detector import AnomalyDetector
from src.formatters import format_currency, format_percentage
from src.paper_trader import PaperTrader
from src.performance_optimizer import optimizer

# ページ設定
st.set_page_config(
    page_title="AGStock 統合ダッシュボード",
    page_icon="🚀",
    layout="wide",
    initial_sidebar_state="expanded",
)

# カスタムCSS
st.markdown(
    """
<style>
    /* コンパクトなレイアウト */
    .main {
        padding: 1rem;
    }

    /* メトリックカード */
    .metric-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 15px;
        border-radius: 10px;
        margin: 5px 0;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .metric-value {
        font-size: 1.8em;
        font-weight: bold;
        margin: 5px 0;
    }

    .metric-label {
        font-size: 0.9em;
        opacity: 0.9;
    }

    /* タブスタイル */
    .stTabs [data-baseweb="tab-list"] {
        gap: 8px;
    }

    .stTabs [data-baseweb="tab"] {
        padding: 10px 20px;
        border-radius: 5px 5px 0 0;
    }

    /* ボタン */
    .stButton > button {
        width: 100%;
        border-radius: 5px;
    }
</style>
""",
    unsafe_allow_html=True,
)


def get_greeting() -> str:
    """時間帯に応じた挨拶"""
    hour = datetime.now().hour
    if hour < 6:
        return "🌙 おはようございます(早起きですね!)"
    elif hour < 12:
        return "🌅 おはようございます"
    elif hour < 18:
        return "☀️ こんにちは"
    else:
        return "🌙 こんばんは"


def show_quick_stats():
    """クイック統計表示"""
    pt = PaperTrader()
    balance = pt.get_current_balance()

    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.markdown(
            f"""
        <div class="metric-card">
            <div class="metric-label">総資産</div>
            <div class="metric-value">{format_currency(balance['total_equity'])}</div>
        </div>
        """,
            unsafe_allow_html=True,
        )

    with col2:
        total_return = (balance["total_equity"] - pt.initial_capital) / pt.initial_capital
        color = "#10b981" if total_return >= 0 else "#ef4444"
        st.markdown(
            f"""
        <div class="metric-card" style="background: linear-gradient(135deg, {color} 0%, {color}dd 100%);">
            <div class="metric-label">収益率</div>
            <div class="metric-value">{format_percentage(total_return)}</div>
        </div>
        """,
            unsafe_allow_html=True,
        )

    with col3:
        positions = pt.get_positions()
        st.markdown(
            f"""
        <div class="metric-card">
            <div class="metric-label">ポジション数</div>
            <div class="metric-value">{len(positions)}</div>
        </div>
        """,
            unsafe_allow_html=True,
        )

    with col4:
        history = pt.get_trade_history()
        if not history.empty and "realized_pnl" in history.columns:
            wins = len(history[history["realized_pnl"] > 0])
            total = len(history[history["realized_pnl"] != 0])
            win_rate = wins / total if total > 0 else 0
        else:
            win_rate = 0

        st.markdown(
            f"""
        <div class="metric-card">
            <div class="metric-label">勝率</div>
            <div class="metric-value">{format_percentage(win_rate)}</div>
        </div>
        """,
            unsafe_allow_html=True,
        )


def check_and_execute_missed_trades():
    """前日の取引漏れをチェック"""


def main():
    """メイン関数"""
    check_and_execute_missed_trades()

    # サイドバー
    with st.sidebar:
        st.title("🚀 AGStock")
        st.caption("統合ダッシュボード")

        st.markdown("---")

        # クイックアクション
        st.subheader("⚡ クイックアクション")

        if st.button("🔄 データ更新", use_container_width=True):
            st.experimental_rerun()

        if st.button("📊 週次レポート", use_container_width=True):
            import subprocess

            subprocess.Popen(["python", "weekly_report_html.py"])
            st.success("レポート生成を開始しました")

        if st.button("🔄 市場スキャン", use_container_width=True):
            import subprocess

            subprocess.Popen(["python", "daily_scan.py"])
            st.success("市場スキャンを開始しました")

        st.markdown("---")

        # 使い方ガイド
        with st.expander("📖 使い方ガイド", expanded=False):
            st.markdown(
                """
### 🌅 朝活タブ
            **毎朝5分でチェック**
            - ポートフォリオの健康度を確認
            - AIの推奨アクションを確認
            - 承認/却下ボタンで取引実行

### 📊 週末戦略タブ
            **週末30分で振り返り**
            - 今週の成績を確認
            - AIの戦略アドバイスを確認
            - 来週の方針を決定

### ⚙️ 設定タブ
            - 初期資金の設定
            - リスク許容度の調整
            - 通知設定

### 💡 Tips
            - 最初は「却下」で様子見推奨
            - 信頼度80%以上のみ承認
            - 1日1-2件まで
            """
            )

        st.markdown("---")

        # パフォーマンス統計
        st.subheader("⚡ パフォーマンス")
        stats = optimizer.get_stats()
        st.metric("キャッシュヒット率", f"{stats['hit_rate']:.1%}")
        st.caption(f"ヒット: {stats['cache_hits']} / ミス: {stats['cache_misses']}")

        if st.button("🗑️ キャッシュクリア", use_container_width=True):
            deleted = optimizer.clear_cache(older_than_hours=24)
            st.success(f"{deleted}件のキャッシュを削除しました")

        st.markdown("---")
        st.caption(f"最終更新: {datetime.now().strftime('%H:%M:%S')}")

    # メインエリア
    st.title(get_greeting())
    st.caption(f"📅 {datetime.now().strftime('%Y年%m月%d日 %H:%M')}")

    # クイック統計
    show_quick_stats()

    st.markdown("---")

    # タブ構成
    tab1, tab2, tab3, tab4, tab5 = st.tabs(["🏠 ホーム", "🌅 朝活", "📊 週末戦略", "⚙️ 設定", "📈 詳細分析"])

    # タブ1: ホーム
    with tab1:
        # 初めての方へ（目立つように）
        st.info("👋 **初めての方へ:** まずは `START_HERE.md` を読んでください！3ステップで始められます。")

        with st.expander("🎯 今すぐ始める3ステップ", expanded=True):
            st.markdown(
                """
### ステップ1️⃣: このダッシュボードを見る
            今、あなたはここにいます！ ✅

### ステップ2️⃣: 「🌅 朝活」タブをクリック
            ↑ 上のタブをクリックしてください

### ステップ3️⃣: AIの推奨を見る（押さない！）
            - 最初の3日間は**「見るだけ」**
            - 慣れてから「✅承認」ボタンを押す
            - **1日1件まで**

            ---

### 💡 重要なポイント
            - これは**練習モード**（本当のお金は動きません）
            - 焦らず、ゆっくり慣れましょう
            - 困ったら `START_HERE.md` を読んでください
            """
            )

        st.markdown("---")

        st.subheader("📋 今日のサマリー")

        col_left, col_right = st.columns([2, 1])

        with col_left:
            # アノマリー検知
            st.markdown("### 🏥 システム健康度")
            try:
                detector = AnomalyDetector()
                anomalies = detector.run_all_checks()

                if not anomalies:
                    st.success("✅ すべて正常です")
                else:
                    for anomaly in anomalies:
                        if anomaly["severity"] == "CRITICAL":
                            st.error(f"🚨 {anomaly['type']}: {anomaly['message']}")
                        elif anomaly["severity"] == "WARNING":
                            st.warning(f"⚠️ {anomaly['type']}: {anomaly['message']}")
                        else:
                            st.info(f"ℹ️ {anomaly['type']}: {anomaly['message']}")
            except Exception as e:
                st.error(f"健康度チェックエラー: {e}")

            # 最近の取引
            st.markdown("### 📝 最近の取引")
            pt = PaperTrader()
            history = pt.get_trade_history()

            if not history.empty:
                recent = history.tail(5)
                for idx, trade in recent.iterrows():
                    action_emoji = "🟢" if trade["action"] == "BUY" else "🔴"
                    st.caption(f"{action_emoji} {trade['ticker']} - {trade['action']} - {trade.get('quantity', 0)}株")
            else:
                st.info("取引履歴がありません")

        with col_right:
            # クイックリンク
            st.markdown("### 🔗 クイックリンク")

            st.markdown(
                """
            - [朝活ダッシュボード](#朝活)
            - [週末戦略会議](#週末戦略)
            - [設定](#設定)
            """
            )

            st.markdown("### 📚 ガイド")
            st.markdown(
                """
            - [クイックスタート](QUICK_START.md)
            - [朝活ガイド](MORNING_DASHBOARD_GUIDE.md)
            - [Phase 48](PHASE_48_COMPLETION.md)
            """
            )

    # タブ2: 朝活ダッシュボード
    with tab2:
        # morning_dashboard.pyの主要機能を統合
        from morning_dashboard import render_dashboard

        # ダッシュボード描画
        render_dashboard(pt)

    # タブ3: 週末戦略会議
    with tab3:
        # weekend_advisor.pyの主要機能を統合
        from weekend_advisor import AIAdvisor, WeeklyPerformanceAnalyzer

        st.subheader("📊 週末戦略会議")

        pt = PaperTrader()
        analyzer = WeeklyPerformanceAnalyzer(pt)
        advisor = AIAdvisor(pt, analyzer)

        # 今週の成績
        st.markdown("### 📊 今週の成績")
        stats = analyzer.get_weekly_stats()

        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("取引回数", f"{stats['total_trades']}回")
        with col2:
            st.metric("勝率", f"{stats['win_rate']:.1%}")
        with col3:
            st.metric("週次損益", format_currency(stats["total_pnl"]))

        # AI推奨
        st.markdown("### 🤖 AI推奨アクション")
        recommendations = advisor.generate_recommendations()

        if not recommendations:
            st.success("✅ 現状維持で問題ありません")
        else:
            for rec in recommendations[:3]:  # TOP3のみ表示
                priority_emoji = {"HIGH": "🔴", "MEDIUM": "🟡", "LOW": "🟢"}
                st.markdown(f"{priority_emoji[rec['priority']]} **{rec['title']}**")
                st.caption(rec["description"])

    # タブ4: 設定
    with tab4:
        st.subheader("⚙️ 設定")

        config_path = Path("config.json")

        if config_path.exists():
            with open(config_path, "r", encoding="utf-8") as f:
                config = json.load(f)

            # 設定表示
            st.markdown("### 現在の設定")

            if "user_profile" in config:
                profile = config["user_profile"]
                st.markdown(f"**投資経験:** {profile.get('experience', 'N/A')}")
                st.markdown(f"**リスク許容度:** {profile.get('risk_tolerance', 'N/A')}")

            if "capital" in config:
                st.markdown(f"**初期資金:** {format_currency(config['capital'].get('initial_capital', 0))}")

            if "auto_trading" in config:
                auto = config["auto_trading"]
                st.markdown(f"**自動化モード:** {auto.get('mode', 'N/A')}")
                st.markdown(f"**最大取引数/日:** {auto.get('max_daily_trades', 0)}回")

            # 設定変更
            st.markdown("---")
            st.markdown("### 設定変更")

            if st.button("🧙‍♂️ 設定ウィザードを起動", use_container_width=True):
                import subprocess

                subprocess.Popen(["python", "setup_wizard.py"])
                st.success("設定ウィザードを起動しました")

            # 設定ファイル表示
            with st.expander("📄 config.json を表示"):
                st.json(config)
        else:
            st.warning("設定ファイルが見つかりません")
            if st.button("🧙‍♂️ 設定ウィザードを起動"):
                import subprocess

                subprocess.Popen(["python", "setup_wizard.py"])

    # タブ5: 詳細分析
    with tab5:
        st.subheader("📈 詳細分析")

        pt = PaperTrader()

        # 資産推移
        st.markdown("### 📈 資産推移")
        equity_history = pt.get_equity_history()

        if not equity_history.empty:
            import plotly.graph_objects as go

            fig = go.Figure()
            fig.add_trace(
                go.Scatter(
                    x=equity_history["date"],
                    y=equity_history["total_equity"],
                    mode="lines",
                    name="総資産",
                    line=dict(color="#667eea", width=2),
                )
            )

            fig.update_layout(
                title="資産推移",
                xaxis_title="日付",
                yaxis_title="総資産 (円)",
                hovermode="x unified",
                height=400,
            )

            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("資産履歴がありません")

        # ポジション詳細
        st.markdown("### 📊 ポジション詳細")
        positions = pt.get_positions()

        if not positions.empty:
            st.dataframe(
                positions[
                    [
                        "ticker",
                        "quantity",
                        "entry_price",
                        "current_price",
                        "unrealized_pnl",
                        "unrealized_pnl_pct",
                    ]
                ],
                use_container_width=True,
            )
        else:
            st.info("現在ポジションはありません")


if __name__ == "__main__":
    main()
