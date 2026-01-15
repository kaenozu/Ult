"""
Daily Reporter Component
Responsible for generating daily reports, notifications, and running autonomous self-reflection loops.
"""

import os
import datetime
import logging
from typing import Any, Dict

import google.generativeai as genai
import pandas as pd

from src.data.feedback_store import FeedbackStore
from src.data_loader import fetch_stock_data
from src.evolution.genetic_optimizer import GeneticOptimizer
from src.evolution.strategy_generator import StrategyGenerator
from src.feedback_loop import DailyReviewer
from src.paper_trader import PaperTrader
from src.smart_notifier import SmartNotifier

logger = logging.getLogger(__name__)


class DailyReporter:
    """
    Automates the end-of-day reporting and learning lifecycle.
    """

    def __init__(
        self,
        config: Dict[str, Any],
        paper_trader: PaperTrader,
        config_path: str = "config.json",
    ):
        self.config = config
        self.pt = paper_trader
        self.logger = logger
        self.config_path = config_path

        try:
            self.notifier = SmartNotifier(config_path)
            self.feedback_store = FeedbackStore()
            self.genetic_optimizer = GeneticOptimizer()
            self.logger.info("✅ DailyReporter components initialized.")
        except Exception as e:
            self.logger.error(f"❌ DailyReporter initialization failed: {e}")

    def send_daily_report(self) -> None:
        """Generates and sends the daily summary to all notification channels."""
        self.logger.info("📡 Generating daily report...")
        balance = self.pt.get_current_balance()
        daily_pnl = self._calculate_daily_pnl()

        # Gather today's trades
        history = self.pt.get_trade_history()
        today = datetime.date.today()

        if not history.empty:
            if "timestamp" in history.columns:
                history["timestamp"] = pd.to_datetime(history["timestamp"])
                today_trades = history[history["timestamp"].dt.date == today]
            else:
                today_trades = pd.DataFrame()
        else:
            today_trades = pd.DataFrame()

        # Win Rate calculation
        win_rate = 0.0
        if not history.empty and "realized_pnl" in history.columns:
            wins = len(history[history["realized_pnl"] > 0])
            total = len(history[history["realized_pnl"] != 0])
            win_rate = (wins / total * 100) if total > 0 else 0.0

        # Construct Summary
        signals_info = []
        for _, trade in today_trades.iterrows():
            signals_info.append(
                {"action": trade["action"], "ticker": trade["ticker"], "price": trade.get("price", 0.0)}
            )

        summary = {
            "date": today.strftime("%Y-%m-%d"),
            "total_value": float(balance.get("total_equity", 0.0)),
            "daily_pnl": daily_pnl,
            "monthly_pnl": self._calculate_monthly_pnl(),
            "win_rate": win_rate,
            "signals": signals_info,
            "advice": self.get_advice(daily_pnl, float(balance.get("total_equity", 0.0))),
        }

        try:
            self.notifier.send_daily_summary_rich(summary)
        except Exception as e:
            self.logger.error(f"Failed to send daily report: {e}")

    def get_advice(self, daily_pnl: float, total_equity: float) -> str:
        """Generates a short AI-like advice based on performance."""
        if daily_pnl > 0:
            return "📈 好調な推移です。現在の戦略を維持しつつ、トレンドの終焉に警戒してください。"
        elif daily_pnl < -(total_equity * 0.02):
            return "⚠️ 大幅なドローダウンを検知しました。リスク許容度を見直し、取引を一時抑制することを推奨します。"
        else:
            return "⚖️ 安定した運用状態です。市場のボラティリティを注視してください。"

    def run_post_market_analysis(self) -> None:
        """Phase 63: Post-market autonomous feedback loop."""
        self.logger.info("🔄 Running Post-Market Analysis (Reviewer)...")
        try:
            reviewer = DailyReviewer(self.config_path)
            result = reviewer.run_daily_review()

            metrics = result.get("metrics", {})
            adjustments = result.get("adjustments", {})

            self.logger.info(
                f"📊 Review Results: P&L=¥{metrics.get('daily_pnl', 0):,.0f}, Adjustments: {bool(adjustments)}"
            )
        except Exception as e:
            self.logger.error(f"Post-market analysis failed: {e}")

    def run_self_reflection(self) -> None:
        """Phase 76: AI Self-Reflection using Gemini."""
        self.logger.info("🧐 AI自己反省フェーズ開始...")
        try:
            failures = self.feedback_store.get_recent_failures(limit=3)
            if not failures:
                self.logger.info("分析対象の失敗トレードはありません。")
                return

            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                logger.warning("GEMINI_API_KEY not found. Skipping reflection.")
                return

            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-1.5-flash")

            for f in failures:
                if f.get("reflection_log"):
                    continue

                ticker = f["ticker"]
                prompt = f"""
                You are the reflection module of an autonomous trading AI.
                Analyze the following failed trade:
                Ticker: {ticker}
                Decided: {f['decision']}
                Rationale: {f['rationale']}
                Result: 1-week return {f['return_1w'] * 100:.2f}% (Wait & See target failed).

                Identify WHY it failed and provide one concise lesson in Japanese.
                Format:
                Analysis: <text>
                Lesson: <text>
                """

                response = model.generate_content(prompt)
                res_text = response.text

                analysis = res_text.split("Lesson:")[0].replace("Analysis:", "").strip()
                lesson = res_text.split("Lesson:")[1].strip() if "Lesson:" in res_text else "リスク管理の徹底。"

                self.feedback_store.save_reflection(f["id"], analysis, lesson)
                self.logger.info(f"✅ {ticker} の分析完了: {lesson}")

        except Exception as e:
            self.logger.warning(f"Self-reflection failed: {e}")

    def run_strategy_evolution(self) -> None:
        """Phase 81: AI Strategy evolution loop (Active on Weekends)."""
        if datetime.datetime.now().weekday() == 5:  # Saturday
            self.logger.info("🧬 Strategy Evolution sequence initiated...")
            try:
                gen = StrategyGenerator()
                gen.evolve_strategies()
                self.logger.info("✅ Strategy evolution completed.")
            except Exception as e:
                self.logger.error(f"Strategy evolution failed: {e}")

    def _calculate_daily_pnl(self) -> float:
        """Calculates realized + unrealized P&L for today."""
        # Simplified: current equity minus equity at start of day from history
        history = self.pt.get_equity_history()
        if len(history) < 2:
            return 0.0
        return float(history.iloc[-1]["equity"] - history.iloc[-2]["equity"])

    def _calculate_monthly_pnl(self) -> float:
        """Calculates P&L for the past 30 days."""
        history = self.pt.get_equity_history()
        if len(history) < 2:
            return 0.0
        start_idx = max(0, len(history) - 30)
        return float(history.iloc[-1]["equity"] - history.iloc[start_idx]["equity"])

    def run_performance_update(self, committee=None) -> None:
        """Updates internal benchmarks and meritocracy systems."""
        self.logger.info("📊 Syncing performance records...")
        try:
            # Sync outcomes for tracked tickers
            positions = self.pt.get_positions()
            tickers = positions["ticker"].tolist() if not positions.empty else []

            if tickers:
                data = fetch_stock_data(tickers, period="5d")
                for ticker in tickers:
                    if ticker in data:
                        last_price = data[ticker]["Close"].iloc[-1]
                        self.feedback_store.update_outcomes(ticker, last_price)

            # Update Committee Meritocracy (Phase 28/30)
            if committee:
                if hasattr(committee, "arena"):
                    committee.arena.update_agent_performance()
                if hasattr(committee, "council"):
                    committee.council.update_meritocracy_all()
                if hasattr(committee, "dynasty") and committee.dynasty:
                    committee.dynasty.record_epoch()

            self.logger.info("✅ All performance systems synchronized.")
        except Exception as e:
            self.logger.error(f"Performance sync failed: {e}")
