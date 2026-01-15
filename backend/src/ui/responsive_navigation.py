"""
Responsive Navigation Component
Provides mobile-friendly navigation with progressive disclosure
"""

import streamlit as st
from typing import Dict, List, Any


def render_responsive_nav():
    """Render responsive navigation that adapts to screen size"""

    # Detect screen width (approximation)
    is_mobile = st.session_state.get("is_mobile", False)

    if is_mobile:
        render_mobile_nav()
    else:
        render_desktop_nav()


def render_mobile_nav():
    """Mobile-optimized navigation"""

    # Quick action buttons for mobile
    col1, col2, col3, col4 = st.columns(4)

    with col1:
        if st.button(
            "📊",
            key="mobile_dashboard",
            help="ダッシュボード",
            use_container_width=True,
        ):
            st.session_state.selected_tab = 0
            st.experimental_rerun()

    with col2:
        if st.button("💼", key="mobile_trading", help="トレーディング", use_container_width=True):
            st.session_state.selected_tab = 1
            st.experimental_rerun()

    with col3:
        if st.button("🤖", key="mobile_ai", help="AI分析", use_container_width=True):
            st.session_state.selected_tab = 2
            st.experimental_rerun()

    with col4:
        if st.button(
            "📈",
            key="mobile_performance",
            help="パフォーマンス",
            use_container_width=True,
        ):
            st.session_state.selected_tab = 3
            st.experimental_rerun()

    # Quick stats for mobile
    render_mobile_quick_stats()


def render_desktop_nav():
    """Desktop navigation with full features"""

    # Navigation breadcrumb
    st.markdown("### ナビゲーション")

    cols = st.columns(5)
    nav_items = [
        ("🏠 ダッシュボード", 0, "市場概要と基本情報"),
        ("💼 トレーディング", 1, "取引実行とポートフォリオ"),
        ("🤖 AI分析", 2, "AI予測とインサイト"),
        ("📊 パフォーマンス", 3, "運用成績分析"),
        ("🧪 詳細設定", 4, "高度な機能と設定"),
    ]

    for i, (col, (label, tab_idx, description)) in enumerate(zip(cols, nav_items)):
        with col:
            is_selected = st.session_state.get("selected_tab", 0) == tab_idx
            button_type = "primary" if is_selected else "secondary"

            if st.button(
                label,
                key=f"nav_{tab_idx}",
                type=button_type,
                help=description,
                use_container_width=True,
            ):
                st.session_state.selected_tab = tab_idx
                st.experimental_rerun()


def render_mobile_quick_stats():
    """Render quick stats for mobile view"""

    st.markdown("---")

    try:
        # Get portfolio data
        from src.paper_trader import PaperTrader

        pt = PaperTrader()

        cash = pt.get_cash()
        positions = pt.get_positions()

        # Calculate total value
        total_value = cash
        for ticker, pos in positions.items():
            qty = pos.get("quantity", 0)
            current_price = pos.get("current_price", pos.get("avg_price", 0))
            total_value += qty * current_price

        # Calculate P&L
        initial_capital = getattr(pt, "initial_capital", 500000)
        total_pnl = total_value - initial_capital
        pnl_pct = (total_pnl / initial_capital * 100) if initial_capital > 0 else 0

        # Display mobile metrics
        col1, col2 = st.columns(2)

        with col1:
            st.metric(
                "総資産",
                f"¥{total_value:,.0f}",
                delta=f"{pnl_pct:+.2f}%" if pnl_pct != 0 else None,
            )

        with col2:
            st.metric(
                "ポジション数",
                len([p for p in positions.values() if p.get("quantity", 0) > 0]),
            )

    except Exception:
        st.error("データ読み込みエラー")


def render_breadcrumb():
    """Render breadcrumb navigation"""

    current_tab = st.session_state.get("selected_tab", 0)
    tab_names = [
        "ダッシュボード",
        "トレーディング",
        "AI分析",
        "パフォーマンス",
        "詳細設定",
    ]

    if current_tab < len(tab_names):
        breadcrumb = f"ホーム > {tab_names[current_tab]}"
        st.caption(breadcrumb)


def toggle_mobile_mode():
    """Toggle between mobile and desktop views"""

    is_mobile = st.session_state.get("is_mobile", False)

    # Add toggle to sidebar
    st.sidebar.markdown("---")
    st.sidebar.subheader("📱 表示モード")

    new_mode = st.sidebar.checkbox("モバイル表示", value=is_mobile, help="モバイル最適化表示を切り替え")

    if new_mode != is_mobile:
        st.session_state.is_mobile = new_mode
        st.experimental_rerun()


def render_quick_actions():
    """Render quick action buttons"""

    st.markdown("#### クイックアクション")

    col1, col2, col3 = st.columns(3)

    with col1:
        if st.button("🔄 最新データ", key="quick_refresh", use_container_width=True):
            st.info("データを更新しています...")
            st.experimental_rerun()

    with col2:
        if st.button("📊 レポート", key="quick_report", use_container_width=True):
            st.info("レポートを生成中...")
            # Generate quick report logic here

    with col3:
        if st.button("⚙️ 設定", key="quick_settings", use_container_width=True):
            st.session_state.selected_tab = 4
            st.experimental_rerun()


def render_help_section():
    """Render help section for current tab"""

    current_tab = st.session_state.get("selected_tab", 0)

    help_texts = {
        0: "ダッシュボード: 市場概要とポートフォリオ状況を確認できます",
        1: "トレーディング: 取引実行、ポートフォリオ管理、市場スキャンが利用できます",
        2: "AI分析: AIによる予測、ニュース分析、投資委員会の意見を確認できます",
        3: "パフォーマンス: 運用成績、リターン分析、リポート機能を利用できます",
        4: "詳細設定: 戦略設定、システム設定、高度な機能を利用できます",
    }

    if current_tab in help_texts:
        with st.expander("ℹ️ ヘルプ", expanded=False):
            st.info(help_texts[current_tab])


def render_navigation_feedback():
    """Render navigation feedback and suggestions"""

    user_experience = st.session_state.get("nav_feedback_score", None)

    if user_experience is None:
        st.markdown("#### 📋 ご意見をお聞かせください")

        rating = st.slider(
            "ナビゲーションの使いやすさ",
            1,
            5,
            3,
            help="1（使いにくい）〜5（とても使いやすい）",
        )

        comment = st.text_area(
            "ご意見・ご要望",
            placeholder="改善点やご要望があればお聞かせください",
            height=100,
        )

        if st.button("送信", key="nav_feedback", type="primary"):
            st.session_state.nav_feedback_score = rating
            st.session_state.nav_feedback_comment = comment
            st.success("ご意見ありがとうございます！改善に役立てます。")
            st.experimental_rerun()
    else:
        st.success(f"評価: {'⭐' * st.session_state.nav_feedback_score}")
        if st.button("評価を再送", key="re_rate"):
            del st.session_state.nav_feedback_score
            del st.session_state.nav_feedback_comment
            st.experimental_rerun()
