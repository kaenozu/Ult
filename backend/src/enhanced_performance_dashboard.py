"""
Enhanced Performance Dashboard
ベンチマーク比較機能を含む高度なパフォーマンスダッシュボード
"""

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from src.benchmark_comparator import BenchmarkComparator
from src.design_tokens import Colors
from src.formatters import format_percentage
from src.paper_trader import PaperTrader


def create_performance_dashboard():
    """パフォーマンスダッシュボードを表示"""

    st.header("📊 パフォーマンス分析")
    st.markdown("ポートフォリオのパフォーマンスをベンチマークと比較します。")

    # データ取得
    pt = PaperTrader()
    pt.get_current_balance()
    equity_history = pt.get_equity_history()

    if equity_history.empty:
        st.info("📈 取引履歴がありません。Paper Tradingを開始してデータを蓄積してください。")
        return

    # ベンチマーク選択
    st.subheader("🎯 ベンチマーク設定")
    col1, col2 = st.columns([2, 1])

    with col1:
        benchmark_options = {
            "日経225": "nikkei225",
            "TOPIX": "topix",
            "S&P 500": "sp500",
            "NASDAQ": "nasdaq",
        }
        selected_benchmark_name = st.selectbox(
            "比較対象",
            list(benchmark_options.keys()),
            help="ポートフォリオのパフォーマンスを比較するベンチマークを選択",
        )
        selected_benchmark = benchmark_options[selected_benchmark_name]

    with col2:
        period_days = st.selectbox(
            "期間",
            [30, 90, 180, 365],
            format_func=lambda x: f"{x}日間",
            index=2,  # デフォルト180日
        )

    # ベンチマーク比較分析
    with st.spinner("ベンチマークデータを取得中..."):
        try:
            comparator = BenchmarkComparator()

            # ポートフォリオのリターンを計算
            equity_recent = equity_history.tail(period_days)
            if len(equity_recent) < 2:
                st.warning("データが不足しています。もう少し取引を続けてください。")
                return

            # 日次リターンを計算
            equity_recent["date"] = pd.to_datetime(equity_recent["date"])
            equity_recent = equity_recent.set_index("date")
            portfolio_returns = equity_recent["equity"].pct_change().dropna()

            # ベンチマークデータ取得
            benchmark_data = comparator.fetch_benchmark_data(selected_benchmark, period=f"{period_days}d")

            if benchmark_data is None or benchmark_data.empty:
                st.error("ベンチマークデータの取得に失敗しました。ネットワーク接続を確認してください。")
                return

            benchmark_returns = benchmark_data["Close"].pct_change().dropna()

            # インデックスを合わせる
            common_dates = portfolio_returns.index.intersection(benchmark_returns.index)
            if len(common_dates) < 5:
                st.warning("比較可能なデータが不足しています。")
                return

            portfolio_returns_aligned = portfolio_returns.loc[common_dates]
            benchmark_returns_aligned = benchmark_returns.loc[common_dates]

            # 比較レポート生成
            report = comparator.generate_comparison_report(portfolio_returns_aligned, selected_benchmark)

        except Exception as e:
            st.error(f"分析エラー: {str(e)}")
            return

    st.divider()

    # === 主要メトリクス ===
    st.subheader("📈 パフォーマンス指標")

    col1, col2, col3, col4 = st.columns(4)

    with col1:
        portfolio_total_return = equity_recent["equity"].iloc[-1] / equity_recent["equity"].iloc[0] - 1
        st.metric(
            "ポートフォリオ",
            format_percentage(portfolio_total_return, decimals=2),
            help="選択期間の総リターン",
        )

    with col2:
        st.metric(
            selected_benchmark_name,
            format_percentage(report["benchmark_total_return"], decimals=2),
            help="ベンチマークの総リターン",
        )

    with col3:
        alpha = report["alpha"]
        alpha_color = "green" if alpha > 0 else "red"
        st.metric("アルファ (α)", f"{alpha:+.2f}%", help="ベンチマークを上回る超過リターン")
        st.markdown(f":{alpha_color}[{'市場超過' if alpha > 0 else '市場未達'}]")

    with col4:
        beta = report["beta"]
        st.metric("ベータ (β)", f"{beta:.2f}", help="市場の動きに対する感応度")
        if beta > 1.2:
            st.caption("🔴 高ボラティリティ")
        elif beta < 0.8:
            st.caption("🟢 低ボラティリティ")
        else:
            st.caption("🟡 中程度")

    # 追加メトリクス
    st.markdown("---")
    col5, col6, col7 = st.columns(3)

    with col5:
        st.metric(
            "情報比率 (IR)",
            f"{report['information_ratio']:.2f}",
            help="アクティブリターンの効率性",
        )
        if report["information_ratio"] > 0.5:
            st.success("✅ 優秀")
        elif report["information_ratio"] > 0:
            st.info("🟡 良好")
        else:
            st.warning("⚠️ 改善の余地")

    with col6:
        tracking_error = report["tracking_error"]
        st.metric(
            "トラッキングエラー",
            format_percentage(tracking_error, decimals=2),
            help="ベンチマークとの乖離度",
        )

    with col7:
        active_return = report["active_return"]
        st.metric("アクティブリターン", f"{active_return:+.2f}%", help="ベンチマークとの差")

    st.divider()

    # === 解釈 ===
    st.subheader("💡 分析解釈")
    interpretation_lines = report["interpretation"].split("\n")
    for line in interpretation_lines:
        if line.strip():
            if "優れています" in line or "効率的" in line:
                st.success(line)
            elif "注意" in line or "慎重" in line:
                st.warning(line)
            else:
                st.info(line)

    st.divider()

    # === チャート比較 ===
    st.subheader("📊 累積リターン比較")

    # 累積リターンを計算
    portfolio_cumulative = (1 + portfolio_returns_aligned).cumprod()
    benchmark_cumulative = (1 + benchmark_returns_aligned).cumprod()

    fig = go.Figure()

    fig.add_trace(
        go.Scatter(
            x=portfolio_cumulative.index,
            y=(portfolio_cumulative - 1) * 100,
            mode="lines",
            name="ポートフォリオ",
            line=dict(color=Colors.PRIMARY_CYAN, width=3),
        )
    )

    fig.add_trace(
        go.Scatter(
            x=benchmark_cumulative.index,
            y=(benchmark_cumulative - 1) * 100,
            mode="lines",
            name=selected_benchmark_name,
            line=dict(color=Colors.WARNING, width=2, dash="dash"),
        )
    )

    fig.update_layout(
        title="累積リターン推移",
        xaxis_title="日付",
        yaxis_title="リターン (%)",
        hovermode="x unified",
        height=500,
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
    )

    st.plotly_chart(fig, use_container_width=True)

    st.divider()

    # === リターン分布 ===
    st.subheader("📉 リターン分布")

    col_dist1, col_dist2 = st.columns(2)

    with col_dist1:
        st.markdown("**ポートフォリオ**")
        fig_hist1 = go.Figure(
            data=[
                go.Histogram(
                    x=portfolio_returns_aligned * 100,
                    nbinsx=30,
                    marker_color=Colors.PRIMARY_CYAN,
                    opacity=0.7,
                )
            ]
        )
        fig_hist1.update_layout(
            xaxis_title="日次リターン (%)",
            yaxis_title="頻度",
            height=300,
            showlegend=False,
        )
        st.plotly_chart(fig_hist1, use_container_width=True)

        # 統計
        st.caption(
            f"平均: {portfolio_returns_aligned.mean() * 100:.2f}% | 標準偏差: {portfolio_returns_aligned.std() * 100:.2f}%"
        )

    with col_dist2:
        st.markdown(f"**{selected_benchmark_name}**")
        fig_hist2 = go.Figure(
            data=[
                go.Histogram(
                    x=benchmark_returns_aligned * 100,
                    nbinsx=30,
                    marker_color=Colors.WARNING,
                    opacity=0.7,
                )
            ]
        )
        fig_hist2.update_layout(
            xaxis_title="日次リターン (%)",
            yaxis_title="頻度",
            height=300,
            showlegend=False,
        )
        st.plotly_chart(fig_hist2, use_container_width=True)

        # 統計
        st.caption(
            f"平均: {benchmark_returns_aligned.mean() * 100:.2f}% | 標準偏差: {benchmark_returns_aligned.std() * 100:.2f}%"
        )

    st.divider()

    # === アクションアイテム ===
    st.subheader("🎯 推奨アクション")

    recommendations = []

    if report["alpha"] < 0:
        recommendations.append("⚠️ アルファがマイナスです。戦略の見直しを検討してください。")
    else:
        recommendations.append("✅ ベンチマークを上回るパフォーマンスです。")

    if report["information_ratio"] < 0.5:
        recommendations.append("💡 情報比率が低めです。リスクに見合ったリターンが得られているか確認しましょう。")

    if report["beta"] > 1.5:
        recommendations.append("⚠️ ベータが高く、市場変動の影響を大きく受けます。リスク許容度を確認してください。")
    elif report["beta"] < 0.5:
        recommendations.append("💡 ベータが低く、保守的なポートフォリオです。")

    if report["tracking_error"] > 0.1:
        recommendations.append("📊 ベンチマークとの乖離が大きいです。意図的なアクティブ運用か確認しましょう。")

    if not recommendations:
        recommendations.append("✅ 現状維持で問題ありません。")

    for rec in recommendations:
        if "⚠️" in rec:
            st.warning(rec)
        elif "✅" in rec:
            st.success(rec)
        else:
            st.info(rec)


if __name__ == "__main__":
    create_performance_dashboard()
