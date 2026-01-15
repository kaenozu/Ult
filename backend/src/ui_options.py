"""
Options Pricing UI - オプション価格計算ダッシュボード
"""

import numpy as np
import plotly.graph_objects as go
import streamlit as st

from src.options_pricing import OptionsCalculator, OptionStrategy


def render_options_pricing():
    st.header("📈 オプション価格計算")
    st.write("Black-Scholesモデルによるオプション価格計算とGreeks分析を行います。")

    calc = OptionsCalculator()

    tab1, tab2, tab3 = st.tabs(["🔢 価格計算", "📊 Greeks分析", "🎯 戦略シミュレーション"])

    with tab1:
        st.subheader("Black-Scholesモデル")

        col1, col2 = st.columns(2)

        with col1:
            spot_price = st.number_input("現在株価 (S)", value=1500.0, step=10.0)
            strike_price = st.number_input("行使価格 (K)", value=1550.0, step=10.0)
            volatility = st.slider("ボラティリティ (σ)", 0.1, 1.0, 0.3, 0.01)

        with col2:
            expiry_days = st.number_input("満期までの日数", value=30, min_value=1, max_value=365)
            risk_free_rate = st.slider("リスクフリーレート", 0.0, 0.1, 0.01, 0.001)
            option_type = st.radio("オプション種類", ["コール", "プット"])

        T = expiry_days / 365.0
        opt_type = "call" if option_type == "コール" else "put"

        if st.button("オプション価格を計算", type="primary"):
            price = calc.black_scholes(spot_price, strike_price, T, risk_free_rate, volatility, opt_type)

            st.success(f"**{option_type}オプション価格: ¥{price:,.2f}**")

            # ペイオフ図
            prices = np.linspace(spot_price * 0.7, spot_price * 1.3, 100)

            if opt_type == "call":
                payoffs = np.maximum(prices - strike_price, 0) - price
            else:
                payoffs = np.maximum(strike_price - prices, 0) - price

            fig = go.Figure()
            fig.add_trace(go.Scatter(x=prices, y=payoffs, mode="lines", name="ペイオフ"))
            fig.add_hline(y=0, line_dash="dash", line_color="gray")
            fig.add_vline(
                x=strike_price,
                line_dash="dash",
                line_color="red",
                annotation_text="行使価格",
            )
            fig.update_layout(
                title=f"{option_type}オプション ペイオフ図",
                xaxis_title="株価",
                yaxis_title="損益",
                height=400,
            )
            st.plotly_chart(fig, use_container_width=True)

    with tab2:
        st.subheader("Greeks (リスク指標)")

        col1, col2 = st.columns(2)

        with col1:
            s = st.number_input("株価", value=1500.0, step=10.0, key="greeks_s")
            k = st.number_input("行使価格", value=1550.0, step=10.0, key="greeks_k")

        with col2:
            t_days = st.number_input("満期日数", value=30, key="greeks_t")
            sigma = st.slider("ボラティリティ", 0.1, 1.0, 0.3, 0.01, key="greeks_sigma")

        T = t_days / 365.0
        r = 0.01

        greeks = calc.calculate_greeks(s, k, T, r, sigma, "call")

        col1, col2, col3, col4, col5 = st.columns(5)
        col1.metric("Delta", f"{greeks['delta']:.4f}")
        col2.metric("Gamma", f"{greeks['gamma']:.6f}")
        col3.metric("Theta", f"{greeks['theta']:.4f}")
        col4.metric("Vega", f"{greeks['vega']:.4f}")
        col5.metric("Rho", f"{greeks['rho']:.4f}")

        st.markdown(
            """
#### Greeks 解説
        - **Delta**: 株価1円変動に対するオプション価格の変動
        - **Gamma**: Deltaの変化率（加速度）
        - **Theta**: 1日経過に対するオプション価格の減少（時間価値の減衰）
        - **Vega**: ボラティリティ1%変動に対するオプション価格の変動
        - **Rho**: 金利1%変動に対するオプション価格の変動
        """
        )

    with tab3:
        st.subheader("オプション戦略")

        strategy_type = st.selectbox("戦略を選択", ["カバードコール", "プロテクティブプット", "ストラドル"])

        if strategy_type == "カバードコール":
            col1, col2 = st.columns(2)
            with col1:
                stock_price = st.number_input("保有株価", value=1500.0)
                stock_qty = st.number_input("保有株数", value=100, min_value=100, step=100)
            with col2:
                call_strike = st.number_input("コール行使価格", value=1600.0)
                call_premium = st.number_input("コールプレミアム", value=30.0)

            if st.button("戦略分析"):
                result = OptionStrategy.covered_call(stock_price, stock_qty, call_strike, call_premium)

                col1, col2, col3 = st.columns(3)
                col1.metric("最大利益", f"¥{result['max_profit']:,.0f}")
                col2.metric("最大損失", f"¥{result['max_loss']:,.0f}")
                col3.metric("損益分岐点", f"¥{result['breakeven']:,.0f}")

        elif strategy_type == "プロテクティブプット":
            col1, col2 = st.columns(2)
            with col1:
                stock_price = st.number_input("保有株価", value=1500.0, key="pp_sp")
                stock_qty = st.number_input("保有株数", value=100, min_value=100, step=100, key="pp_qty")
            with col2:
                put_strike = st.number_input("プット行使価格", value=1400.0)
                put_premium = st.number_input("プットプレミアム", value=25.0)

            if st.button("戦略分析", key="pp_analyze"):
                result = OptionStrategy.protective_put(stock_price, stock_qty, put_strike, put_premium)

                col1, col2, col3 = st.columns(3)
                col1.metric("最大利益", "無限大")
                col2.metric("最大損失", f"¥{result['max_loss']:,.0f}")
                col3.metric("損益分岐点", f"¥{result['breakeven']:,.0f}")

        else:  # ストラドル
            col1, col2 = st.columns(2)
            with col1:
                strike = st.number_input("行使価格", value=1500.0, key="straddle_k")
                call_prem = st.number_input("コールプレミアム", value=40.0, key="straddle_call")
            with col2:
                put_prem = st.number_input("プットプレミアム", value=35.0, key="straddle_put")

            if st.button("戦略分析", key="straddle_analyze"):
                result = OptionStrategy.straddle(strike, call_prem, put_prem)

                col1, col2, col3 = st.columns(3)
                col1.metric("最大利益", "無限大")
                col2.metric("最大損失", f"¥{result['max_loss']:,.0f}")
                col3.metric("上方損益分岐点", f"¥{result['upper_breakeven']:,.0f}")

                st.info(f"下方損益分岐点: ¥{result['lower_breakeven']:,.0f}")
