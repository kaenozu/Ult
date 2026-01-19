"""
Unit tests for AutoTrader class
"""

import pytest
import pandas as pd
import numpy as np
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, time
import pytz

from src.auto_trader import AutoTrader
from src.paper_trader import PaperTrader


class TestAutoTrader:
    """Test suite for AutoTrader functionality"""

    @pytest.fixture
    def mock_paper_trader(self):
        """Mock PaperTrader instance"""
        pt = Mock(spec=PaperTrader)
        pt.get_current_balance.return_value = {"invested_amount": 0, "cash": 100000.0}
        pt.get_positions.return_value = pd.DataFrame()
        pt.get_equity_history.return_value = pd.DataFrame()
        return pt

    @pytest.fixture
    def auto_trader(self, mock_paper_trader):
        """AutoTrader instance with mocked dependencies"""
        with patch("src.auto_trader.settings") as mock_settings:
            mock_settings.trading.max_position_size = 0.1
            mock_settings.system.initial_capital = 1000000
            mock_settings.trading.max_total_invested = 200000.0
            mock_settings.trading.initial_stop_loss_pct = 0.05
            mock_settings.system.realtime_ttl_seconds = 300
            trader = AutoTrader(mock_paper_trader)
            trader.max_budget_per_trade = 10000.0  # Override for testing
            return trader

    def test_is_market_open_weekend(self, auto_trader):
        """Test market closed on weekends"""
        # Saturday
        with patch("src.auto_trader.datetime") as mock_datetime:
            mock_datetime.now.return_value = datetime(
                2024, 1, 6, 10, 0, tzinfo=pytz.timezone("Asia/Tokyo")
            )
            assert not auto_trader._is_market_open()

    def test_is_market_open_holiday(self, auto_trader):
        """Test market closed on holidays"""
        with (
            patch("src.auto_trader.datetime") as mock_datetime,
            patch("src.auto_trader.jpholiday.is_holiday", return_value=True),
        ):
            mock_datetime.now.return_value = datetime(
                2024, 1, 1, 10, 0, tzinfo=pytz.timezone("Asia/Tokyo")
            )
            assert not auto_trader._is_market_open()

    def test_is_market_open_morning_session(self, auto_trader):
        """Test market open during morning session"""
        with patch("src.auto_trader.datetime") as mock_datetime_class:
            mock_now = datetime(2024, 1, 2, 10, 0, tzinfo=pytz.timezone("Asia/Tokyo"))
            mock_datetime_class.now.return_value = mock_now
            mock_datetime_class.strptime = datetime.strptime
            assert auto_trader._is_market_open()

    def test_is_market_open_afternoon_session(self, auto_trader):
        """Test market open during afternoon session"""
        with patch("src.auto_trader.datetime") as mock_datetime_class:
            mock_now = datetime(2024, 1, 2, 14, 0, tzinfo=pytz.timezone("Asia/Tokyo"))
            mock_datetime_class.now.return_value = mock_now
            mock_datetime_class.strptime = datetime.strptime
            assert auto_trader._is_market_open()

    def test_is_market_open_after_hours(self, auto_trader):
        """Test market closed after hours"""
        with patch("src.auto_trader.datetime") as mock_datetime_class:
            mock_now = datetime(2024, 1, 2, 16, 0, tzinfo=pytz.timezone("Asia/Tokyo"))
            mock_datetime_class.now.return_value = mock_now
            mock_datetime_class.strptime = datetime.strptime
            assert not auto_trader._is_market_open()

    def test_check_budget_sufficient(self, auto_trader, mock_paper_trader):
        """Test budget check when sufficient"""
        mock_paper_trader.get_current_balance.return_value = {
            "invested_amount": 50000.0,
            "cash": 50000.0,
        }
        assert auto_trader._check_budget()

    def test_check_budget_insufficient_cash(self, auto_trader, mock_paper_trader):
        """Test budget check when insufficient cash"""
        mock_paper_trader.get_current_balance.return_value = {
            "invested_amount": 0,
            "cash": 5000.0,
        }
        assert not auto_trader._check_budget()

    def test_check_budget_max_invested(self, auto_trader, mock_paper_trader):
        """Test budget check when max invested reached"""
        mock_paper_trader.get_current_balance.return_value = {
            "invested_amount": 250000.0,
            "cash": 50000.0,
        }
        assert not auto_trader._check_budget()

    @patch("src.auto_trader.fetch_stock_data")
    @patch("src.auto_trader.fetch_stock_data")
    @patch("src.auto_trader.NIKKEI_225_TICKERS", ["7203.T", "9984.T"])
    def test_scan_opportunities_with_signals(
        self, mock_tickers, mock_fetch, auto_trader, mock_paper_trader
    ):
        """Test scanning for opportunities when signals are found"""
        # Mock owned positions
        mock_paper_trader.get_positions.return_value = pd.DataFrame()

        # Mock data fetch
        mock_df = pd.DataFrame(
            {
                "Close": [100, 101, 102, 103, 104],
                "High": [105, 106, 107, 108, 109],
                "Low": [95, 96, 97, 98, 99],
            },
            index=pd.date_range("2024-01-01", periods=5),
        )
        mock_fetch.return_value = {"7203.T": mock_df}

        # Mock strategy analysis to return buy signal
        with patch.object(
            auto_trader.strategies["RSI"], "analyze", return_value={"signal": 1}
        ):
            signals = auto_trader._scan_opportunities()
            assert len(signals) > 0
            assert "7203.T" in signals

    @patch("src.auto_trader.get_latest_price")
    def test_execute_buy_success(self, mock_get_price, auto_trader, mock_paper_trader):
        """Test successful buy execution"""
        mock_get_price.return_value = 100.0
        auto_trader._execute_buy("7203.T")
        mock_paper_trader.execute_trade.assert_called_once()

    @patch("src.auto_trader.get_latest_price")
    def test_execute_buy_no_price(self, mock_get_price, auto_trader, mock_paper_trader):
        """Test buy execution when no price available"""
        mock_get_price.return_value = None
        auto_trader._execute_buy("7203.T")
        mock_paper_trader.execute_trade.assert_not_called()

    def test_monitor_positions_stop_loss(self, auto_trader, mock_paper_trader):
        """Test position monitoring with stop loss trigger"""
        positions_df = pd.DataFrame(
            {
                "ticker": ["7203.T"],
                "current_price": [90.0],
                "avg_price": [100.0],
                "quantity": [100],
            }
        )
        mock_paper_trader.get_positions.return_value = positions_df

        auto_trader._monitor_positions()
        mock_paper_trader.execute_trade.assert_called_once_with(
            "7203.T", "SELL", 100, 90.0, reason="Stop Loss (Auto)"
        )

    def test_monitor_positions_take_profit(self, auto_trader, mock_paper_trader):
        """Test position monitoring with take profit trigger"""
        positions_df = pd.DataFrame(
            {
                "ticker": ["7203.T"],
                "current_price": [115.0],
                "avg_price": [100.0],
                "quantity": [100],
            }
        )
        mock_paper_trader.get_positions.return_value = positions_df

        auto_trader._monitor_positions()
        mock_paper_trader.execute_trade.assert_called_once_with(
            "7203.T", "SELL", 100, 115.0, reason="Take Profit (Auto)"
        )

    @patch("src.auto_trader.fetch_stock_data")
    def test_analyze_ticker_rsi_buy(self, mock_fetch, auto_trader):
        """Test ticker analysis with RSI buy signal"""
        mock_df = pd.DataFrame(
            {"Close": [100, 101, 102, 103, 104]},
            index=pd.date_range("2024-01-01", periods=5),
        )
        mock_fetch.return_value = {"7203.T": mock_df}

        with patch.object(
            auto_trader.strategies["RSI"], "analyze", return_value={"signal": 1}
        ):
            signal = auto_trader._analyze_ticker("7203.T")
            assert signal == 1

    @patch("src.auto_trader.fetch_stock_data")
    def test_analyze_ticker_lightgbm_buy(self, mock_fetch, auto_trader):
        """Test ticker analysis with LightGBM buy signal"""
        mock_df = pd.DataFrame(
            {"Close": [100, 101, 102, 103, 104]},
            index=pd.date_range("2024-01-01", periods=5),
        )
        mock_fetch.return_value = {"7203.T": mock_df}

        auto_trader.strategies["RSI"].analyze.return_value = {"signal": 0}
        auto_trader.strategies["LightGBM"].analyze.return_value = {
            "signal": 1,
            "confidence": 0.8,
        }
        signal = auto_trader._analyze_ticker("7203.T")
        assert signal == 1

    @patch("src.auto_trader.fetch_stock_data")
    def test_analyze_ticker_no_signal(self, mock_fetch, auto_trader):
        """Test ticker analysis with no signals"""
        mock_df = pd.DataFrame(
            {"Close": [100, 101, 102, 103, 104]},
            index=pd.date_range("2024-01-01", periods=5),
        )
        mock_fetch.return_value = {"7203.T": mock_df}

        auto_trader.strategies["RSI"].analyze.return_value = {"signal": 0}
        auto_trader.strategies["LightGBM"].analyze.return_value = {
            "signal": 0,
            "confidence": 0.5,
        }
        signal = auto_trader._analyze_ticker("7203.T")
        assert signal == 0

    def test_get_status(self, auto_trader):
        """Test getting trader status"""
        status = auto_trader.get_status()
        assert "is_running" in status
        assert "scan_status" in status
        assert "config" in status
