"""
UI Export - エクスポート機能のUI
"""

from datetime import datetime

import pandas as pd
import streamlit as st

from src.export_manager import ExportManager
from src.paper_trader import PaperTrader


def render_export_tab():
    """エクスポートタブ表示"""
    st.header("📤 データエクスポート")
    st.write("取引データやレポートをエクスポートします。")

    manager = ExportManager()
    pt = PaperTrader()

    # エクスポート対象選択
    export_type = st.selectbox(
        "エクスポート対象",
        ["ポートフォリオレポート", "取引履歴", "保有ポジション", "残高情報"],
    )

    # フォーマット選択
    format_type = st.selectbox("フォーマット", ["PDF", "Excel", "CSV", "JSON"])

    if st.button("エクスポート", type="primary", use_container_width=True):
        with st.spinner("エクスポート中..."):
            try:
                if export_type == "ポートフォリオレポート":
                    # ポートフォリオレポート
                    balance = pt.get_current_balance()
                    positions = pt.get_positions()
                    history = pt.get_trade_history()

                    data = manager.export_portfolio_report(balance, positions, history, format=format_type)

                    filename = f"portfolio_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

                elif export_type == "取引履歴":
                    # 取引履歴
                    history = pt.get_trade_history()

                    if format_type == "CSV":
                        data = manager.export_to_csv(history, "trade_history.csv")
                        filename = "trade_history"
                    elif format_type == "Excel":
                        data = manager.export_to_excel({"取引履歴": history}, "trade_history.xlsx")
                        filename = "trade_history"
                    elif format_type == "PDF":
                        data = manager.export_to_pdf(history, "取引履歴", "trade_history.pdf")
                        filename = "trade_history"
                    else:  # JSON
                        data = manager.export_to_json(history, "trade_history.json")
                        filename = "trade_history"

                elif export_type == "保有ポジション":
                    # 保有ポジション
                    positions = pt.get_positions()

                    if format_type == "CSV":
                        data = manager.export_to_csv(positions, "positions.csv")
                        filename = "positions"
                    elif format_type == "Excel":
                        data = manager.export_to_excel({"ポジション": positions}, "positions.xlsx")
                        filename = "positions"
                    elif format_type == "PDF":
                        data = manager.export_to_pdf(positions, "保有ポジション", "positions.pdf")
                        filename = "positions"
                    else:  # JSON
                        data = manager.export_to_json(positions, "positions.json")
                        filename = "positions"

                else:  # 残高情報
                    # 残高情報
                    balance = pt.get_current_balance()
                    balance_df = pd.DataFrame([balance])

                    if format_type == "CSV":
                        data = manager.export_to_csv(balance_df, "balance.csv")
                        filename = "balance"
                    elif format_type == "Excel":
                        data = manager.export_to_excel({"残高": balance_df}, "balance.xlsx")
                        filename = "balance"
                    elif format_type == "PDF":
                        data = manager.export_to_pdf(balance_df, "残高情報", "balance.pdf")
                        filename = "balance"
                    else:  # JSON
                        data = manager.export_to_json(balance_df, "balance.json")
                        filename = "balance"

                # ダウンロードボタン
                ext_map = {"PDF": "pdf", "Excel": "xlsx", "CSV": "csv", "JSON": "json"}

                mime_map = {
                    "PDF": "application/pdf",
                    "Excel": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "CSV": "text/csv",
                    "JSON": "application/json",
                }

                st.download_button(
                    label=f"📥 {filename}.{ext_map[format_type]} をダウンロード",
                    data=data,
                    file_name=f"{filename}.{ext_map[format_type]}",
                    mime=mime_map[format_type],
                    use_container_width=True,
                )

                st.success("エクスポート完了！")

            except Exception as e:
                st.error(f"エクスポートエラー: {e}")


def render_export_quick_actions():
    """クイックエクスポートアクション"""
    st.sidebar.markdown("---")
    st.sidebar.subheader("📤 クイックエクスポート")

    manager = ExportManager()
    pt = PaperTrader()

    if st.sidebar.button("📊 ポートフォリオPDF"):
        balance = pt.get_current_balance()
        positions = pt.get_positions()
        history = pt.get_trade_history()

        data = manager.export_portfolio_report(balance, positions, history, format="PDF")

        st.sidebar.download_button(
            label="ダウンロード",
            data=data,
            file_name=f"portfolio_{datetime.now().strftime('%Y%m%d')}.pdf",
            mime="application/pdf",
        )

    if st.sidebar.button("📈 取引履歴CSV"):
        history = pt.get_trade_history()
        data = manager.export_to_csv(history, "history.csv")

        st.sidebar.download_button(
            label="ダウンロード",
            data=data,
            file_name=f"history_{datetime.now().strftime('%Y%m%d')}.csv",
            mime="text/csv",
        )


if __name__ == "__main__":
    render_export_tab()
