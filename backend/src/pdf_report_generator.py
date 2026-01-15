"""
PDF Report Generator Module
Generates automated weekly/monthly performance reports with AI analysis.
"""

import os
import matplotlib
import pandas as pd

matplotlib.use("Agg")  # Non-interactive backend
import logging
from datetime import datetime, timedelta

import matplotlib.pyplot as plt

from src.ai_analyst import AIAnalyst
from src.constants import CRYPTO_PAIRS, FX_PAIRS, NIKKEI_225_TICKERS, SP500_TICKERS, STOXX50_TICKERS
from src import demo_data
from src.paper_trader import PaperTrader

# For PDF generation
try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, letter
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import inch
    from reportlab.platypus import Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False
    logging.warning("reportlab not installed. PDF generation disabled.")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PDFReportGenerator:
    def __init__(self):
        self.demo_mode = os.getenv("USE_DEMO_DATA", "").lower() in {"1", "true", "yes"}
        self.theme = os.getenv("REPORT_THEME", "light").lower()
        self.font_family = os.getenv("REPORT_FONT", "Meiryo")
        self.eq_color = "#2E86AB" if self.theme == "light" else "#4FC3F7"
        self.bg_color = "white" if self.theme == "light" else "#0e1117"
        self.grid_alpha = 0.3
        plt.rcParams["font.family"] = self.font_family
        self.pt = PaperTrader() if not self.demo_mode else None
        self.analyst = AIAnalyst()
        self.styles = getSampleStyleSheet() if PDF_AVAILABLE else None

    def _get_equity_curve(self) -> pd.DataFrame:
        """紙トレ口座の残高履歴からエクイティカーブを取得"""
        history = demo_data.generate_equity_history() if self.demo_mode else self.pt.get_equity_history()
        if history.empty:
            # データがない場合は初期資金で2点プロット
            today = datetime.now().date()
            return pd.DataFrame(
                {
                    "date": [today - timedelta(days=1), today],
                    "total_equity": [self.pt.initial_capital, self.pt.initial_capital],
                }
            )

        df = history.copy()
        if "date" in df.columns:
            df["date"] = pd.to_datetime(df["date"], errors="coerce")
        df = df.dropna(subset=["date"]).sort_values("date")

        if "total_equity" in df.columns:
            df["total_equity"] = df["total_equity"].fillna(df.get("cash", self.pt.initial_capital))
        else:
            df["total_equity"] = df.get("cash", self.pt.initial_capital)

        return df[["date", "total_equity"]]

    def _compute_trade_stats(self) -> dict:
        """勝率・月次損益・トップ/ワースト銘柄を計算"""
        history = demo_data.generate_trade_history() if self.demo_mode else self.pt.get_trade_history(limit=5000)
        if history.empty:
            return {"win_rate": 0.0, "monthly_pnl": 0.0, "top": None, "worst": None}

        if "timestamp" in history.columns and not pd.api.types.is_datetime64_any_dtype(history["timestamp"]):
            history["timestamp"] = pd.to_datetime(history["timestamp"], errors="coerce")
        history = history.dropna(subset=["timestamp"])

        win_rate = 0.0
        if "realized_pnl" in history.columns:
            wins = (history["realized_pnl"] > 0).sum()
            total = (history["realized_pnl"] != 0).sum()
            win_rate = wins / total if total > 0 else 0.0

        today = datetime.now().date()
        month_start = datetime(today.year, today.month, 1).date()
        monthly_pnl = 0.0
        if "timestamp" in history.columns:
            month_trades = history[history["timestamp"].dt.date >= month_start]
            if not month_trades.empty and "realized_pnl" in month_trades.columns:
                monthly_pnl = float(month_trades["realized_pnl"].sum())

        top = None
        worst = None
        if "realized_pnl" in history.columns and "ticker" in history.columns:
            ticker_pnl = history.groupby("ticker")["realized_pnl"].sum().sort_values(ascending=False)
            if not ticker_pnl.empty:
                top = (ticker_pnl.index[0], float(ticker_pnl.iloc[0]))
                worst = (ticker_pnl.index[-1], float(ticker_pnl.iloc[-1]))

        return {"win_rate": win_rate, "monthly_pnl": monthly_pnl, "top": top, "worst": worst}

    def _get_asset_allocation(self, positions: pd.DataFrame) -> dict:
        """地域別の簡易配分を計算（market_valueベース）"""
        alloc = {"Japan": 0.0, "US": 0.0, "Europe": 0.0, "Crypto": 0.0, "FX": 0.0, "Other": 0.0}
        if positions is None or positions.empty:
            return alloc

        for _, pos in positions.iterrows():
            ticker = str(pos.get("ticker", "")).upper()
            qty = float(pos.get("quantity", 0) or 0)
            price = float(pos.get("current_price", 0) or 0)
            value = float(pos.get("market_value", qty * price))

            if ticker in CRYPTO_PAIRS:
                alloc["Crypto"] += value
            elif ticker in FX_PAIRS:
                alloc["FX"] += value
            elif ticker in NIKKEI_225_TICKERS:
                alloc["Japan"] += value
            elif ticker in SP500_TICKERS:
                alloc["US"] += value
            elif ticker in STOXX50_TICKERS:
                alloc["Europe"] += value
            else:
                alloc["Other"] += value

        total = sum(alloc.values()) or 1.0
        return {k: v for k, v in alloc.items()}

    def _plot_asset_allocation(self, allocation: dict, output_path: str = "temp_allocation.png") -> Optional[str]:
        try:
            values = [v for v in allocation.values()]
            labels = [f"{k} ({v / sum(values) * 100:.1f}%)" if sum(values) else k for k, v in allocation.items()]
            fig, ax = plt.subplots(figsize=(6, 6))
            ax.pie(values, labels=labels, autopct="%1.1f%%", startangle=140)
            ax.set_title("資産配分 (推計)", fontsize=14, fontweight="bold")
            plt.tight_layout()
            plt.savefig(output_path, dpi=150, bbox_inches="tight")
            plt.close()
            return output_path
        except Exception as e:
            logger.error(f"Asset allocation plot failed: {e}")
            return None

    def generate_performance_chart(self, output_path: str = "temp_performance.png"):
        """Generate performance chart and save to file."""
        try:
            equity_df = self._get_equity_curve()
            if equity_df.empty:
                logger.warning("Equity history is empty; skipping chart generation.")
                return None

            if len(equity_df) == 1:
                # 1点のみの場合は前日データを挿入してグラフを安定させる
                single = equity_df.iloc[0]
                equity_df = pd.concat(
                    [
                        pd.DataFrame(
                            {"date": [single["date"] - pd.Timedelta(days=1)], "total_equity": [self.pt.initial_capital]}
                        ),
                        equity_df,
                    ],
                    ignore_index=True,
                )

            fig, ax = plt.subplots(figsize=(10, 6))

            dates = equity_df["date"]
            equity = equity_df["total_equity"]

            ax.plot(dates, equity, linewidth=2, color=self.eq_color)
            ax.fill_between(dates, equity, alpha=0.3, color=self.eq_color)
            ax.set_facecolor(self.bg_color)
            ax.figure.set_facecolor(self.bg_color)
            ax.grid(True, alpha=self.grid_alpha, color="#999999" if self.theme == "light" else "#444444")
            ax.set_title(
                "Portfolio Equity Curve",
                fontsize=14,
                fontweight="bold",
                color="#fafafa" if self.theme == "dark" else "black",
            )
            ax.set_xlabel("Date")
            ax.set_ylabel("Equity (¥)")
            ax.grid(True, alpha=0.3)
            plt.xticks(rotation=45)
            plt.tight_layout()

            plt.savefig(output_path, dpi=150, bbox_inches="tight")
            plt.close()

            return output_path
        except Exception as e:
            logger.error(f"Error generating chart: {e}")
            return None

    def generate_ai_analysis(self) -> str:
        """Generate AI analysis of performance."""
        if not self.analyst.enabled:
            return "AI analysis unavailable (API key not configured)"

        try:
            balance = self.pt.get_current_balance()
            positions = self.pt.get_positions()

            context = f"""
## Portfolio Status
- Total Equity: ¥{balance['total_equity']:,.0f}
- Cash: ¥{balance['cash']:,.0f}
- Positions: {len(positions)}

Please provide:
1. Performance assessment
2. Risk analysis
3. Improvement suggestions

Keep it concise (max 200 words).
"""

            analysis = self.analyst.generate_response(
                system_prompt="You are a professional portfolio analyst. Provide concise, actionable insights in Japanese.",
                user_prompt=context,
                temperature=0.7,
            )

            return analysis
        except Exception as e:
            logger.error(f"Error generating AI analysis: {e}")
            return f"AI analysis error: {str(e)}"

    def generate_weekly_report(
        self, output_path: str = "weekly_report.pdf", html_output_path: Optional[str] = None
    ) -> bool:
        """
        Generate weekly PDF report.

        Args:
            output_path: Path to save PDF

        Returns:
            True if successful
        """
        if not PDF_AVAILABLE:
            logger.error("reportlab not installed. Cannot generate PDF.")
            return False

        try:
            # Create PDF
            doc = SimpleDocTemplate(output_path, pagesize=A4)
            story = []

            # Title
            title_style = ParagraphStyle(
                "CustomTitle",
                parent=self.styles["Heading1"],
                fontSize=24,
                textColor=colors.HexColor("#2E86AB"),
                spaceAfter=30,
            )

            title = Paragraph(f"AGStock Weekly Report<br/>{datetime.now().strftime('%Y-%m-%d')}", title_style)
            story.append(title)
            story.append(Spacer(1, 0.2 * inch))

            # Portfolio Summary
            if self.demo_mode:
                positions = demo_data.generate_positions()
                equity_hist = demo_data.generate_equity_history()
                balance = {
                    "cash": float(positions["market_value"].sum() * 0.1),
                    "total_equity": float(positions["market_value"].sum() * 1.1),
                }
            else:
                positions = self.pt.get_positions()
                equity_hist = None
                balance = self.pt.get_current_balance()
            trade_stats = self._compute_trade_stats()
            allocation = self._get_asset_allocation(positions)

            summary_data = [
                ["Metric", "Value"],
                ["Total Equity", f"¥{balance['total_equity']:,.0f}"],
                ["Cash", f"¥{balance['cash']:,.0f}"],
                ["Positions", str(len(positions))],
                ["Initial Capital", f"¥{self.pt.initial_capital:,.0f}"],
                [
                    "Total Return",
                    f"{((balance['total_equity'] - self.pt.initial_capital) / self.pt.initial_capital):.1%}",
                ],
                ["Win Rate", f"{trade_stats['win_rate'] * 100:.1f}%"],
                ["Monthly PnL", f"¥{trade_stats['monthly_pnl']:,.0f}"],
            ]

            summary_table = Table(summary_data, colWidths=[3 * inch, 2 * inch])
            summary_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, 0), 14),
                        ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                        ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                        ("GRID", (0, 0), (-1, -1), 1, colors.black),
                    ]
                )
            )

            story.append(summary_table)
            story.append(Spacer(1, 0.3 * inch))

            # Equity stats (mean daily return, max drawdown)
            equity_df = equity_hist if equity_hist is not None else self._get_equity_curve()
            if not equity_df.empty and "total_equity" in equity_df.columns:
                eq = equity_df["total_equity"].astype(float)
                daily_returns = eq.pct_change().dropna()
                mean_ret = daily_returns.mean() * 100 if not daily_returns.empty else 0.0
                peak = eq.cummax()
                drawdown = (eq / peak - 1).min() * 100 if not eq.empty else 0.0
                stats_rows = [
                    ["指標", "値"],
                    ["平均日次リターン", f"{mean_ret:.2f}%"],
                    ["最大ドローダウン", f"{drawdown:.2f}%"],
                ]
                stats_table = Table(stats_rows, colWidths=[2.5 * inch, 2.5 * inch])
                stats_table.setStyle(
                    TableStyle(
                        [
                            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#ececec")),
                            ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
                            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                        ]
                    )
                )
                story.append(stats_table)
                story.append(Spacer(1, 0.3 * inch))

            # Top / Worst performers
            if trade_stats.get("top") or trade_stats.get("worst"):
                story.append(Paragraph("トップ / ワースト（実現損益）", self.styles["Heading2"]))
                story.append(Spacer(1, 0.1 * inch))
                top, worst = trade_stats.get("top"), trade_stats.get("worst")
                perf_rows = [["種別", "ティッカー", "損益"]]
                if top:
                    perf_rows.append(["トップ", top[0], f"¥{top[1]:,.0f}"])
                if worst:
                    perf_rows.append(["ワースト", worst[0], f"¥{worst[1]:,.0f}"])
                perf_table = Table(perf_rows, colWidths=[1.2 * inch, 2 * inch, 1.8 * inch])
                perf_table.setStyle(
                    TableStyle(
                        [
                            ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                            ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
                            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                            ("FONTSIZE", (0, 0), (-1, 0), 12),
                            ("GRID", (0, 0), (-1, -1), 1, colors.black),
                        ]
                    )
                )
                story.append(perf_table)
                story.append(Spacer(1, 0.3 * inch))

            # Asset Allocation Pie
            allocation_path = self._plot_asset_allocation(allocation)
            if allocation_path:
                story.append(Paragraph("資産配分", self.styles["Heading2"]))
                story.append(Spacer(1, 0.1 * inch))
                story.append(Image(allocation_path, width=4 * inch, height=4 * inch))
                story.append(Spacer(1, 0.3 * inch))

            # Performance Chart
            chart_path = self.generate_performance_chart()
            if chart_path:
                img = Image(chart_path, width=5 * inch, height=3 * inch)
                story.append(img)
                story.append(Spacer(1, 0.3 * inch))

            # AI Analysis
            story.append(Paragraph("AI Performance Analysis", self.styles["Heading2"]))
            story.append(Spacer(1, 0.1 * inch))

            ai_analysis = self.generate_ai_analysis()
            analysis_para = Paragraph(ai_analysis.replace("\n", "<br/>"), self.styles["BodyText"])
            story.append(analysis_para)

            # Build PDF
            doc.build(story)
            logger.info(f"Weekly report generated: {output_path}")

            if html_output_path:
                self._generate_html_report(
                    html_output_path, balance, trade_stats, allocation, chart_path, allocation_path, ai_analysis
                )
            return True

        except Exception as e:
            logger.error(f"Error generating PDF report: {e}")
            return False

    def _generate_html_report(
        self,
        output_path: str,
        balance: dict,
        trade_stats: dict,
        allocation: dict,
        chart_path: Optional[str],
        allocation_path: Optional[str],
        ai_analysis: str,
    ) -> None:
        """シンプルなHTML版レポートを出力（オフライン確認用）"""
        try:
            alloc_rows = "".join(
                f"<li>{k}: ¥{v:,.0f} ({(v / (sum(allocation.values()) or 1))*100:.1f}%)</li>"
                for k, v in allocation.items()
            )
            top = trade_stats.get("top")
            worst = trade_stats.get("worst")
            top_line = f"{top[0]} ¥{top[1]:,.0f}" if top else "N/A"
            worst_line = f"{worst[0]} ¥{worst[1]:,.0f}" if worst else "N/A"
            html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>AGStock Weekly Report</title></head>
<body>
  <h1>AGStock Weekly Report - {datetime.now().strftime('%Y-%m-%d')}</h1>
  <h2>サマリー</h2>
  <ul>
    <li>Total Equity: ¥{balance['total_equity']:,.0f}</li>
    <li>Cash: ¥{balance['cash']:,.0f}</li>
    <li>Win Rate: {trade_stats['win_rate'] * 100:.1f}%</li>
    <li>Monthly PnL: ¥{trade_stats['monthly_pnl']:,.0f}</li>
    <li>Top: {top_line}</li>
    <li>Worst: {worst_line}</li>
  </ul>
  <h2>資産配分</h2>
  <ul>{alloc_rows}</ul>
"""
            if chart_path and os.path.exists(chart_path):
                html += f'<h2>Equity Curve</h2><img src="{chart_path}" width="600"/>'
            if allocation_path and os.path.exists(allocation_path):
                html += f'<h2>Allocation</h2><img src="{allocation_path}" width="400"/>'
            html += f"<h2>AI Analysis</h2><p>{ai_analysis.replace(chr(10), '<br/>')}</p></body></html>"
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(html)
            logger.info(f"HTML report generated: {output_path}")
        except Exception as e:
            logger.error(f"Error generating HTML report: {e}")


if __name__ == "__main__":
    # Simple CLI: optional HTML出力とデモモード
    html_out = os.getenv("REPORT_HTML_OUTPUT")
    generator = PDFReportGenerator()
    success = generator.generate_weekly_report("test_report.pdf", html_output_path=html_out)
    print(f"Report generated: {success}")
