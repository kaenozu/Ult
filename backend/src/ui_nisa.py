"""
NISA Manager UI - NISA口座管理ダッシュボード
"""

import streamlit as st

from src.nisa_manager import NISAManager, NISAType


def render_nisa_manager():
    st.header("🏦 NISA口座管理")
    st.write("新NISA、つみたてNISA、一般NISAの枠を管理します。")

    manager = NISAManager()
    user_id = 1  # シングルユーザー想定

    # NISA種類選択
    nisa_type_display = st.selectbox("NISA口座タイプ", ["新NISA", "つみたてNISA", "一般NISA"])

    nisa_type_map = {
        "新NISA": NISAType.NEW_NISA,
        "つみたてNISA": NISAType.TSUMITATE,
        "一般NISA": NISAType.GENERAL,
    }
    nisa_type = nisa_type_map[nisa_type_display]

    # 残り枠表示
    st.subheader("📊 残り投資枠")

    try:
        remaining = manager.get_remaining_limit(user_id, nisa_type)

        if nisa_type == NISAType.NEW_NISA:
            col1, col2, col3 = st.columns(3)
            col1.metric(
                "成長投資枠（年間）",
                f"¥{remaining.get('growth_remaining', 0):,.0f}",
                f"/ ¥{remaining.get('growth_annual', 2400000):,.0f}",
            )
            col2.metric(
                "つみたて投資枠（年間）",
                f"¥{remaining.get('tsumitate_remaining', 0):,.0f}",
                f"/ ¥{remaining.get('tsumitate_annual', 1200000):,.0f}",
            )
            col3.metric(
                "生涯非課税限度額",
                f"¥{remaining.get('lifetime_remaining', 0):,.0f}",
                "/ ¥18,000,000",
            )
        else:
            col1, col2 = st.columns(2)
            col1.metric("年間残り枠", f"¥{remaining.get('annual_remaining', 0):,.0f}")
            col2.metric("使用済み", f"¥{remaining.get('used_this_year', 0):,.0f}")
    except Exception as e:
        st.info(f"枠情報を取得できませんでした: {e}")

    st.markdown("---")

    # 保有銘柄
    st.subheader("📈 NISA保有銘柄")

    try:
        holdings = manager.get_nisa_holdings(user_id, nisa_type)

        if not holdings.empty:
            st.dataframe(holdings, use_container_width=True)
        else:
            st.info("NISA口座での保有銘柄はありません。")
    except Exception as e:
        st.info(f"保有情報を取得できませんでした: {e}")

    st.markdown("---")

    # 購入シミュレーション
    st.subheader("💰 NISA購入シミュレーション")

    col1, col2, col3 = st.columns(3)
    with col1:
        ticker = st.text_input("銘柄コード", "7203.T")
    with col2:
        quantity = st.number_input("株数", min_value=1, value=100)
    with col3:
        price = st.number_input("株価", min_value=1, value=2000)

    amount = quantity * price
    st.info(f"購入金額: ¥{amount:,.0f}")

    can_buy = manager.can_buy_in_nisa(user_id, nisa_type, amount)

    if can_buy:
        st.success("✅ NISA枠で購入可能です")

        if st.button("📝 NISA枠で購入（シミュレーション）", type="primary"):
            success = manager.record_nisa_trade(
                user_id=user_id,
                nisa_type=nisa_type,
                ticker=ticker,
                action="BUY",
                quantity=quantity,
                price=price,
            )
            if success:
                st.success("購入を記録しました！")
                st.experimental_rerun()
            else:
                st.error("購入記録に失敗しました")
    else:
        st.warning("⚠️ NISA枠が不足しています。通常口座での購入を検討してください。")
