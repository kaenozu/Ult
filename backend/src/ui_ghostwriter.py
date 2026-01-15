"""
Ghostwriter UI Module
Displays automatically generated investment reports for the user.
"""

import logging
from pathlib import Path
from typing import List

import streamlit as st

from src.ghostwriter import Ghostwriter

logger = logging.getLogger(__name__)


class GhostwriterUI:
    """
    UI component for the Ghostwriter reporting system.
    """

    REPORT_DIR = Path("reports")

    def __init__(self):
        if not self.REPORT_DIR.exists():
            self.REPORT_DIR.mkdir(parents=True, exist_ok=True)

    def render(self):
        """Main render method for the reports tab."""
        st.header("📰 The Ghostwriter Reports")
        st.caption("AIヘッジファンドマネージャーによる週次運用報告書")

        files = self._get_report_files()

        if not files:
            self._render_empty_state()
            return

        # Layout: 1/4 list, 3/4 content
        col_list, col_content = st.columns([1, 3])

        # State management
        if "selected_report" not in st.session_state:
            st.session_state.selected_report = str(files[0])

        with col_list:
            self._render_sidebar(files)

        with col_content:
            self._render_content()

    def _get_report_files(self) -> List[Path]:
        """Returns list of markdown reports sorted by creation time."""
        files = list(self.REPORT_DIR.glob("*.md"))
        # Sort by mtime descending
        files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
        return files

    def _render_empty_state(self):
        """Displays UI when no reports exist."""
        st.info("📭 まだレポートはありません。")
        if st.button("📝 今すぐレポートを生成する (Manual Trigger)"):
            self._trigger_generation()

    def _trigger_generation(self):
        """Triggers the Ghostwriter logic and refreshes the page."""
        with st.spinner("AIがレポートを執筆中..."):
            try:
                gw = Ghostwriter()
                gw.generate_weekly_report()
                st.success("✅ 新しいレポートが作成されました！")
                st.experimental_rerun()
            except Exception as e:
                st.error(f"生成に失敗しました: {e}")

    def _render_sidebar(self, files: List[Path]):
        """Renders the back number list."""
        st.markdown("### 📚 バックナンバー")

        for file in files:
            # Parse display name: weekly_report_20231201_120000.md -> 2023/12/01
            display_date = self._parse_file_date(file.stem)

            is_selected = str(file) == st.session_state.selected_report
            label = f"👉 {display_date}" if is_selected else f"📄 {display_date}"

            if st.button(
                label, key=str(file), use_container_width=True, type="primary" if is_selected else "secondary"
            ):
                st.session_state.selected_report = str(file)
                st.experimental_rerun()

    def _parse_file_date(self, stem: str) -> str:
        """Extracts date from filename stem."""
        parts = stem.split("_")
        if len(parts) >= 3:
            d = parts[2]  # YYYYMMDD
            return f"{d[:4]}/{d[4:6]}/{d[6:]}"
        return stem

    def _render_content(self):
        """Renders the selected report content."""
        target = Path(st.session_state.selected_report)

        if not target.exists():
            st.error("ファイルが見つかりません。")
            return

        try:
            content = target.read_text(encoding="utf-8")

            # Premium Styling for the report container
            st.markdown(
                f"""
                <div style="
                    background: rgba(255, 255, 255, 0.05);
                    padding: 2.5rem;
                    border-radius: 16px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
                    color: #f8fafc;
                ">
                    {st.markdown(content)}
                </div>
                """,
                unsafe_allow_html=True,
            )
            # Since st.markdown(content) inside f-string actually renders and returns None,
            # it's better to just render it standardly or use a container with background styling.

            # Simplified but clean approach:
            with st.container(border=True):
                st.markdown(content)

            st.divider()
            st.caption("※ この運用報告書は、AIヘッジファンド運用システム（AGStock）によって自動生成されています。")

            # Export option
            st.download_button("📥 Markdownとしてダウンロード", content, file_name=target.name)

        except Exception as e:
            st.error(f"レポートの読み込みに失敗しました: {e}")


def render_reports_tab():
    """Entry function for the dashboard tab."""
    ui = GhostwriterUI()
    ui.render()
