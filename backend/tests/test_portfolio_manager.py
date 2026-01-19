"""
Unit tests for PortfolioManager class
"""

import pytest
import pandas as pd
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
from decimal import Decimal

from src.portfolio_manager import PortfolioManager


class TestPortfolioManager:
    """Test suite for PortfolioManager"""

    @pytest.fixture
    def mock_db(self):
        """Mock database manager"""
        db = Mock()
        # Mock trades data
        db.get_trades.return_value = [
            {
                "symbol": "AAPL",
                "quantity": 10,
                "price": 150.0,
                "action": "BUY",
                "total": 1500.0,
                "timestamp": datetime(2024, 1, 1, 10, 0),
            },
            {
                "symbol": "GOOGL",
                "quantity": 5,
                "price": 2800.0,
                "action": "BUY",
                "total": 14000.0,
                "timestamp": datetime(2024, 1, 2, 10, 0),
            },
        ]
        return db

    @pytest.fixture
    def portfolio_manager(self, mock_db):
        """PortfolioManager instance with mocked DB"""
        return PortfolioManager(mock_db)

    @patch("src.portfolio_manager.fetch_stock_data")
    def test_calculate_portfolio_basic(self, mock_fetch, portfolio_manager, mock_db):
        """Test basic portfolio calculation"""
        # Mock current price data
        mock_data = {
            "AAPL": pd.DataFrame({"Close": [155.0]}, index=[datetime(2024, 1, 3)]),
            "GOOGL": pd.DataFrame({"Close": [2850.0]}, index=[datetime(2024, 1, 3)]),
        }
        mock_fetch.return_value = mock_data

        portfolio = portfolio_manager.calculate_portfolio()

        assert "holdings" in portfolio
        assert "cash" in portfolio
        assert "total_value" in portfolio

        # Check holdings
        assert "AAPL" in portfolio["holdings"]
        assert "GOOGL" in portfolio["holdings"]

        aapl_holding = portfolio["holdings"]["AAPL"]
        assert aapl_holding["quantity"] == 10
        assert float(aapl_holding["avg_price"]) == 150.0

    @patch("src.portfolio_manager.fetch_stock_data")
    def test_calculate_portfolio_with_sells(
        self, mock_fetch, portfolio_manager, mock_db
    ):
        """Test portfolio calculation with buy and sell trades"""
        # Add sell trade
        mock_db.get_trades.return_value.append(
            {
                "symbol": "AAPL",
                "quantity": 5,
                "price": 160.0,
                "action": "SELL",
                "total": 800.0,
                "timestamp": datetime(2024, 1, 3, 10, 0),
            }
        )

        # Mock current price data
        mock_data = {
            "AAPL": pd.DataFrame({"Close": [155.0]}, index=[datetime(2024, 1, 4)]),
            "GOOGL": pd.DataFrame({"Close": [2850.0]}, index=[datetime(2024, 1, 4)]),
        }
        mock_fetch.return_value = mock_data

        portfolio = portfolio_manager.calculate_portfolio()

        # AAPL should have 5 shares remaining
        aapl_holding = portfolio["holdings"]["AAPL"]
        assert aapl_holding["quantity"] == 5

    @patch("src.portfolio_manager.fetch_stock_data")
    def test_get_portfolio_summary(self, mock_fetch, portfolio_manager, mock_db):
        """Test portfolio summary generation"""
        # Mock current price data
        mock_data = {
            "AAPL": pd.DataFrame({"Close": [155.0]}, index=[datetime(2024, 1, 3)]),
            "GOOGL": pd.DataFrame({"Close": [2850.0]}, index=[datetime(2024, 1, 3)]),
        }
        mock_fetch.return_value = mock_data

        summary = portfolio_manager.get_portfolio_summary()

        assert "total_value" in summary
        assert "cash_balance" in summary
        assert "positions" in summary
        assert "pnl" in summary

        # Check positions
        positions = summary["positions"]
        assert len(positions) == 2

        # Find AAPL position
        aapl_pos = next(p for p in positions if p["ticker"] == "AAPL")
        assert aapl_pos["quantity"] == 10
        assert aapl_pos["current_price"] == 155.0
        assert aapl_pos["avg_price"] == 150.0

    @patch("src.portfolio_manager.fetch_stock_data")
    def test_get_portfolio_summary_empty(self, mock_fetch, portfolio_manager, mock_db):
        """Test portfolio summary with no trades"""
        mock_db.get_trades.return_value = []
        mock_fetch.return_value = {}

        summary = portfolio_manager.get_portfolio_summary()

        assert summary["total_value"] == 10000000.0  # Initial cash
        assert summary["cash_balance"] == 10000000.0
        assert summary["positions"] == []
        assert summary["pnl"] == 0.0

    @patch("src.portfolio_manager.fetch_realtime_data")
    def test_update_realtime_prices(self, mock_realtime, portfolio_manager, mock_db):
        """Test real-time price updates"""
        # Mock real-time data
        mock_realtime.return_value = {
            "AAPL": {"price": 156.0, "volume": 10000},
            "GOOGL": {"price": 2860.0, "volume": 5000},
        }

        # First calculate portfolio
        with patch("src.portfolio_manager.fetch_stock_data") as mock_fetch:
            mock_data = {
                "AAPL": pd.DataFrame({"Close": [155.0]}, index=[datetime(2024, 1, 3)]),
                "GOOGL": pd.DataFrame(
                    {"Close": [2850.0]}, index=[datetime(2024, 1, 3)]
                ),
            }
            mock_fetch.return_value = mock_data
            portfolio_manager.calculate_portfolio()

        # Update with real-time prices
        updated_portfolio = portfolio_manager.update_realtime_prices()

        # Check updated prices
        aapl_holding = updated_portfolio["holdings"]["AAPL"]
        assert aapl_holding["current_price"] == 156.0

    def test_get_position_details(self, portfolio_manager, mock_db):
        """Test getting detailed position information"""
        with patch("src.portfolio_manager.fetch_stock_data") as mock_fetch:
            mock_data = {
                "AAPL": pd.DataFrame({"Close": [155.0]}, index=[datetime(2024, 1, 3)])
            }
            mock_fetch.return_value = mock_data

            details = portfolio_manager.get_position_details("AAPL")

            assert details is not None
            assert details["ticker"] == "AAPL"
            assert details["quantity"] == 10
            assert details["avg_price"] == 150.0
            assert details["current_price"] == 155.0

    def test_get_position_details_not_found(self, portfolio_manager, mock_db):
        """Test getting details for non-existent position"""
        details = portfolio_manager.get_position_details("NONEXISTENT")
        assert details is None

    def test_calculate_pnl(self, portfolio_manager, mock_db):
        """Test PnL calculation"""
        with patch("src.portfolio_manager.fetch_stock_data") as mock_fetch:
            mock_data = {
                "AAPL": pd.DataFrame({"Close": [155.0]}, index=[datetime(2024, 1, 3)]),
                "GOOGL": pd.DataFrame(
                    {"Close": [2850.0]}, index=[datetime(2024, 1, 3)]
                ),
            }
            mock_fetch.return_value = mock_data

            pnl = portfolio_manager.calculate_pnl()

            assert isinstance(pnl, dict)
            assert "total_pnl" in pnl
            assert "positions_pnl" in pnl
            assert "total_pnl" == 550.0  # (155-150)*10 + (2850-2800)*5

    def test_get_portfolio_metrics(self, portfolio_manager, mock_db):
        """Test portfolio metrics calculation"""
        with patch("src.portfolio_manager.fetch_stock_data") as mock_fetch:
            mock_data = {
                "AAPL": pd.DataFrame({"Close": [155.0]}, index=[datetime(2024, 1, 3)]),
                "GOOGL": pd.DataFrame(
                    {"Close": [2850.0]}, index=[datetime(2024, 1, 3)]
                ),
            }
            mock_fetch.return_value = mock_data

            metrics = portfolio_manager.get_portfolio_metrics()

            assert "total_value" in metrics
            assert "cash_ratio" in metrics
            assert "concentration" in metrics
            assert "beta" in metrics

    @pytest.mark.asyncio
    async def test_async_calculate_portfolio(self, portfolio_manager, mock_db):
        """Test async portfolio calculation"""
        with patch("src.portfolio_manager.fetch_stock_data") as mock_fetch:
            mock_data = {
                "AAPL": pd.DataFrame({"Close": [155.0]}, index=[datetime(2024, 1, 3)])
            }
            mock_fetch.return_value = mock_data

            async with portfolio_manager.lock:
                portfolio = await portfolio_manager.calculate_portfolio_async()

            assert "holdings" in portfolio
            assert "cash" in portfolio

    def test_validate_portfolio_integrity(self, portfolio_manager, mock_db):
        """Test portfolio integrity validation"""
        with patch("src.portfolio_manager.fetch_stock_data") as mock_fetch:
            mock_data = {
                "AAPL": pd.DataFrame({"Close": [155.0]}, index=[datetime(2024, 1, 3)])
            }
            mock_fetch.return_value = mock_data

            is_valid, issues = portfolio_manager.validate_portfolio_integrity()

            assert isinstance(is_valid, bool)
            assert isinstance(issues, list)

    def test_get_portfolio_history(self, portfolio_manager, mock_db):
        """Test portfolio history retrieval"""
        history = portfolio_manager.get_portfolio_history(days=7)

        assert isinstance(history, list)
        # Should return historical snapshots (mocked or real)

    def test_rebalance_portfolio(self, portfolio_manager, mock_db):
        """Test portfolio rebalancing"""
        target_weights = {"AAPL": 0.6, "GOOGL": 0.4}

        with patch("src.portfolio_manager.fetch_stock_data") as mock_fetch:
            mock_data = {
                "AAPL": pd.DataFrame({"Close": [155.0]}, index=[datetime(2024, 1, 3)]),
                "GOOGL": pd.DataFrame(
                    {"Close": [2850.0]}, index=[datetime(2024, 1, 3)]
                ),
            }
            mock_fetch.return_value = mock_data

            rebalance_trades = portfolio_manager.rebalance_portfolio(target_weights)

            assert isinstance(rebalance_trades, list)
            # Check if trades are generated to achieve target weights
