"""
Tax Calculator UI - 税務計算ダッシュボード
"""

import streamlit as st

from src.paper_trader import PaperTrader
from src.tax_calculator import TaxCalculator


def render_tax_calculator():
    st.header("💴 税務計算・損益通算")
    st.write("株式譲渡所得税の計算、損益通算、節税シミュレーションを行います。")

    calc = TaxCalculator()
    pt = PaperTrader()

    tab1, tab2, tab3 = st.tabs(["📊 譲渡所得税計算", "⚖️ 損益通算", "📅 年末税務戦略"])

    with tab1:
        st.subheader("譲渡所得税シミュレーション")

        profit = st.number_input("利益額 (円)", min_value=0, value=100000, step=10000)

        is_nisa = st.checkbox("NISA口座での利益")

        if st.button("計算する", key="calc_tax"):
            result = calc.calculate_capital_gains_tax(profit, is_nisa)

            if is_nisa:
                st.success("🎉 NISA口座の利益は非課税です！")
            else:
                col1, col2, col3 = st.columns(3)
                col1.metric("利益", f"¥{result['profit']:,.0f}")
                col2.metric("税金合計", f"¥{result['total_tax']:,.0f}")
                col3.metric("手取り", f"¥{result['net_profit']:,.0f}")

                st.markdown("### 税金内訳")
                st.write(f"- 所得税: ¥{result.get('income_tax', 0):,.0f}")
                st.write(f"- 住民税: ¥{result.get('local_tax', 0):,.0f}")
                st.write(f"- 復興特別所得税: ¥{result.get('reconstruction_tax', 0):,.0f}")

    with tab2:
        st.subheader("損益通算計算")
        st.write("複数銘柄の利益と損失を通算して、税金を最適化します。")

        col1, col2 = st.columns(2)

        with col1:
            st.write("**利益**")
            gains_input = st.text_area("利益（1行1件）", "50000\n30000\n20000", height=100)
            gains = [float(x) for x in gains_input.strip().split("\n") if x.strip()]

        with col2:
            st.write("**損失**")
            losses_input = st.text_area("損失（1行1件）", "15000\n10000", height=100)
            losses = [float(x) for x in losses_input.strip().split("\n") if x.strip()]

        if st.button("通算計算", key="calc_offset"):
            result = calc.calculate_loss_offset(gains, losses)

            col1, col2, col3 = st.columns(3)
            col1.metric("総利益", f"¥{result['total_gains']:,.0f}")
            col2.metric("総損失", f"¥{-result['total_losses']:,.0f}")
            col3.metric("通算後利益", f"¥{result['net_profit']:,.0f}")

            if result["carryover_loss"] > 0:
                st.warning(f"繰越損失: ¥{result['carryover_loss']:,.0f}（来年以降3年間繰越可能）")

    with tab3:
        st.subheader("年末税務戦略")
        st.write("現在のポジションを分析し、最適な節税戦略を提案します。")

        # 実現利益入力
        realized_gains = st.number_input("今年の実現利益 (円)", min_value=0, value=0, step=10000)

        # 未実現ポジション取得
        positions = pt.get_positions()

        if positions.empty:
            st.info("現在ポジションがありません。")
        else:
            st.dataframe(
                positions[
                    [
                        "ticker",
                        "quantity",
                        "entry_price",
                        "current_price",
                        "unrealized_pnl",
                    ]
                ],
                use_container_width=True,
            )

            if st.button("年末戦略を分析", key="year_end"):
                strategy = calc.calculate_year_end_tax_strategy(realized_gains, positions)

                st.markdown("### 📋 推奨アクション")

                if strategy.get("loss_harvesting_candidates"):
                    st.warning("以下の銘柄の損失確定を検討してください：")
                    for rec in strategy["loss_harvesting_candidates"]:
                        st.write(
                            f"- **{rec['ticker']}**: 損失 ¥{rec['unrealized_loss']:,.0f} → 節税効果 ¥{rec['tax_benefit']:,.0f}"
                        )
                else:
                    st.success("損失確定が必要な銘柄はありません。")
