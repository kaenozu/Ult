"""
パフォーマンスダッシュボードUI

Streamlitでパフォーマンスを可視化
"""

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

from src.paper_trader import PaperTrader
from src.performance_analyzer import PerformanceAnalyzer


def create_performance_dashboard():
    """パフォーマンスダッシュボードを作成"""

    st.title("📊 パフォーマンス分析ダッシュボード")

    # PaperTraderインスタンス
    pt = PaperTrader()
    analyzer = PerformanceAnalyzer(pt)

    # メトリクス計算
    metrics = analyzer.calculate_metrics()

    # 1. サマリーメトリクス
    st.header("📈 サマリー")

    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.metric(
            "総リターン",
            f"{metrics['total_return_pct']:.2f}%",
            delta=f"{metrics['current_equity'] - metrics['initial_capital']:,.0f}円",
        )

    with col2:
        st.metric("シャープレシオ", f"{metrics['sharpe_ratio']:.2f}", help="リスク調整後リターン（1.0以上が良好）")

    with col3:
        st.metric("最大ドローダウン", f"{metrics['max_drawdown_pct']:.2f}%", delta=None, delta_color="inverse")

    with col4:
        st.metric("勝率", f"{metrics['win_rate'] * 100:.1f}%", delta=f"損益比: {metrics['win_loss_ratio']:.2f}")

    # 2. 資産推移グラフ
    st.header("💰 資産推移")

    equity_history = pt.get_equity_history()

    if not equity_history.empty:
        fig = go.Figure()

        fig.add_trace(
            go.Scatter(
                x=equity_history["date"],
                y=equity_history["total_equity"],
                mode="lines",
                name="総資産",
                line=dict(color="#00D9FF", width=2),
            )
        )

        # 初期資本のライン
        fig.add_hline(y=metrics["initial_capital"], line_dash="dash", line_color="gray", annotation_text="初期資本")

        fig.update_layout(
            title="資産推移",
            xaxis_title="日付",
            yaxis_title="資産（円）",
            hovermode="x unified",
            template="plotly_dark",
        )

        st.plotly_chart(fig, use_container_width=True)
    else:
        st.info("まだ取引履歴がありません")

    # 3. 月次リターン
    st.header("📅 月次リターン")

    if not metrics["monthly_returns"].empty:
        monthly_df = pd.DataFrame(
            {"月": metrics["monthly_returns"].index.astype(str), "リターン(%)": metrics["monthly_returns"].values * 100}
        )

        fig = px.bar(
            monthly_df,
            x="月",
            y="リターン(%)",
            color="リターン(%)",
            color_continuous_scale=["red", "yellow", "green"],
            title="月次リターン",
        )

        fig.update_layout(template="plotly_dark")
        st.plotly_chart(fig, use_container_width=True)

    # 4. ベンチマーク比較
    st.header("🏆 ベンチマーク比較")

    col1, col2 = st.columns(2)

    with col1:
        benchmark_nikkei = analyzer.compare_to_benchmark("^N225")
        if benchmark_nikkei and "error" not in benchmark_nikkei:
            st.subheader("vs 日経平均")
            st.metric(
                "アウトパフォーマンス",
                f"{benchmark_nikkei['outperformance_pct']:.2f}%",
                delta=f"自分: {benchmark_nikkei['my_return_pct']:.2f}% | 日経: {benchmark_nikkei['benchmark_return_pct']:.2f}%",
            )

    with col2:
        benchmark_sp500 = analyzer.compare_to_benchmark("^GSPC")
        if benchmark_sp500 and "error" not in benchmark_sp500:
            st.subheader("vs S&P500")
            st.metric(
                "アウトパフォーマンス",
                f"{benchmark_sp500['outperformance_pct']:.2f}%",
                delta=f"自分: {benchmark_sp500['my_return_pct']:.2f}% | S&P: {benchmark_sp500['benchmark_return_pct']:.2f}%",
            )

    # 5. 戦略別パフォーマンス
    st.header("🎯 戦略別パフォーマンス")

    strategy_perf = analyzer.get_strategy_performance()

    if not strategy_perf.empty:
        st.dataframe(strategy_perf, use_container_width=True)
    else:
        st.info("まだ取引履歴がありません")

    # 6. 取引履歴
    st.header("📜 最近の取引")

    trade_history = pt.get_trade_history()

    if not trade_history.empty:
        recent_trades = trade_history.tail(10)[["timestamp", "ticker", "action", "price", "quantity", "realized_pnl"]]
        st.dataframe(recent_trades, use_container_width=True)
    else:
        st.info("まだ取引履歴がありません")


if __name__ == "__main__":
    create_performance_dashboard()
