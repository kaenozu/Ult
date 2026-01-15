"""
Enhanced UI Components
Provides reusable, high-quality UI widgets with loading states and polished UX.
"""

from typing import Any, Callable, List, Optional, Tuple

import pandas as pd
import streamlit as st


class LoadingContext:
    """Context manager for loading spinners."""

    def __init__(self, message: str = "読み込み中..."):
        self.message = message
        self.spinner = None

    def __enter__(self):
        self.spinner = st.spinner(self.message)
        return self.spinner.__enter__()

    def __exit__(self, exc_type, exc_val, exc_tb):
        return self.spinner.__exit__(exc_type, exc_val, exc_tb)


def loading_spinner(message: str = "読み込み中..."):
    """Helper to create a loading context."""
    return LoadingContext(message)


def async_component(loader_func: Callable, placeholder_text: str = "データを読み込んでいます...") -> Any:
    """Load component asynchronously with placeholder to prevent UI blocking vibe."""
    placeholder = st.empty()
    with placeholder.container():
        st.info(f"⏳ {placeholder_text}")

    try:
        result = loader_func()
        placeholder.empty()
        return result
    except Exception as e:
        placeholder.error(f"❌ 読み込みエラー: {str(e)}")
        return None


def metric_card(label: str, value: str, delta: Optional[str] = None, help_text: Optional[str] = None, icon: str = "📊"):
    """Displays a styled metric card with an icon."""
    col1, col2 = st.columns([1, 4])
    with col1:
        st.markdown(f"<div style='font-size: 2em; text-align: center;'>{icon}</div>", unsafe_allow_html=True)
    with col2:
        if help_text:
            st.metric(label=label, value=value, delta=delta, help=help_text)
        else:
            st.metric(label=label, value=value, delta=delta)


def status_badge(status: str, message: str = ""):
    """Displays a colored status badge."""
    colors = {"success": "#28a745", "warning": "#ffc107", "error": "#dc3545", "info": "#17a2b8"}
    icons = {"success": "✅", "warning": "⚠️", "error": "❌", "info": "ℹ️"}
    color = colors.get(status, "#6c757d")
    icon = icons.get(status, "•")

    st.markdown(
        f"""
    <div style='
        background-color: {color}20;
        border-left: 4px solid {color};
        padding: 10px;
        border-radius: 4px;
        margin: 5px 0;
    '>
        <strong>{icon} {message}</strong>
    </div>
    """,
        unsafe_allow_html=True,
    )


def collapsible_section(title: str, content_func: Callable, default_expanded: bool = False):
    """Renders a collapsible section (expander)."""
    with st.expander(title, expanded=default_expanded):
        content_func()


def data_table_with_search(df: pd.DataFrame, search_columns: list = None):
    """Interactive table with client-side search filtering."""
    if df.empty:
        st.info("データがありません")
        return

    # Search box
    search_term = st.text_input("🔍 検索", key=f"search_{id(df)}")

    if search_term and search_columns:
        # Simple string containment search
        mask = (
            df[search_columns]
            .apply(lambda x: x.astype(str).str.contains(search_term, case=False, na=False))
            .any(axis=1)
        )
        filtered_df = df[mask]
    else:
        filtered_df = df

    st.caption(f"表示件数: {len(filtered_df)} / {len(df)}")
    st.dataframe(filtered_df, use_container_width=True)


def confirmation_dialog(message: str, confirm_text: str = "実行", cancel_text: str = "キャンセル") -> bool:
    """Shows a confirmation UI mechanism (simplified for Streamlit flow)."""
    st.warning(message)
    col1, col2 = st.columns(2)
    with col1:
        if st.button(confirm_text, type="primary", use_container_width=True):
            return True
    with col2:
        if st.button(cancel_text, use_container_width=True):
            return False
    return False


def toast_notification(message: str, icon: str = "ℹ️"):
    """Shows a toast notification."""
    st.toast(message, icon=icon)


def skeleton_loader(num_rows: int = 3):
    """Visual placeholder for loading content."""
    for _ in range(num_rows):
        st.markdown(
            """
        <div style='
            background: linear-gradient(90deg, #333 25%, #444 50%, #333 75%);
            background-size: 200% 100%;
            animation: loading 1.5s infinite;
            height: 20px;
            margin: 10px 0;
            border-radius: 4px;
            opacity: 0.7;
        '></div>
        <style>
            @keyframes loading {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
        </style>
        """,
            unsafe_allow_html=True,
        )


def step_progress(steps: List[str], current_step: int):
    """Visual progress bar with labeled steps."""
    cols = st.columns(len(steps))
    for i, (col, step) in enumerate(zip(cols, steps)):
        with col:
            if i < current_step:
                st.markdown(f"✅ **{step}**")
                st.progress(1.0)
            elif i == current_step:
                st.markdown(f"🔄 **{step}**")
                st.progress(0.5)
            else:
                st.markdown(f"⚪ {step}")
                st.progress(0.0)


class FormValidator:
    """Simple validator logic for UI forms."""

    @staticmethod
    def validate_ticker(ticker: str) -> Tuple[bool, str]:
        if not ticker:
            return False, "銘柄コードを入力してください"
        if len(ticker) < 2:
            return False, "銘柄コードが短すぎます"
        return True, ""

    @staticmethod
    def validate_number(value: Any, min_val: float = None, max_val: float = None) -> Tuple[bool, str]:
        try:
            num = float(value)
            if min_val is not None and num < min_val:
                return False, f"値は {min_val} 以上である必要があります"
            if max_val is not None and num > max_val:
                return False, f"値は {max_val} 以下である必要があります"
            return True, ""
        except ValueError:
            return False, "数値を入力してください"
