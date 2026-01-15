from typing import List, Callable, Tuple, Optional
import streamlit as st


# 各タブのレンダリング関数を遅延インポートするためのラッパー
def render_main_tab(sidebar_config, strategies):
    """メイン画面：シンプル売買サポート"""
    from src.ui.simple_trading_view import render_simple_trading_view
    render_simple_trading_view(strategies)


def render_analysis_tab():
    """詳細分析：バックテストと予測精度"""
    from src.prediction_dashboard import create_prediction_analysis_dashboard
    create_prediction_analysis_dashboard()


def render_settings_tab():
    """設定画面"""
    from src.ui.settings import render_settings
    render_settings()


class DashboardRouter:
    """
    ダッシュボードのタブ構成とルーティングを管理するクラス
    シンプルな3タブ構成に簡素化
    """

    @staticmethod
    def get_tabs(signal_count: int = 0) -> List[Tuple[str, Callable]]:
        """
        現在のコンテキストに基づいて表示すべきタブのリスト（タイトル、レンダラー）を返す
        """
        # タブ定義: (表示名, レンダリング関数)
        tabs = [
            ("🏠 メイン", render_main_tab),
            ("📊 詳細分析", render_analysis_tab),
            ("⚙️ 設定", render_settings_tab),
        ]

        return tabs
