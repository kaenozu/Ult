"""
Tax Report Generator - 確定申告書生成
e-Tax対応フォーマット、年間取引報告書、損益計算書
"""

import io
import logging
from datetime import datetime
from typing import Dict

import pandas as pd
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


class TaxReportGenerator:
    """確定申告書生成クラス"""

    def __init__(self):
        # 日本語フォント登録
        try:
            pdfmetrics.registerFont(UnicodeCIDFont("HeiseiMin-W3"))
        except Exception as e:
            logging.getLogger(__name__).debug(f"Non-critical exception: {e}")

    def generate_annual_report(self, year: int, trades: pd.DataFrame, user_info: Dict) -> bytes:
        """
        年間取引報告書生成

        Args:
            year: 年度
            trades: 取引履歴
            user_info: ユーザー情報

        Returns:
            PDFバイト
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        elements = []
        styles = getSampleStyleSheet()

        # タイトル
        title_style = ParagraphStyle(
            "CustomTitle", parent=styles["Heading1"], fontSize=16, textColor=colors.HexColor("#2E86AB"), spaceAfter=30
        )

        elements.append(Paragraph(f"<b>{year}年 年間取引報告書</b>", title_style))
        elements.append(Spacer(1, 10 * mm))

        # ユーザー情報
        user_data = [
            ["氏名", user_info.get("name", "")],
            ["住所", user_info.get("address", "")],
            ["生年月日", user_info.get("birth_date", "")],
            ["作成日", datetime.now().strftime("%Y年%m月%d日")],
        ]

        user_table = Table(user_data, colWidths=[40 * mm, 120 * mm])
        user_table.setStyle(
            TableStyle(
                [
                    ("FONTNAME", (0, 0), (-1, -1), "HeiseiMin-W3"),
                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ("BACKGROUND", (0, 0), (0, -1), colors.lightgrey),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        elements.append(user_table)
        elements.append(Spacer(1, 10 * mm))

        # サマリー
        elements.append(Paragraph("<b>取引サマリー</b>", styles["Heading2"]))

        total_trades = len(trades)
        buy_trades = len(trades[trades["action"] == "BUY"])
        sell_trades = len(trades[trades["action"] == "SELL"])

        total_buy_amount = trades[trades["action"] == "BUY"]["amount"].sum()
        total_sell_amount = trades[trades["action"] == "SELL"]["amount"].sum()

        realized_pnl = trades["realized_pnl"].sum() if "realized_pnl" in trades.columns else 0

        summary_data = [
            ["項目", "値"],
            ["総取引数", f"{total_trades}件"],
            ["買付回数", f"{buy_trades}件"],
            ["売却回数", f"{sell_trades}件"],
            ["買付総額", f"¥{total_buy_amount:,.0f}"],
            ["売却総額", f"¥{total_sell_amount:,.0f}"],
            ["実現損益", f"¥{realized_pnl:,.0f}"],
        ]

        summary_table = Table(summary_data, colWidths=[60 * mm, 100 * mm])
        summary_table.setStyle(
            TableStyle(
                [
                    ("FONTNAME", (0, 0), (-1, -1), "HeiseiMin-W3"),
                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                    ("ALIGN", (1, 1), (1, -1), "RIGHT"),
                ]
            )
        )
        elements.append(summary_table)
        elements.append(Spacer(1, 10 * mm))

        # 取引明細（最大100件）
        elements.append(PageBreak())
        elements.append(Paragraph("<b>取引明細</b>", styles["Heading2"]))

        detail_trades = trades.head(100).copy()
        detail_trades["date"] = pd.to_datetime(detail_trades["timestamp"]).dt.strftime("%Y/%m/%d")

        detail_data = [["日付", "銘柄", "売買", "数量", "単価", "金額"]]

        for _, trade in detail_trades.iterrows():
            detail_data.append(
                [
                    trade["date"],
                    trade["ticker"],
                    trade["action"],
                    str(trade["quantity"]),
                    f"¥{trade['price']:,.0f}",
                    f"¥{trade['amount']:,.0f}",
                ]
            )

        detail_table = Table(detail_data, colWidths=[25 * mm, 25 * mm, 15 * mm, 20 * mm, 25 * mm, 30 * mm])
        detail_table.setStyle(
            TableStyle(
                [
                    ("FONTNAME", (0, 0), (-1, -1), "HeiseiMin-W3"),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                    ("ALIGN", (3, 1), (5, -1), "RIGHT"),
                ]
            )
        )
        elements.append(detail_table)

        # PDF生成
        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()

    def generate_etax_csv(self, year: int, trades: pd.DataFrame) -> str:
        """
        e-Tax用CSV生成

        Args:
            year: 年度
            trades: 取引履歴

        Returns:
            CSV文字列
        """
        # e-Tax形式に変換
        etax_data = []

        for _, trade in trades.iterrows():
            if trade["action"] == "SELL":
                # 売却のみe-Taxに記載
                etax_data.append(
                    {
                        "銘柄コード": trade["ticker"],
                        "銘柄名": trade.get("ticker_name", trade["ticker"]),
                        "売却日": pd.to_datetime(trade["timestamp"]).strftime("%Y/%m/%d"),
                        "売却数量": trade["quantity"],
                        "売却単価": trade["price"],
                        "売却金額": trade["amount"],
                        "取得単価": trade.get("entry_price", 0),
                        "取得金額": trade.get("entry_price", 0) * trade["quantity"],
                        "譲渡損益": trade.get("realized_pnl", 0),
                    }
                )

        df = pd.DataFrame(etax_data)

        # CSV出力
        csv_str = df.to_csv(index=False, encoding="shift_jis")
        return csv_str

    def generate_tax_summary(self, year: int, total_profit: float, tax_info: Dict) -> bytes:
        """
        税金サマリー生成

        Args:
            year: 年度
            total_profit: 総利益
            tax_info: 税金情報

        Returns:
            PDFバイト
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        elements = []
        styles = getSampleStyleSheet()

        # タイトル
        elements.append(Paragraph(f"<b>{year}年 税金サマリー</b>", styles["Title"]))
        elements.append(Spacer(1, 10 * mm))

        # 税金詳細
        tax_data = [
            ["項目", "金額"],
            ["譲渡所得", f"¥{total_profit:,.0f}"],
            ["所得税（15%）", f"¥{tax_info.get('income_tax', 0):,.0f}"],
            ["復興特別所得税（0.315%）", f"¥{tax_info.get('reconstruction_tax', 0):,.0f}"],
            ["住民税（5%）", f"¥{tax_info.get('resident_tax', 0):,.0f}"],
            ["合計税額", f"¥{tax_info.get('total_tax', 0):,.0f}"],
            ["税引後利益", f"¥{tax_info.get('net_profit', 0):,.0f}"],
            ["実効税率", f"{tax_info.get('effective_tax_rate', 0):.2%}"],
        ]

        tax_table = Table(tax_data, colWidths=[80 * mm, 80 * mm])
        tax_table.setStyle(
            TableStyle(
                [
                    ("FONTNAME", (0, 0), (-1, -1), "HeiseiMin-W3"),
                    ("FONTSIZE", (0, 0), (-1, -1), 12),
                    ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("BACKGROUND", (0, -2), (-1, -2), colors.lightblue),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                    ("ALIGN", (1, 1), (1, -1), "RIGHT"),
                ]
            )
        )
        elements.append(tax_table)

        # PDF生成
        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()


if __name__ == "__main__":
    # テスト
    generator = TaxReportGenerator()

    # サンプルデータ
    trades = pd.DataFrame(
        {
            "timestamp": pd.date_range("2025-01-01", periods=10, freq="D"),
            "ticker": ["7203.T"] * 10,
            "action": ["BUY", "SELL"] * 5,
            "quantity": [100] * 10,
            "price": [1500, 1550] * 5,
            "amount": [150000, 155000] * 5,
            "realized_pnl": [0, 5000] * 5,
        }
    )

    user_info = {"name": "山田太郎", "address": "東京都千代田区", "birth_date": "1990/01/01"}

    # 年間報告書生成
    pdf = generator.generate_annual_report(2025, trades, user_info)
    print(f"年間報告書生成: {len(pdf)} bytes")

    # e-Tax CSV
    csv = generator.generate_etax_csv(2025, trades)
    print(f"e-Tax CSV生成: {len(csv)} bytes")
