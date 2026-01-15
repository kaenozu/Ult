"""
Backtest Panel UI Module
Handles the Historical Validation tab.
"""

import streamlit as st

from src.backtest_engine import HistoricalBacktester
from src.constants import MARKETS, TICKER_NAMES
from src.strategies import BollingerBandsStrategy, CombinedStrategy, DividendStrategy, RSIStrategy


def render_backtest_panel(sidebar_config):
    """
    Renders the Historical Validation tab content.
    """
    st.header("🕰️ 過去検証 (Historical Validation)")
    st.write("過去10年間のデータを使用して、戦略の長期的な有効性を検証します。")

    selected_market = sidebar_config.get("selected_market", "Japan")
    # Assume global MARKETS is available or import it
    ticker_list = MARKETS.get(selected_market, MARKETS["Japan"])

    col1, col2, col3 = st.columns(3)
    with col1:
        hist_ticker = st.selectbox(
            "検証銘柄", ticker_list, format_func=lambda x: f"{x} - {TICKER_NAMES.get(x, '')}", key="hist_ticker"
        )
    with col2:
        hist_strategy = st.selectbox(
            "戦略",
            ["RSIStrategy", "BollingerBandsStrategy", "CombinedStrategy", "DividendStrategy"],
            key="hist_strategy",
        )
    with col3:
        hist_years = st.slider("検証期間 (年)", 1, 10, 10, key="hist_years")

    if st.button("検証開始", type="primary", key="run_hist_btn"):
        with st.spinner(f"{hist_ticker} の過去{hist_years}年間のデータを取得・検証中..."):
            try:
                strategy_map = {
                    "RSIStrategy": RSIStrategy,
                    "BollingerBandsStrategy": BollingerBandsStrategy,
                    "CombinedStrategy": CombinedStrategy,
                    "DividendStrategy": DividendStrategy,
                }

                # Instantiate strategy? BacktestEngine might expect class or instance.
                # Checking logic: hb.run_test(..., strategy_class, ...)
                # Assuming run_test instantiates it.

                hb = HistoricalBacktester()
                results = hb.run_test(hist_ticker, strategy_map[hist_strategy], years=hist_years)

                if "error" in results:
                    st.error(f"エラー: {results['error']}")
                else:
                    # Metrics
                    st.markdown("### 📊 検証結果")
                    m1, m2, m3, m4 = st.columns(4)
                    m1.metric("CAGR (年平均成長率)", f"{results['cagr']:.2%}", help="複利計算による年平均リターン")
                    m2.metric("総リターン", f"{results['total_return']:.2%}")
                    m3.metric("最大ドローダウン", f"{results['max_drawdown']:.2%}", help="資産の最大下落率")
                    m4.metric("勝率", f"{results['win_rate']:.1%}")

                    # Benchmark Comparison
                    bh_cagr = results["buy_hold_cagr"]
                    delta_cagr = results["cagr"] - bh_cagr
                    st.info(
                        f"参考: Buy & Hold (ガチホ) の CAGR は {bh_cagr:.2%} です。戦略による改善効果: {delta_cagr:+.2%}"
                    )

                    # Equity Curve
                    st.subheader("資産推移")
                    equity_curve = results["equity_curve"]
                    equity_df = equity_curve.to_frame(name="Strategy")
                    st.line_chart(equity_df, use_container_width=True)

            except Exception as e:
                st.error(f"検証中にエラーが発生しました: {e}")
