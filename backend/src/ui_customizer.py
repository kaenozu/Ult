"""
UI Customizer - カスタマイズ可能なダッシュボード
ユーザー設定の保存・読み込み、ショートカットキー対応
"""

import json
import logging
import os
from typing import Dict, List

import streamlit as st


class UICustomizer:
    """UI カスタマイザー"""

    def __init__(self, config_path: str = "ui_config.json"):
        self.config_path = config_path
        self.config = self.load_config()

    def load_config(self) -> Dict:
        """設定読み込み"""
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except BaseException:
                pass

        # デフォルト設定
        return {
            "theme": "light",
            "dashboard_layout": "default",
            "visible_tabs": [
                "ダッシュボード",
                "フルオート",
                "市場スキャン",
                "リスク管理",
                "AI分析",
            ],
            "shortcuts_enabled": True,
            "auto_refresh": False,
            "refresh_interval": 60,
        }

    def save_config(self):
        """設定保存"""
        with open(self.config_path, "w", encoding="utf-8") as f:
            json.dump(self.config, f, indent=2, ensure_ascii=False)

    def render_customization_panel(self):
        """カスタマイズパネル表示"""
        st.sidebar.markdown("---")
        st.sidebar.subheader("⚙️ UI設定")

        # テーマ選択
        theme = st.sidebar.selectbox(
            "テーマ",
            ["light", "dark"],
            index=0 if self.config.get("theme") == "light" else 1,
        )

        if theme != self.config.get("theme"):
            self.config["theme"] = theme
            self.save_config()
            st.sidebar.success("テーマを変更しました")
            st.rerun()

        # 自動更新
        auto_refresh = st.sidebar.checkbox("自動更新", value=self.config.get("auto_refresh", False))

        if auto_refresh != self.config.get("auto_refresh"):
            self.config["auto_refresh"] = auto_refresh
            self.save_config()

        if auto_refresh:
            refresh_interval = st.sidebar.slider(
                "更新間隔（秒）",
                min_value=10,
                max_value=300,
                value=self.config.get("refresh_interval", 60),
                step=10,
            )

            if refresh_interval != self.config.get("refresh_interval"):
                self.config["refresh_interval"] = refresh_interval
                self.save_config()

        # ショートカットキー
        shortcuts_enabled = st.sidebar.checkbox("ショートカットキー", value=self.config.get("shortcuts_enabled", True))

        if shortcuts_enabled != self.config.get("shortcuts_enabled"):
            self.config["shortcuts_enabled"] = shortcuts_enabled
            self.save_config()

        if shortcuts_enabled:
            with st.sidebar.expander("ショートカット一覧"):
                st.markdown(
                    """
                - **Ctrl+D**: ダッシュボード
                - **Ctrl+S**: 市場スキャン
                - **Ctrl+R**: リスク管理
                - **Ctrl+A**: AI分析
                - **Ctrl+F**: フルオート
                - **Ctrl+E**: エクスポート
                """
                )

    def apply_shortcuts(self):
        """ショートカットキー適用"""
        if not self.config.get("shortcuts_enabled", True):
            return

        # JavaScriptでショートカットキーを実装
        shortcuts_js = """
        <script>
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey) {
                switch(e.key) {
                    case 'd':
                        e.preventDefault();
                        // ダッシュボードタブに切り替え
                        clickTab(0);
                        break;
                    case 's':
                        e.preventDefault();
                        // 市場スキャンタブに切り替え
                        clickTab(3);
                        break;
                    case 'r':
                        e.preventDefault();
                        // リスク管理タブに切り替え
                        clickTab(4);
                        break;
                    case 'a':
                        e.preventDefault();
                        // AI分析タブに切り替え
                        clickTab(5);
                        break;
                    case 'f':
                        e.preventDefault();
                        // フルオートタブに切り替え
                        clickTab(1);
                        break;
                }
            }
        });

        function clickTab(index) {
            const tabs = document.querySelectorAll('[data-baseweb="tab"]');
            if (tabs[index]) {
                tabs[index].click();
            }
        }
        </script>
        """

        st.components.v1.html(shortcuts_js, height=0)

    def apply_auto_refresh(self):
        """自動更新適用"""
        if self.config.get("auto_refresh", False):
            import time

            # セッションステートで最終更新時刻を管理
            if "last_refresh" not in st.session_state:
                st.session_state.last_refresh = time.time()

            current_time = time.time()
            interval = self.config.get("refresh_interval", 60)

            if current_time - st.session_state.last_refresh > interval:
                st.session_state.last_refresh = current_time
                st.rerun()

    def get_visible_tabs(self) -> List[str]:
        """表示タブ取得"""
        return self.config.get("visible_tabs", [])

    def set_visible_tabs(self, tabs: List[str]):
        """表示タブ設定"""
        self.config["visible_tabs"] = tabs
        self.save_config()


def render_dashboard_customizer():
    """ダッシュボードカスタマイザー表示"""
    st.subheader("📊 ダッシュボードカスタマイズ")

    customizer = UICustomizer()

    # レイアウト選択
    layout = st.selectbox("レイアウト", ["default", "compact", "detailed"], index=0)

    if layout != customizer.config.get("dashboard_layout"):
        customizer.config["dashboard_layout"] = layout
        customizer.save_config()
        st.success("レイアウトを変更しました")
        st.rerun()

    # 表示タブ選択
    all_tabs = [
        "ダッシュボード",
        "フルオート",
        "リアルタイム監視",
        "市場スキャン",
        "リスク管理",
        "AIレポート",
        "AIチャット",
        "自動化",
        "高度分析",
        "監視",
        "ポートフォリオ",
        "ペーパートレード",
        "詳細分析",
        "過去検証",
        "パフォーマンス分析",
    ]

    visible_tabs = st.multiselect("表示タブ", all_tabs, default=customizer.get_visible_tabs())

    if visible_tabs != customizer.get_visible_tabs():
        customizer.set_visible_tabs(visible_tabs)
        st.success("表示タブを更新しました")
        st.rerun()


if __name__ == "__main__":
    # テスト
    customizer = UICustomizer()
    print(f"Current config: {customizer.config}")
