import pytest
import sqlite3
from unittest.mock import patch
from src.database_manager import DatabaseManager


class TestDatabaseManager:
    """Database manager tests."""

    @pytest.fixture
    def db_manager(self):
        """Create test database manager."""
        # Use in-memory database for testing
        with patch("src.database_manager.sqlite3.connect") as mock_connect:
            mock_conn = mock_connect.return_value
            mock_conn.cursor.return_value = mock_conn
            mock_conn.row_factory = sqlite3.Row

            manager = DatabaseManager()
            manager._init_db = lambda: None  # Skip init for testing
            yield manager

    def test_save_portfolio(self, db_manager):
        """Test portfolio saving."""
        with patch.object(db_manager, "_get_connection") as mock_conn:
            mock_cursor = (
                mock_conn.return_value.__enter__.return_value.cursor.return_value
            )
            mock_cursor.rowcount = 1

            result = db_manager.save_portfolio(
                total_value=1000000,
                cash_balance=500000,
                positions={"AAPL": 100},
                daily_return=0.01,
            )

            assert isinstance(result, str)
            mock_cursor.execute.assert_called()

    def test_get_portfolio_history(self, db_manager):
        """Test portfolio history retrieval."""
        with patch.object(db_manager, "_get_connection") as mock_conn:
            mock_cursor = (
                mock_conn.return_value.__enter__.return_value.cursor.return_value
            )
            mock_cursor.fetchall.return_value = [
                {"id": "1", "timestamp": "2024-01-01", "total_value": 1000000}
            ]

            result = db_manager.get_portfolio_history(limit=10)

            assert isinstance(result, list)
            assert len(result) == 1

    def test_save_trade(self, db_manager):
        """Test trade saving."""
        with patch.object(db_manager, "_get_connection") as mock_conn:
            mock_cursor = (
                mock_conn.return_value.__enter__.return_value.cursor.return_value
            )
            mock_cursor.rowcount = 1

            result = db_manager.save_trade(
                symbol="AAPL", action="BUY", quantity=10, price=150.0
            )

            assert isinstance(result, str)
            mock_cursor.execute.assert_called()

    def test_get_trades(self, db_manager):
        """Test trade retrieval."""
        with patch.object(db_manager, "_get_connection") as mock_conn:
            mock_cursor = (
                mock_conn.return_value.__enter__.return_value.cursor.return_value
            )
            mock_cursor.fetchall.return_value = [
                {"id": "1", "symbol": "AAPL", "action": "BUY", "quantity": 10}
            ]

            result = db_manager.get_trades(symbol="AAPL")

            assert isinstance(result, list)
            assert len(result) == 1

    def test_cleanup_old_data(self, db_manager):
        """Test data cleanup."""
        with patch.object(db_manager, "_get_connection") as mock_conn:
            mock_cursor = (
                mock_conn.return_value.__enter__.return_value.cursor.return_value
            )
            mock_cursor.rowcount = 5

            result = db_manager.cleanup_old_data(days=30)

            assert isinstance(result, dict)
            assert "portfolio_history" in result
