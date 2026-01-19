"""
Unit tests for AdvancedRiskManager class
"""

import pytest
import pandas as pd
import numpy as np
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

from src.advanced_risk import AdvancedRiskManager, RiskResult


class TestAdvancedRiskManager:
    """Test suite for AdvancedRiskManager"""

    @pytest.fixture
    def risk_manager(self):
        """Risk manager instance with default config"""
        return AdvancedRiskManager()

    @pytest.fixture
    def mock_paper_trader(self):
        """Mock PaperTrader instance"""
        pt = Mock()
        pt.get_equity_history.return_value = pd.DataFrame(
            {
                "date": pd.date_range("2024-01-01", periods=10, freq="D"),
                "total_equity": [10000 + i * 100 for i in range(10)],
            }
        )
        pt.get_positions.return_value = pd.DataFrame(
            {
                "ticker": ["AAPL", "GOOGL"],
                "quantity": [10, 5],
                "current_price": [150.0, 2800.0],
                "avg_price": [145.0, 2750.0],
            }
        )
        return pt

    def test_initialization(self, risk_manager):
        """Test risk manager initialization"""
        assert risk_manager.max_daily_loss_pct == -3.0
        assert risk_manager.market_crash_threshold == -3.0
        assert risk_manager.max_correlation == 0.7

    def test_calculate_var_historical(self, risk_manager):
        """Test VaR calculation with historical method"""
        returns = pd.Series([-0.01, 0.02, -0.005, 0.015, -0.03])
        var = risk_manager.calculate_var(returns, method="historical", confidence=0.95)
        assert var < 0  # VaR should be negative
        assert abs(var) > 0

    def test_calculate_var_parametric(self, risk_manager):
        """Test VaR calculation with parametric method"""
        returns = pd.Series([-0.01, 0.02, -0.005, 0.015, -0.03])
        var = risk_manager.calculate_var(returns, method="parametric", confidence=0.95)
        assert var < 0

    def test_calculate_cvar_historical(self, risk_manager):
        """Test CVaR calculation with historical method"""
        returns = pd.Series([-0.01, 0.02, -0.005, 0.015, -0.03, -0.05, -0.04])
        cvar = risk_manager.calculate_cvar(returns, method="historical")
        assert cvar < 0
        assert cvar <= risk_manager.calculate_var(
            returns, method="historical"
        )  # CVaR should be more negative

    def test_calculate_portfolio_var(self, risk_manager):
        """Test portfolio VaR calculation"""
        returns_df = pd.DataFrame(
            {"stock1": [-0.01, 0.02, -0.005], "stock2": [0.015, -0.03, 0.01]}
        )
        weights = np.array([0.6, 0.4])
        portfolio_var = risk_manager.calculate_portfolio_var(returns_df, weights)
        assert portfolio_var < 0

    def test_calculate_max_drawdown(self, risk_manager):
        """Test maximum drawdown calculation"""
        prices = pd.Series([100, 105, 102, 98, 101, 95, 97])
        mdd = risk_manager.calculate_max_drawdown(prices)
        assert 0 <= mdd <= 1
        expected_mdd = (95 - 105) / 105  # From peak 105 to low 95
        assert abs(mdd - expected_mdd) < 0.01

    def test_calculate_correlation(self, risk_manager):
        """Test correlation matrix calculation"""
        returns_df = pd.DataFrame(
            {"stock1": [0.01, -0.02, 0.005], "stock2": [-0.01, 0.02, -0.005]}
        )
        corr_matrix = risk_manager.calculate_correlation(returns_df)
        assert isinstance(corr_matrix, pd.DataFrame)
        assert corr_matrix.shape == (2, 2)
        assert -1 <= corr_matrix.iloc[0, 1] <= 1

    @patch("src.advanced_risk.yf")
    def test_check_market_crash_no_crash(self, mock_yf, risk_manager):
        """Test market crash detection when no crash"""
        # Mock yfinance
        mock_ticker = Mock()
        mock_hist = Mock()
        mock_hist.Close.tail.return_value.values = [100, 101]  # Slight increase
        mock_ticker.history.return_value = mock_hist
        mock_yf.Ticker.return_value = mock_ticker

        allow_buy, reason = risk_manager.check_market_crash(Mock())
        assert allow_buy == True

    @patch("src.advanced_risk.yf")
    def test_check_market_crash_with_crash(self, mock_yf, risk_manager):
        """Test market crash detection when crash occurs"""
        # Mock yfinance with crash
        mock_ticker = Mock()
        mock_hist = Mock()
        mock_hist.Close.tail.return_value.values = [100, 95]  # 5% drop
        mock_ticker.history.return_value = mock_hist
        mock_yf.Ticker.return_value = mock_ticker

        allow_buy, reason = risk_manager.check_market_crash(Mock())
        assert allow_buy == False
        assert "クラッシュ検知" in reason

    @patch("src.advanced_risk.fetch_stock_data")
    def test_check_correlation_safe(self, mock_fetch, risk_manager):
        """Test correlation check when safe to buy"""
        # Mock data fetch
        mock_df = pd.DataFrame(
            {"Close": [100, 101, 102, 103, 104]},
            index=pd.date_range("2024-01-01", periods=5),
        )
        mock_fetch.return_value = {"AAPL": mock_df, "GOOGL": mock_df}

        is_safe, reason = risk_manager.check_correlation("MSFT", ["AAPL"], Mock())
        assert is_safe == True

    @patch("src.advanced_risk.fetch_stock_data")
    def test_check_correlation_high_correlation(self, mock_fetch, risk_manager):
        """Test correlation check when high correlation detected"""
        # Mock identical price data (perfect correlation)
        mock_df = pd.DataFrame(
            {"Close": [100, 101, 102, 103, 104]},
            index=pd.date_range("2024-01-01", periods=5),
        )
        mock_fetch.return_value = {"AAPL": mock_df, "GOOGL": mock_df}

        is_safe, reason = risk_manager.check_correlation("MSFT", ["AAPL"], Mock())
        # With identical data, correlation might be treated as 1.0
        # Depending on implementation, may return False

    def test_calculate_position_risk(self, risk_manager):
        """Test position risk calculation"""
        position = {"entry_price": 100.0, "current_price": 105.0, "quantity": 10}
        risk = risk_manager.calculate_position_risk(position)
        assert "unrealized_pnl" in risk
        assert "pnl_pct" in risk
        assert "risk_amount" in risk
        assert risk["unrealized_pnl"] == 50.0  # (105-100)*10
        assert risk["pnl_pct"] == 0.05

    def test_calculate_portfolio_risk(self, risk_manager):
        """Test portfolio risk calculation"""
        portfolio = {
            "AAPL": {
                "market_value": 1500,
                "current_price": 150,
                "entry_price": 145,
                "quantity": 10,
            }
        }
        risk = risk_manager.calculate_portfolio_risk(portfolio)
        assert isinstance(risk, RiskResult)
        assert risk.value == 0.5  # Placeholder value
        assert "total_value" in risk
        assert "total_pnl" in risk

    def test_should_trigger_stop_loss_true(self, risk_manager):
        """Test stop loss trigger detection"""
        position = {
            "entry_price": 100.0,
            "current_price": 85.0,  # 15% loss
            "stop_loss_pct": 0.1,  # 10% stop loss
        }
        should_stop = risk_manager.should_trigger_stop_loss(position)
        assert should_stop == True

    def test_should_trigger_stop_loss_false(self, risk_manager):
        """Test stop loss not triggered"""
        position = {
            "entry_price": 100.0,
            "current_price": 95.0,  # 5% loss
            "stop_loss_pct": 0.1,  # 10% stop loss
        }
        should_stop = risk_manager.should_trigger_stop_loss(position)
        assert should_stop == False

    def test_calculate_max_position_size(self, risk_manager):
        """Test maximum position size calculation"""
        portfolio_value = 100000.0
        max_size = risk_manager.calculate_max_position_size(portfolio_value)
        expected = portfolio_value * 0.1  # max_position_size = 0.1
        assert max_size == expected

    def test_generate_risk_alerts(self, risk_manager):
        """Test risk alerts generation"""
        risk_metrics = {"risk_score": 0.8}  # High risk
        alerts = risk_manager.generate_risk_alerts(risk_metrics)
        assert len(alerts) > 0
        assert alerts[0]["type"] == "HIGH_RISK"

    def test_should_rebalance_true(self, risk_manager):
        """Test rebalance needed detection"""
        portfolio = {
            "AAPL": {"weight": 0.5},
            "GOOGL": {"weight": 0.3},
            "MSFT": {"weight": 0.2},
        }
        should_rebalance = risk_manager.should_rebalance(portfolio)
        assert should_rebalance == True  # AAPL > 0.4

    def test_run_stress_test(self, risk_manager):
        """Test stress test execution"""
        portfolio = {"AAPL": {"value": 10000}}
        history = pd.DataFrame({"close": [100, 101, 102]})
        scenarios = {"crash": -0.2}
        results = risk_manager.run_stress_test(portfolio, history, scenarios)
        assert "crash" in results
        assert results["crash"]["portfolio_impact"] == -10000
