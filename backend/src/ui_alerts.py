"""
UI Alerts - アラート管理のUI
"""

import streamlit as st

from src.alert_manager import Alert, AlertCondition, AlertManager, AlertType


def render_alerts_tab():
    """アラートタブ表示"""
    st.header("🔔 アラート管理")
    st.write("価格アラート、ポートフォリオアラート、カスタムアラートを設定します。")

    manager = AlertManager()

    # タブ
    tab1, tab2, tab3 = st.tabs(["アラート一覧", "新規作成", "履歴"])

    with tab1:
        render_alert_list(manager)

    with tab2:
        render_create_alert(manager)

    with tab3:
        render_alert_history(manager)


def render_alert_list(manager: AlertManager):
    """アラート一覧表示"""
    st.subheader("アラート一覧")

    alerts = manager.get_alerts(enabled_only=False)

    if not alerts:
        st.info("アラートがありません。")
        return

    for alert in alerts:
        with st.expander(
            f"{'🔔' if alert.enabled else '🔕'} {alert.message or f'{alert.ticker} {alert.condition} {alert.threshold}'}"
        ):
            col1, col2, col3 = st.columns([2, 1, 1])

            with col1:
                st.write(f"**タイプ**: {alert.type}")
                st.write(f"**銘柄**: {alert.ticker or 'N/A'}")
                st.write(f"**条件**: {alert.condition} {alert.threshold}")
                st.write(f"**作成日**: {alert.created_at}")

                if alert.triggered:
                    st.warning(f"トリガー済み: {alert.triggered_at}")

            with col2:
                if st.button("有効/無効", key=f"toggle_{alert.id}"):
                    manager.toggle_alert(alert.id, not alert.enabled)
                    st.experimental_rerun()

            with col3:
                if st.button("削除", key=f"delete_{alert.id}", type="secondary"):
                    manager.delete_alert(alert.id)
                    st.success("削除しました")
                    st.experimental_rerun()


def render_create_alert(manager: AlertManager):
    """アラート作成UI"""
    st.subheader("新規アラート作成")

    alert_type = st.selectbox(
        "アラートタイプ",
        [AlertType.PRICE.value, AlertType.PORTFOLIO.value, AlertType.CUSTOM.value],
    )

    if alert_type == AlertType.PRICE.value:
        # 価格アラート
        ticker = st.text_input("銘柄コード", value="7203.T")

        condition = st.selectbox("条件", [AlertCondition.ABOVE.value, AlertCondition.BELOW.value])

        threshold = st.number_input("閾値（円）", value=1000.0, step=10.0)

        message = st.text_input(
            "メッセージ",
            value=f"{ticker}が{threshold}円を{'超えました' if condition == AlertCondition.ABOVE.value else '下回りました'}",
        )

        if st.button("作成", type="primary"):
            alert = Alert(
                type=alert_type,
                ticker=ticker,
                condition=condition,
                threshold=threshold,
                message=message,
            )
            alert_id = manager.create_alert(alert)
            st.success(f"アラートを作成しました (ID: {alert_id})")
            st.experimental_rerun()

    elif alert_type == AlertType.PORTFOLIO.value:
        # ポートフォリオアラート
        condition = st.selectbox("条件", [AlertCondition.ABOVE.value, AlertCondition.BELOW.value])

        threshold = st.number_input("閾値（%）", value=5.0, step=0.5)

        message = st.text_input(
            "メッセージ",
            value=f"ポートフォリオが{threshold}%を{'超えました' if condition == AlertCondition.ABOVE.value else '下回りました'}",
        )

        if st.button("作成", type="primary"):
            alert = Alert(
                type=alert_type,
                condition=condition,
                threshold=threshold,
                message=message,
            )
            alert_id = manager.create_alert(alert)
            st.success(f"アラートを作成しました (ID: {alert_id})")
            st.experimental_rerun()


def render_alert_history(manager: AlertManager):
    """アラート履歴表示"""
    st.subheader("アラート履歴")

    history = manager.get_alert_history(limit=50)

    if history.empty:
        st.info("履歴がありません。")
        return

    st.dataframe(history, use_container_width=True)


def check_and_display_alerts():
    """アラートチェックと表示（サイドバー）"""
    manager = AlertManager()

    # 価格アラートチェック（簡易版）
    alerts = manager.get_alerts()

    active_alerts = [a for a in alerts if a.enabled and not a.triggered]

    if active_alerts:
        st.sidebar.markdown("---")
        st.sidebar.subheader("🔔 アクティブアラート")
        st.sidebar.write(f"{len(active_alerts)}件のアラートが有効です")

        if st.sidebar.button("アラートを確認"):
            st.switch_page("pages/alerts.py")


if __name__ == "__main__":
    render_alerts_tab()
