"""
Sidebar UI Module
Handles the rendering of the sidebar, including settings and filters.
"""

import json
import datetime
import streamlit as st

from src.constants import MARKETS, TICKER_NAMES
from src.schemas import load_config as load_config_schema
from src.services.defense import activate_defense, deactivate_defense, defense_status

from src import demo_data  # noqa: F401  # imported for side-effects if needed


def render_sidebar():
    """
    Renders a descriptive sidebar for Hyper-Autonomous Mode.
    No manual settings - everything is driven by AI logic.
    User requested to remove sidebar UI (2026-01-07).
    """
    # ユーザー要望によりサイドバーUIを空にする
    # st.empty()
    
    # 互換性のためのデフォルト値を返す
    if "use_demo_data" not in st.session_state:
        st.session_state["use_demo_data"] = False

    return {
        "selected_market": "Japan",
        "ticker_group": "Japan 主要銘柄",
        "custom_tickers": [],
        "period": "2y",
        "use_fractional_shares": False,
        "trading_unit": 100,
        "allow_short": False,
        "position_size": 1.0,
        "enable_fund_filter": False,
        "max_per": 15.0,
        "max_pbr": 1.5,
        "min_roe": 8.0,
    }
