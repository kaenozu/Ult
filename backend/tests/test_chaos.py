import unittest
from unittest.mock import MagicMock, patch
import sys
import asyncio
from pathlib import Path

# Add src to path
sys.path.append(str(Path(__file__).parent.parent))

from src.portfolio_manager import PortfolioManager

class TestChaosDrill(unittest.TestCase):
    def setUp(self):
        self.mock_db = MagicMock()
        with patch('src.portfolio_manager.asyncio.Lock') as mock_lock:
             # We rely on asyncio.Lock only for API server, logic inside PM is sync
             self.pm = PortfolioManager(self.mock_db)
    
    @patch('src.portfolio_manager.fetch_stock_data')
    def test_network_zombie_price_fetch(self, mock_fetch):
        """
        Scenario: Price API is down (Zombie Network).
        System should gracefully skip tickers with missing data, not crash.
        """
        # 1. Setup Portfolio with 2 positions
        self.mock_db.get_trades.return_value = [
            {'symbol': '7203.T', 'action': 'BUY', 'quantity': 100, 'price': 2000, 'total': 200000, 'timestamp': '2024-01-01'},
            {'symbol': '9984.T', 'action': 'BUY', 'quantity': 100, 'price': 6000, 'total': 600000, 'timestamp': '2024-01-01'}
        ]
        
        # 2. Mock API Failure (Raise Exception)
        mock_fetch.side_effect = ConnectionError("Network Down")
        
        # 3. Calculate Portfolio
        # Should not raise exception
        data = self.pm.calculate_portfolio()
        
        # 4. Verify Safe Fallback
        # Tickers should be present but with current_price=0.0 or effectively filtered in Rebalance
        positions = data['positions']
        self.assertIn('7203.T', positions)
        self.assertEqual(positions['7203.T']['current_price'], 0.0)
        
        # 5. Verify Rebalance ignores them
        orders = self.pm.rebalance_portfolio()
        self.assertEqual(len(orders), 0, "Should generate NO orders if price is unknown")

    @patch('src.portfolio_manager.fetch_stock_data')
    def test_flash_crash_handling(self, mock_fetch):
        """
        Scenario: Flash Crash (-99% drop).
        Rebalancer logic is 'Equal Weight', so it might try to BUY the dip.
        We verify that it calculates correctly without math errors (div by zero etc).
        """
        # 1. Setup: Holding 7203.T @ 2000
        self.mock_db.get_trades.return_value = [
            {'symbol': '7203.T', 'action': 'BUY', 'quantity': 1000, 'price': 2000, 'total': 2000000, 'timestamp': '2024-01-01'}
        ]
        
        # 2. Mock Flash Crash: Price drops to 20 JPY (-99%)
        import pandas as pd
        mock_fetch.return_value = {
            '7203.T': pd.DataFrame({'Close': [20.0]})
        }
        mock_fetch.side_effect = None # Reset side effect
        
        # 3. Rebalance
        # Total Equity ~ 20 * 1000 + Cash (10M - 2M) = 20k + 8M = 8.02M
        # Target per asset (1 asset) = 8.02M * 0.95 = 7.6M
        # Current Value = 20k
        # Diff = +7.58M -> Should BUY heavily
        
        orders = self.pm.rebalance_portfolio()
        
        # 4. Verify Order Generation (Buying the dip)
        self.assertTrue(len(orders) > 0)
        action = orders[0]['action']
        self.assertEqual(action, 'BUY')
        self.assertTrue(orders[0]['quantity'] > 0)
        
        print(f"Flash Crash Reaction: {orders[0]}")

if __name__ == '__main__':
    unittest.main()
