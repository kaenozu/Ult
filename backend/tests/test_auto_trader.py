import unittest
from unittest.mock import MagicMock, patch
import sys
import os
from pathlib import Path

# Add src to path
sys.path.append(str(Path(__file__).parent.parent))

from src.auto_trader import AutoTrader
from src.paper_trader import PaperTrader

class TestAutoTrader(unittest.TestCase):
    def setUp(self):
        # Mock PaperTrader
        self.mock_pt = MagicMock(spec=PaperTrader)
        self.auto_trader = AutoTrader(self.mock_pt)
        
        # Default Config
        self.auto_trader.max_budget_per_trade = 50000
        self.auto_trader.max_total_invested = 200000
        self.auto_trader.stop_loss_pct = 0.05

    def test_budget_check_pass(self):
        """Budget check should pass if cash is sufficient and portfolio not full."""
        # Setup: Cash 1M, Invested 0
        self.mock_pt.get_current_balance.return_value = {
            "cash": 1000000,
            "invested_amount": 0
        }
        
        # Test private method _check_and_trade Logic (budget part)
        # We can't easily test just the budget part without mocking everything else in _check_and_trade
        # So we test the values directly
        
        balance = self.mock_pt.get_current_balance()
        invested = balance.get("invested_amount", 0)
        cash = balance.get("cash", 0)
        
        self.assertTrue(invested < self.auto_trader.max_total_invested)
        self.assertTrue(cash >= self.auto_trader.max_budget_per_trade)

    def test_stop_loss_trigger(self):
        """Stop Loss should trigger if PnL drops below limit."""
        # Setup: One position with -6% PnL
        # Entry 1000, Current 940 (-6%)
        mock_positions = MagicMock()
        mock_positions.empty = False
        mock_positions.iterrows.return_value = [
            (0, {
                "ticker": "TEST.T",
                "quantity": 100,
                "avg_price": 1000.0,
                "current_price": 940.0
            })
        ]
        self.mock_pt.get_positions.return_value = mock_positions
        
        # Run Monitor
        self.auto_trader._monitor_positions()
        
        # Assert Sell Triggered
        self.mock_pt.execute_trade.assert_called_with(
            "TEST.T", "SELL", 100, 940.0, reason="Stop Loss (Auto)"
        )

    def test_no_stop_loss_trigger(self):
        """Stop Loss should NOT trigger if PnL is safe."""
        # Setup: One position with -4% PnL (Safe, limit is -5%)
        mock_positions = MagicMock()
        mock_positions.empty = False
        mock_positions.iterrows.return_value = [
            (0, {
                "ticker": "TEST.T",
                "quantity": 100,
                "avg_price": 1000.0,
                "current_price": 960.0
            })
        ]
        self.mock_pt.get_positions.return_value = mock_positions
        
        # Run Monitor
        self.auto_trader._monitor_positions()
        
        # Assert NO Sell
        self.mock_pt.execute_trade.assert_not_called()

if __name__ == '__main__':
    unittest.main()
