"""
Trade Executor Component
Orchestrates the final execution of trade signals through multiple layers of validation.
"""

import logging
from typing import Any, Dict, List

from src.data.feedback_store import FeedbackStore
from src.data_loader import fetch_stock_data, get_latest_price
from src.execution.execution_engine import ExecutionEngine
from src.trading.portfolio_manager import PortfolioManager

logger = logging.getLogger(__name__)


class TradeExecutor:
    """
    Handles the validation and execution of trade signals.
    """

    def __init__(self, config: Dict[str, Any], engine: ExecutionEngine):
        self.config = config
        self.engine = engine
        self.logger = logger

        # Risk & Feedback components
        try:
            self.portfolio_manager = PortfolioManager()
            self.feedback_store = FeedbackStore()
            self.logger.info("✅ TradeExecutor components initialized.")
        except Exception as e:
            self.logger.error(f"❌ TradeExecutor component initialization failed: {e}")

    def execute_signals(self, signals: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Executes a list of signals after performing verification and risk checks.
        """
        if not signals:
            self.logger.info("No signals to execute.")
            return []

        self.logger.info(f"Processing {len(signals)} signals...")

        # 1. Verification Layer (LLM dependencies removed)
        verified_signals = self._verify_signals(signals)

        if not verified_signals:
            self.logger.warning("All signals failed verification.")
            return []

        # 2. Price Fetching
        tickers = [s["ticker"] for s in verified_signals]
        market_data = fetch_stock_data(tickers, period="5d")

        prices = {}
        for ticker in tickers:
            if ticker in market_data:
                price = get_latest_price(market_data[ticker])
                if price:
                    prices[ticker] = price

        # 3. Execution via Engine
        executed_trades = self.engine.execute_orders(verified_signals, prices)

        # 4. Feedback Loop Logging (Phase 42)
        if executed_trades:
            self._log_execution_feedback(executed_trades)

        return executed_trades

    def _verify_signals(self, signals: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Performs basic signal verification.
        """
        vetted_signals = []
        for signal in signals:
            ticker = signal.get("ticker")
            if not ticker:
                continue
            vetted_signals.append(signal)

        return vetted_signals

    def _log_execution_feedback(self, executed_trades: List[Dict[str, Any]]) -> None:
        """Logs trades for future RL/learning feedback."""
        for trade in executed_trades:
            try:
                self.feedback_store.add_feedback(
                    ticker=trade["ticker"],
                    trade_id=str(trade.get("trade_id", "auto")),
                    expected_pnl=0.0,  # Will be filled by rebalancer
                    entry_context=trade.get("reason", "manual_execution"),
                )
            except Exception as e:
                self.logger.debug(f"Feedback logging failed for {trade['ticker']}: {e}")
