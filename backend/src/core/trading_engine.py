"""
Legacy Trading Engine Wrapper
Provided for compatibility with older tests and modules.
"""
import logging
from src.execution.execution_engine import ExecutionEngine
from src.paper_trader import PaperTrader

logger = logging.getLogger(__name__)

class TradingEngine:
    def __init__(self, config=None):
        self.config = config or {}
        self.pt = PaperTrader()
        self.engine = ExecutionEngine(self.pt, config_path="config.json")

    def run_daily_cycle(self):
        """1日の運用サイクルを実行"""
        # Delegate or implement minimal logic
        logger.info("TradingEngine running daily cycle...")
        pass

    def generate_signals(self, tickers):
        """シグナル生成"""
        return []
