"""
Portfolio Panel UI Module
Handles the Portfolio Simulation tab.
"""

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

from src.constants import NIKKEI_225_TICKERS, TICKER_NAMES
from src.data_loader import fetch_stock_data
from src.portfolio import PortfolioManager


def render_portfolio_panel(sidebar_config, strategies):
    """
    Renders the Portfolio Simulation tab content.

    Args:
        sidebar_config: Config dict from sidebar.
        strategies: List of initialized strategies available in the system.
    """
    st.header("ポートフォリオ・シミュレーション")
    st.write("複数の銘柄を組み合わせた場合のリスクとリターンをシミュレーションします。")

    # Selection logic based on sidebar
    ticker_group = sidebar_config.get("ticker_group")
    custom_tickers = sidebar_config.get("custom_tickers", [])
    period = sidebar_config.get("period", "2y")

    if ticker_group == "カスタム入力":
        available_tickers = custom_tickers
    else:
        # Default to Nikkei if not custom, or sidebar market selection logic could be more complex.
        # For simplicity, we use NIKKEI but ideally we should respect selected_market.
        # Since we don't pass full MARKETS dict here easily, we import NIKKEI.
        # If we want to support US/Europe here, we need to pass that down.
        # Let's assume Nikkei for now or pass MARKETS if needed.
        available_tickers = NIKKEI_225_TICKERS

    selected_portfolio = st.multiselect(
        "ポートフォリオに組み入れる銘柄を選択 (3つ以上推奨)",
        options=available_tickers,
        default=available_tickers[:5] if len(available_tickers) >= 5 else available_tickers,
        format_func=lambda x: f"{x} - {TICKER_NAMES.get(x, '')}",
    )

    initial_capital = st.number_input("初期投資額 (円)", value=10000000, step=1000000)

    if st.button("ポートフォリオを分析する"):
        if len(selected_portfolio) < 2:
            st.error("少なくとも2つの銘柄を選択してください。")
        else:
            with st.spinner("ポートフォリオ分析を実行中..."):
                pm = PortfolioManager(initial_capital=initial_capital)
                data_map_pf = fetch_stock_data(selected_portfolio, period=period)

                # 1. Correlation Matrix
                st.subheader("相関行列 (Correlation Matrix)")
                st.write(
                    "銘柄間の値動きの連動性を示します。1に近いほど同じ動き、-1に近いほど逆の動きをします。分散投資には相関が低い（色が薄い）組み合わせが有効です。"
                )
                corr_matrix = pm.calculate_correlation(data_map_pf)

                if not corr_matrix.empty:
                    fig_corr = px.imshow(
                        corr_matrix,
                        text_auto=True,
                        color_continuous_scale="RdBu_r",
                        zmin=-1,
                        zmax=1,
                        title="Correlation Matrix",
                    )
                    st.plotly_chart(fig_corr, use_container_width=True)

                # 2. Portfolio Backtest
                st.subheader("ポートフォリオ資産推移")

                # Strategy Selection
                st.subheader("戦略の選択")
                pf_strategies = {}
                cols = st.columns(3)
                strat_names = [s.name for s in strategies]

                # Note: This logic assumes 'strategies' are populated.
                # CombinedStrategy is usually a safe default.
                default_strat_index = 3 if len(strat_names) > 3 else 0

                for i, ticker in enumerate(selected_portfolio):
                    with cols[i % 3]:
                        selected_strat_name = st.selectbox(
                            f"{TICKER_NAMES.get(ticker, ticker)}",
                            strat_names,
                            index=default_strat_index,
                            key=f"strat_{ticker}",
                        )
                        pf_strategies[ticker] = next(s for s in strategies if s.name == selected_strat_name)

                st.divider()

                # Weight Optimization
                weight_mode = st.radio(
                    "配分比率 (Weights)",
                    ["均等配分 (Equal)", "最適化 (Max Sharpe)", "量子ハイブリッド最適化 (Quantum)"],
                    horizontal=True,
                )

                weights = {}
                if weight_mode == "均等配分 (Equal)":
                    weight = 1.0 / len(selected_portfolio)
                    weights = {t: weight for t in selected_portfolio}
                elif weight_mode == "最適化 (Max Sharpe)":
                    with st.spinner("シャープレシオ最大化ポートフォリオを計算中..."):
                        weights = pm.optimize_portfolio(data_map_pf)
                        st.success("最適化完了")
                else:
                    with st.spinner("量子ハイブリッドアニーリングで最適銘柄と配分を探索中..."):
                        weights = pm.optimize_portfolio_quantum(data_map_pf)
                        st.success("量子ハイブリッド最適化（銘柄選択＋重み配分）完了")

                if weight_mode != "均等配分 (Equal)":
                    st.write(f"推奨配分比率 ({weight_mode}):")
                    w_df = pd.DataFrame.from_dict(weights, orient="index", columns=["Weight"])
                    w_df["Weight"] = w_df["Weight"].apply(lambda x: f"{x * 100:.1f}%")
                    st.dataframe(w_df.T)

                pf_res = pm.simulate_portfolio(data_map_pf, pf_strategies, weights)

                if pf_res:
                    col1, col2 = st.columns(2)
                    col1.metric("トータルリターン", f"{pf_res['total_return'] * 100:.1f}%")
                    col2.metric("最大ドローダウン", f"{pf_res['max_drawdown'] * 100:.1f}%")

                    fig_pf = go.Figure()
                    fig_pf.add_trace(
                        go.Scatter(
                            x=pf_res["equity_curve"].index,
                            y=pf_res["equity_curve"],
                            mode="lines",
                            name="Portfolio",
                            line=dict(color="gold", width=2),
                        )
                    )
                    fig_pf.update_layout(
                        title="ポートフォリオ全体の資産推移",
                        xaxis_title="Date",
                        yaxis_title="Total Equity (JPY)",
                    )
                    st.plotly_chart(fig_pf, use_container_width=True)
                else:
                    st.error("シミュレーションに失敗しました。データが不足している可能性があります。")
