"""
レスポンシブUI改善コンポーネント
モバイル対応を考慮したStreamlit UI
"""

import streamlit as st
from typing import Dict, List, Optional, Any
import plotly.graph_objects as go
import plotly.express as px
import pandas as pd
from datetime import datetime


class ResponsiveUI:
    """レスポンシブUI管理クラス"""

    def __init__(self):
        self.screen_width = self.get_screen_width()
        self.is_mobile = self.screen_width < 768
        self.is_tablet = self.screen_width < 1024

    def get_screen_width(self) -> int:
        """スクリーン幅を取得"""
        try:
            return st.get_query_params().get("width", [1024])[0]
        except:
            return 1024

    def responsive_columns(self, col_configs: List[Dict]) -> Any:
        """
        画面サイズに応じたカラムを生成

        Args:
            col_configs: カラム設定リスト

        Returns:
            Streamlitカラムオブジェクト
        """
        if self.is_mobile:
            # モバイルでは縦に1列
            return st.columns([1])
        elif self.is_tablet:
            # タブレットでは2列
            return st.columns([1, 1])
        else:
            # デスクトップでは指定カラム数
            widths = [conf.get("width", 1) for conf in col_configs]
            return st.columns(widths)

    def responsive_chart(self, fig: go.Figure, height: int = None) -> go.Figure:
        """
        レスポンシブチャートを生成

        Args:
            fig: Plotlyチャート
            height: 高さ

        Returns:
            レスポンシブチャート
        """
        # 画面サイズに応じて高さを調整
        if height is None:
            height = 300 if self.is_mobile else 500 if self.is_tablet else 600

        # モバイルではフォントサイズを調整
        if self.is_mobile:
            fig.update_layout(height=height, font=dict(size=10), margin=dict(l=20, r=20, t=20, b=20))
        else:
            fig.update_layout(height=height, margin=dict(l=40, r=40, t=20, b=20))

        return fig

    def mobile_friendly_button(self, label: str, key: str, **kwargs) -> Any:
        """
        モバイルフレンドリーボタンを生成

        Args:
            label: ボタンのラベル
            key: ボタンのキー
            **kwargs: 追加パラメータ

        Returns:
            Streamlitボタン
        """
        button_params = {
            "use_container_width": True,
            "type": "secondary" if self.is_mobile else "primary",
        }

        if self.is_mobile:
            # モバイルでは大きめのボタン
            button_params.update({"help": label, "disabled": False})

        button_params.update(kwargs)
        return st.button(label, key=key, **button_params)

    def collapsible_section(self, title: str, content_func: callable, default_expanded: bool = False) -> None:
        """
        画面サイズに応じた折りたたみセクションを生成

        Args:
            title: セクションタイトル
            content_func: コンテンツ表示関数
            default_expanded: デフォルト展開状態
        """
        # モバイルでは常時展開
        expanded = default_expanded if not self.is_mobile else True

        with st.expander(title, expanded=expanded):
            content_func()

    def responsive_metrics(self, metrics: Dict[str, Any], layout: str = "horizontal") -> None:
        """
        画面サイズに応じたメトリクス表示

        Args:
            metrics: メトリクス辞書
            layout: レイアウト方向
        """
        if self.is_mobile:
            # モバイルでは縦に配置
            for key, value in metrics.items():
                st.metric(key, value)
        else:
            # デスクトップでは指定レイアウト
            if layout == "horizontal":
                cols = st.columns(len(metrics))
                for i, (key, value) in enumerate(metrics.items()):
                    with cols[i]:
                        st.metric(key, value)
            else:
                # 縦配置
                for key, value in metrics.items():
                    st.metric(key, value)

    def compact_table(self, df: pd.DataFrame, height: int = None) -> None:
        """
        コンパクトテーブル表示

        Args:
            df: 表示データフレーム
            height: 高さ
        """
        if height is None:
            height = 200 if self.is_mobile else 400

        # モバイルではコンパクトな表示
        if self.is_mobile:
            st.dataframe(df, height=height, use_container_width=True, hide_index=True)
        else:
            st.dataframe(df, height=height, use_container_width=True)

    def navigation_menu(self) -> str:
        """
        ナビゲーションメニューを生成

        Returns:
            選択されたページ
        """
        if self.is_mobile:
            # モバイルではセレクトボックス
            return st.selectbox(
                "メニュー",
                ["ホーム", "ポートフォリオ", "取引", "分析", "設定"],
                key="mobile_nav",
            )
        else:
            # デスクトップではサイドバー
            with st.sidebar:
                return st.radio(
                    "メニュー",
                    ["ホーム", "ポートフォリオ", "取引", "分析", "設定"],
                    key="desktop_nav",
                )

    def adaptive_form(self, fields: List[Dict]) -> Dict[str, Any]:
        """
        適応型フォームを生成

        Args:
            fields: フィールド設定リスト

        Returns:
            入力値辞書
        """
        form_data = {}

        for field in fields:
            field_type = field.get("type", "text_input")
            field_name = field.get("name", "")
            field_label = field.get("label", "")

            if self.is_mobile:
                # モバイルでは大きな入力フィールド
                if field_type == "text_input":
                    value = st.text_input(
                        field_label,
                        key=f"mobile_{field_name}",
                        help=field.get("help", ""),
                    )
                elif field_type == "number_input":
                    value = st.number_input(
                        field_label,
                        key=f"mobile_{field_name}",
                        help=field.get("help", ""),
                    )
                elif field_type == "selectbox":
                    value = st.selectbox(
                        field_label,
                        field.get("options", []),
                        key=f"mobile_{field_name}",
                    )
                elif field_type == "date_input":
                    value = st.date_input(field_label, key=f"mobile_{field_name}")
                else:
                    value = st.text_input(field_label, key=f"mobile_{field_name}")
            else:
                # デスクトップでは標準サイズ
                if field_type == "text_input":
                    value = st.text_input(
                        field_label,
                        key=f"desktop_{field_name}",
                        help=field.get("help", ""),
                    )
                elif field_type == "number_input":
                    value = st.number_input(
                        field_label,
                        key=f"desktop_{field_name}",
                        help=field.get("help", ""),
                    )
                elif field_type == "selectbox":
                    value = st.selectbox(
                        field_label,
                        field.get("options", []),
                        key=f"desktop_{field_name}",
                    )
                elif field_type == "date_input":
                    value = st.date_input(field_label, key=f"desktop_{field_name}")
                else:
                    value = st.text_input(field_label, key=f"desktop_{field_name}")

            form_data[field_name] = value

        return form_data


class MobileOptimizedComponents:
    """モバイル最適化コンポーネント"""

    @staticmethod
    def create_touch_friendly_chart(data: pd.DataFrame, chart_type: str = "line") -> go.Figure:
        """
        タッチ操作に最適化されたチャートを生成

        Args:
            data: 表示データ
            chart_type: チャートタイプ

        Returns:
            最適化されたチャート
        """
        if chart_type == "line":
            fig = go.Figure(
                data=[
                    go.Scatter(
                        x=data.index,
                        y=data["value"],
                        mode="lines+markers",
                        marker=dict(size=6),  # タッチ操作しやすいマーカーサイズ
                        line=dict(width=2),
                    )
                ]
            )
        elif chart_type == "candlestick":
            fig = go.Figure(
                data=go.Candlestick(
                    x=data.index,
                    open=data["open"],
                    high=data["high"],
                    low=data["low"],
                    close=data["close"],
                )
            )
        elif chart_type == "bar":
            fig = go.Figure(data=[go.Bar(x=data.index, y=data["value"])])
        else:
            fig = go.Figure(data=[go.Scatter(x=data.index, y=data["value"])])

        # モバイル最適化
        fig.update_layout(
            height=400,
            margin=dict(l=20, r=20, t=20, b=20),
            xaxis=dict(
                fixedrange=True,  # タッチ操作でズームを制御
                rangeselector=dict(button=dict(count=3), xaxis=dict(rangemode="auto", range=[0.1, 0.9])),
            ),
            yaxis=dict(fixedrange=True),
            hovermode="x unified",
            dragmode="zoom",  # タッチズームを有効化
        )

        return fig

    @staticmethod
    def create_swipe_actions(actions: List[Dict]) -> None:
        """
        スワイプ操作を生成（モバイル専用）

        Args:
            actions: アクションリスト
        """
        st.markdown(
            """
        <style>
        .swipe-container {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            white-space: nowrap;
        }
        .swipe-item {
            display: inline-block;
            margin: 0 5px;
            padding: 10px;
            background: #f0f0f0;
            border-radius: 8px;
            text-align: center;
            min-width: 80px;
        }
        </style>
        """,
            unsafe_allow_html=True,
        )

        # スワイプ可能なアクションボタン
        cols = st.columns(len(actions))
        for i, action in enumerate(actions):
            with cols[i]:
                st.markdown(
                    f"""
                <div class="swipe-container">
                    <div class="swipe-item">
                        {action.get("icon", "📱")}<br>
                        <small>{action.get("label", "")}</small>
                    </div>
                </div>
                """,
                    unsafe_allow_html=True,
                )

                # 非表示のアクションハンドラ
                if action.get("hidden_action"):
                    st.session_state[f"swipe_action_{i}"] = action["hidden_action"]

    @staticmethod
    def create_bottom_navigation(current_page: str) -> None:
        """
        ボトムナビゲーションを生成

        Args:
            current_page: 現在のページ
        """
        nav_items = [
            {"icon": "🏠", "label": "ホーム", "page": "home"},
            {"icon": "💰", "label": "ポートフォリオ", "page": "portfolio"},
            {"icon": "📈", "label": "取引", "page": "trade"},
            {"icon": "📊", "label": "分析", "page": "analysis"},
            {"icon": "⚙️", "label": "設定", "page": "settings"},
        ]

        st.markdown(
            """
        <style>
        .bottom-nav {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: #ffffff;
            border-top: 1px solid #e0e0e0;
            padding: 10px 0;
            display: flex;
            justify-content: space-around;
            z-index: 1000;
        }
        .nav-item {
            text-align: center;
            color: #666;
            text-decoration: none;
            padding: 5px 10px;
        }
        .nav-item.active {
            color: #667eea;
            font-weight: bold;
        }
        </style>
        """,
            unsafe_allow_html=True,
        )

        cols = st.columns(len(nav_items))
        for i, item in enumerate(nav_items):
            with cols[i]:
                if item["page"] == current_page:
                    st.markdown(
                        f"""
                    <div class="bottom-nav">
                        <a href="#{item["page"]}" class="nav-item active">
                            {item["icon"]}<br>
                            <small>{item["label"]}</small>
                        </a>
                    </div>
                    """,
                        unsafe_allow_html=True,
                    )
                else:
                    st.markdown(
                        f"""
                    <div class="bottom-nav">
                        <a href="#{item["page"]}" class="nav-item">
                            {item["icon"]}<br>
                            <small>{item["label"]}</small>
                        </a>
                    </div>
                    """,
                        unsafe_allow_html=True,
                    )

    @staticmethod
    def create_pull_to_refresh() -> None:
        """
        プルツーリフレッシュ機能を実装
        """
        st.markdown(
            """
        <style>
        .refresh-container {
            height: 60px;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(to bottom, transparent, #f8f9fa);
        }
        .refresh-indicator {
            width: 40px;
            height: 40px;
            border: 3px solid #667eea;
            border-top: none;
            border-right: none;
            border-left: none;
            border-radius: 50%;
            animation: rotate 1s linear infinite;
        }
        @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        </style>
        
        <div class="refresh-container">
            <div class="refresh-indicator"></div>
        </div>
        """,
            unsafe_allow_html=True,
        )


# グローバルインスタンス
responsive_ui = ResponsiveUI()
mobile_components = MobileOptimizedComponents()


def create_responsive_layout():
    """レスポンシブレイアウトを作成"""

    # デバイス検出
    is_mobile = responsive_ui.screen_width < 768

    # モバイルの場合、専用CSSを適用
    if is_mobile:
        st.markdown(
            """
        <style>
        /* モバイル最適化CSS */
        .stApp {
            padding-top: 0 !important;
        }
        
        .streamlit-container {
            padding-top: 0 !important;
        }
        
        .element-container {
            margin-bottom: 1rem;
        }
        
        .block-container {
            padding-top: 1rem;
            padding-bottom: 1rem;
        }
        
        /* ボタンの最適化 */
        .stButton button {
            min-height: 44px;
            font-size: 16px;
            margin: 0.25rem 0;
        }
        
        /* 入力フィールドの最適化 */
        .stTextInput input, .stNumberInput input {
            min-height: 44px;
            font-size: 16px;
        }
        
        /* チャートの最適化 */
        .js-plotly-plot {
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
        }
        
        /* スクロールの最適化 */
        .scrollbar {
            -webkit-overflow-scrolling: touch;
        }
        
        /* タップ領域を確保 */
        .element-container:after {
            content: '';
            height: 20px;
            display: block;
        }
        </style>
        """,
            unsafe_allow_html=True,
        )

        # ボトムナビゲーションを追加
        mobile_components.create_bottom_navigation("home")


def test_responsive_ui():
    """レスポンシブUIのテスト"""
    st.title("📱 レスポンシブUIテスト")

    # 現在の画面サイズを表示
    st.metric("画面幅", f"{responsive_ui.screen_width}px")
    st.write(f"モバイル: {responsive_ui.is_mobile}")
    st.write(f"タブレット: {responsive_ui.is_tablet}")

    st.markdown("---")

    # レスポンシブカラムテスト
    col_configs = [{"width": 1}, {"width": 2}, {"width": 1}]
    cols = responsive_ui.responsive_columns(col_configs)

    with cols[0]:
        st.write("左カラム")
        st.button("モバイル対応ボタン")

    with cols[1]:
        st.write("中央カラム")
        st.slider("中央カラムスライダー", 0, 100, 50)

    with cols[2]:
        st.write("右カラム")
        st.text_input("モバイル対応入力")

    st.markdown("---")

    # レスポンシブチャートテスト
    test_data = pd.DataFrame(
        {
            "date": pd.date_range("2024-01-01", periods=10, freq="D"),
            "value": [100, 120, 115, 130, 125, 140, 135, 150, 145, 160],
        }
    )

    fig = mobile_components.create_touch_friendly_chart(test_data, "line")
    st.plotly_chart(fig, use_container_width=True)

    st.markdown("---")

    # 折りたたみセクションテスト
    responsive_ui.collapsible_section("詳細設定", lambda: st.text_input("詳細設定"))

    st.markdown("---")

    # モバイル最適化フォーム
    form_fields = [
        {"type": "text_input", "name": "ticker", "label": "銘柄コード"},
        {"type": "number_input", "name": "quantity", "label": "数量"},
        {
            "type": "selectbox",
            "name": "order_type",
            "label": "注文タイプ",
            "options": ["指値", "成行", "逆指値"],
        },
    ]

    form_data = responsive_ui.adaptive_form(form_fields)

    st.markdown("---")

    # スワイプアクション
    actions = [
        {"icon": "💰", "label": "買付", "hidden_action": "buy"},
        {"icon": "💸", "label": "売却", "hidden_action": "sell"},
        {"icon": "⏸", "label": "詳細", "hidden_action": "details"},
    ]

    mobile_components.create_swipe_actions(actions)


if __name__ == "__main__":
    create_responsive_layout()
    test_responsive_ui()
