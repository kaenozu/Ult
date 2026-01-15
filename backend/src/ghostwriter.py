"""
The Ghostwriter (AI Weekly Reporter)
Automates writing professional-grade investment reports using AI.
"""

import datetime
import json
import logging
from pathlib import Path
from typing import Any, Dict

import pandas as pd

from src.formatters import format_currency, format_date
from src.llm_reasoner import LLMReasoner
from src.moe_system import MixtureOfExperts
from src.paper_trader import PaperTrader
from src.prompts.reporting_prompts import GHOSTWRITER_REPORT_PROMPT

logger = logging.getLogger(__name__)


class Ghostwriter:
    """
    Automates weekly report generation for portfolio performance and market outlook.
    """

    def __init__(self, reports_dir: str = "reports"):
        self.pt = PaperTrader()
        self.llm = LLMReasoner()
        self.moe = MixtureOfExperts()
        self.reports_dir = Path(reports_dir)

        if not self.reports_dir.exists():
            self.reports_dir.mkdir(parents=True, exist_ok=True)

    def generate_weekly_report(self) -> str:
        """
        Generates and saves a weekly report in Markdown format.
        """
        logger.info("👻 Ghostwriter: Starting report generation...")

        try:
            # 1. Gather Data
            data_summary = self._gather_weekly_data()

            # 2. Write Report with LLM
            report_content = self._write_report_with_llm(data_summary)

            # 3. Save to file
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = self.reports_dir / f"weekly_report_{timestamp}.md"

            filename.write_text(report_content, encoding="utf-8")

            logger.info(f"👻 Ghostwriter: Report saved to {filename}")
            return str(filename)

        except Exception as e:
            logger.error(f"👻 Ghostwriter: Generation failed: {e}", exc_info=True)
            raise

    def _gather_weekly_data(self) -> Dict[str, Any]:
        """
        Collects data for the past 7 days.
        """
        end_date = datetime.date.today()
        start_date = end_date - datetime.timedelta(days=7)

        # Portfolio Status
        balance = self.pt.get_current_balance()
        history = self.pt.get_trade_history()

        # Weekly Trades
        if not history.empty:
            history["date_dt"] = pd.to_datetime(history["date"]).dt.date
            weekly_trades = history[(history["date_dt"] >= start_date) & (history["date_dt"] <= end_date)]
        else:
            weekly_trades = pd.DataFrame()

        realized_pnl = 0.0
        if not weekly_trades.empty and "realized_pnl" in weekly_trades.columns:
            realized_pnl = float(weekly_trades["realized_pnl"].sum())

        # Market Regime
        from src.dashboard_utils import get_market_regime

        regime_info = get_market_regime()

        # Format trades for JSON injection
        trades_detail = []
        if not weekly_trades.empty:
            df_display = weekly_trades.copy()
            # Convert datetime to string for JSON
            for col in df_display.columns:
                if pd.api.types.is_datetime64_any_dtype(df_display[col]):
                    df_display[col] = df_display[col].dt.strftime("%Y-%m-%d %H:%M:%S")
            trades_detail = df_display.to_dict("records")

        return {
            "start_date": format_date(start_date),
            "end_date": format_date(end_date),
            "total_equity": format_currency(balance.get("total_equity", 0)),
            "cash": format_currency(balance.get("cash", 0)),
            "realized_pnl": format_currency(realized_pnl, show_sign=True),
            "trade_count": len(weekly_trades),
            "trades_detail": trades_detail,
            "market_regime": regime_info,
        }

    def _write_report_with_llm(self, data: Dict[str, Any]) -> str:
        """
        Converts gathered data into a narrative report using LLM.
        """
        regime = data.get("market_regime", {})

        prompt = GHOSTWRITER_REPORT_PROMPT.format(
            start_date=data["start_date"],
            end_date=data["end_date"],
            total_equity=data["total_equity"],
            cash=data["cash"],
            realized_pnl=data["realized_pnl"],
            trade_count=data["trade_count"],
            market_regime_desc=regime.get("description", "不明"),
            strategy_desc=regime.get("strategy_desc", "不明"),
            trades_json=json.dumps(data["trades_detail"], ensure_ascii=False, indent=2),
        )

        try:
            response = self.llm.ask(prompt)
            if not response or "Error:" in response:
                raise ValueError(f"LLM returned invalid response: {response}")
            return response
        except Exception as e:
            logger.warning(f"LLM write failed: {e}. Falling back to template.")
            return self._generate_fallback_report(data)

    def _generate_fallback_report(self, data: Dict[str, Any]) -> str:
        """
        Provides a basic template-based report if AI fails.
        """
        regime = data.get("market_regime", {})

        return f"""# 🌩️ Weekly Alpha Report (AI代筆モード)

## Executive Summary
今週の運用報告です。市場環境は「{regime.get('description', '評価中')}」の状態にあり、
システムは「{regime.get('strategy_desc', '標準待機')}」戦略を採用しております。

## Performance Review
- **対象期間**: {data['start_date']} 〜 {data['end_date']}
- **総資産**: {data['total_equity']}
- **確定損益**: {data['realized_pnl']}
- **取引回数**: {data['trade_count']}回

## Market Outlook
来週も市場のボラティリティを慎重に見守りつつ、MoE（賢人会議）システムによる最適なリソース配分で利益機会を追求してまいります。
（※現在LLMの直接執筆が制限されているため、システムテンプレートによる自動生成を行っています）
"""


if __name__ == "__main__":
    # Test run logic
    logging.basicConfig(level=logging.INFO)
    gw = Ghostwriter()
    print(f"Report location: {gw.generate_weekly_report()}")
