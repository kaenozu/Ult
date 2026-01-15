"""
AGStock バックテスト機能
戦略の過去データ検証
(Shim for src.backtesting.engine)
"""
import logging
from src.backtesting.engine import BacktestEngine as CoreEngine

logger = logging.getLogger(__name__)

class BacktestEngine(CoreEngine):
    """Shim for BacktestEngine"""
    def __init__(self, *args, **kwargs):
        # Handle renaming of arguments if necessary
        super().__init__(*args, **kwargs)

    def _size_position(self, ticker, portfolio_value, exec_price):
        """Test compatibility shim"""
        if isinstance(self.position_size, dict):
            alloc = self.position_size.get(ticker, 0.0)
        else:
            alloc = self.position_size
        return (portfolio_value * alloc) / exec_price if exec_price > 0 else 0.0

# Aliases
Backtester = BacktestEngine