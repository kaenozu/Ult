"""
Unit tests for ExecutionEngine class
"""

import pytest
import json
import tempfile
import os
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

from src.execution.execution_engine import ExecutionEngine
from src.paper_trader import PaperTrader


class TestExecutionEngine:
    """Test suite for ExecutionEngine"""

    @pytest.fixture
    def mock_paper_trader(self):
        """Mock PaperTrader instance"""
        pt = Mock(spec=PaperTrader)
        pt.get_current_balance.return_value = {
            "cash": 100000.0,
            "invested_amount": 50000.0,
            "total_equity": 150000.0,
        }
        pt.get_positions.return_value = pd.DataFrame(
            {
                "ticker": ["AAPL"],
                "quantity": [10],
                "avg_price": [150.0],
                "current_price": [155.0],
            }
        )
        pt.execute_trade.return_value = True
        return pt

    @pytest.fixture
    def temp_config_file(self):
        """Create temporary config file"""
        config = {
            "auto_trading": {"scenario": "neutral", "max_position_size_pct": 0.20},
            "mini_stock": {"enabled": False},
        }
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            json.dump(config, f)
            return f.name

    @pytest.fixture
    def execution_engine(self, mock_paper_trader, temp_config_file):
        """ExecutionEngine instance"""
        engine = ExecutionEngine(mock_paper_trader, config_path=temp_config_file)
        yield engine
        # Cleanup
        os.unlink(temp_config_file)

    def test_initialization(self, execution_engine):
        """Test engine initialization"""
        assert execution_engine.scenario == "neutral"
        assert execution_engine.max_position_size_pct == 0.20
        assert execution_engine.max_drawdown_limit == 0.15

    def test_scenario_presets(self, execution_engine):
        """Test scenario preset loading"""
        assert "conservative" in execution_engine.scenario_presets
        assert "neutral" in execution_engine.scenario_presets
        assert "aggressive" in execution_engine.scenario_presets

        # Test conservative preset
        conservative = execution_engine.scenario_presets["conservative"]
        assert conservative["max_position_size_pct"] == 0.10
        assert conservative["max_drawdown_limit"] == 0.10

    def test_set_scenario(self, execution_engine):
        """Test scenario setting"""
        execution_engine.set_scenario("aggressive")
        assert execution_engine.scenario == "aggressive"
        assert execution_engine.max_position_size_pct == 0.30
        assert execution_engine.max_drawdown_limit == 0.20

    def test_set_scenario_invalid(self, execution_engine):
        """Test invalid scenario setting"""
        with pytest.raises(ValueError):
            execution_engine.set_scenario("invalid_scenario")

    def test_get_position_size_basic(self, execution_engine, mock_paper_trader):
        """Test basic position size calculation"""
        size = execution_engine.get_position_size("AAPL", 100.0, mock_paper_trader)
        assert size > 0
        # Should be limited by max_position_size_pct
        max_size = 150000.0 * 0.20  # 20% of equity
        assert size <= max_size / 100.0  # Convert to quantity

    def test_get_position_size_existing_position(
        self, execution_engine, mock_paper_trader
    ):
        """Test position size with existing position"""
        size = execution_engine.get_position_size("AAPL", 100.0, mock_paper_trader)
        # Should account for existing position
        assert size >= 0

    def test_validate_trade_success(self, execution_engine, mock_paper_trader):
        """Test successful trade validation"""
        trade_request = {
            "ticker": "AAPL",
            "action": "BUY",
            "quantity": 10,
            "price": 150.0,
        }

        is_valid, reason = execution_engine.validate_trade(
            trade_request, mock_paper_trader
        )
        assert is_valid == True
        assert reason == "Trade validated successfully"

    def test_validate_trade_insufficient_cash(
        self, execution_engine, mock_paper_trader
    ):
        """Test trade validation with insufficient cash"""
        trade_request = {
            "ticker": "AAPL",
            "action": "BUY",
            "quantity": 1000,  # Large quantity
            "price": 150.0,
        }

        is_valid, reason = execution_engine.validate_trade(
            trade_request, mock_paper_trader
        )
        assert is_valid == False
        assert "insufficient" in reason.lower()

    def test_validate_trade_invalid_ticker(self, execution_engine, mock_paper_trader):
        """Test trade validation with invalid ticker"""
        trade_request = {"ticker": "", "action": "BUY", "quantity": 10, "price": 150.0}

        is_valid, reason = execution_engine.validate_trade(
            trade_request, mock_paper_trader
        )
        assert is_valid == False

    def test_execute_trade_success(self, execution_engine, mock_paper_trader):
        """Test successful trade execution"""
        trade_request = {
            "ticker": "AAPL",
            "action": "BUY",
            "quantity": 10,
            "price": 150.0,
            "strategy": "test",
        }

        result = execution_engine.execute_trade(trade_request)

        assert result["success"] == True
        assert "executed" in result["message"].lower()
        mock_paper_trader.execute_trade.assert_called_once()

    def test_execute_trade_validation_failure(
        self, execution_engine, mock_paper_trader
    ):
        """Test trade execution with validation failure"""
        trade_request = {
            "ticker": "AAPL",
            "action": "BUY",
            "quantity": 10000,  # Too large
            "price": 150.0,
        }

        result = execution_engine.execute_trade(trade_request)

        assert result["success"] == False
        assert "insufficient" in result["message"].lower()

    @patch("src.execution.execution_engine.quick_health_check")
    def test_health_check(self, mock_health, execution_engine):
        """Test health check functionality"""
        mock_health.return_value = True
        is_healthy = execution_engine.health_check()
        assert is_healthy == True

    def test_get_exposure_limits(self, execution_engine):
        """Test exposure limits retrieval"""
        limits = execution_engine.get_exposure_limits()
        assert "max_per_ticker_pct" in limits
        assert "max_per_sector_pct" in limits
        assert limits["max_per_ticker_pct"] == 0.25

    def test_calculate_sector_exposure(self, execution_engine):
        """Test sector exposure calculation"""
        positions = {
            "AAPL": {"quantity": 10, "current_price": 150.0, "sector": "Technology"},
            "GOOGL": {"quantity": 5, "current_price": 2800.0, "sector": "Technology"},
            "JPM": {"quantity": 20, "current_price": 120.0, "sector": "Financial"},
        }

        exposure = execution_engine.calculate_sector_exposure(positions)

        assert "Technology" in exposure
        assert "Financial" in exposure
        assert exposure["Technology"] > 0
        assert exposure["Financial"] > 0

    def test_check_drawdown_limits(self, execution_engine, mock_paper_trader):
        """Test drawdown limit checking"""
        # Mock equity history with significant drawdown
        mock_paper_trader.get_equity_history.return_value = pd.DataFrame(
            {
                "total_equity": [150000, 140000, 130000, 125000]  # >15% drawdown
            }
        )

        should_stop = execution_engine.check_drawdown_limits(mock_paper_trader)
        assert should_stop == True

    def test_check_drawdown_limits_safe(self, execution_engine, mock_paper_trader):
        """Test drawdown limit checking when safe"""
        # Mock equity history within limits
        mock_paper_trader.get_equity_history.return_value = pd.DataFrame(
            {
                "total_equity": [150000, 148000, 147000, 146000]  # <15% drawdown
            }
        )

        should_stop = execution_engine.check_drawdown_limits(mock_paper_trader)
        assert should_stop == False

    @patch("src.execution.execution_engine.fetch_fundamental_data")
    def test_get_fundamental_data(self, mock_fetch, execution_engine):
        """Test fundamental data fetching"""
        mock_fetch.return_value = {"pe_ratio": 15.5, "market_cap": 2000000000}

        data = execution_engine.get_fundamental_data("AAPL")
        assert "pe_ratio" in data
        assert data["pe_ratio"] == 15.5

    @patch("src.execution.execution_engine.fetch_external_data")
    def test_get_external_signals(self, mock_fetch, execution_engine):
        """Test external signal fetching"""
        mock_fetch.return_value = {"sentiment": 0.7, "news_score": 0.8}

        signals = execution_engine.get_external_signals("AAPL")
        assert "sentiment" in signals
        assert signals["sentiment"] == 0.7

    def test_update_risk_parameters(self, execution_engine):
        """Test risk parameter updates"""
        new_params = {"max_position_size_pct": 0.15, "max_drawdown_limit": 0.12}

        execution_engine.update_risk_parameters(new_params)

        assert execution_engine.max_position_size_pct == 0.15
        assert execution_engine.max_drawdown_limit == 0.12

    def test_get_trading_stats(self, execution_engine, mock_paper_trader):
        """Test trading statistics retrieval"""
        stats = execution_engine.get_trading_stats(mock_paper_trader)

        assert isinstance(stats, dict)
        assert "total_trades" in stats
        assert "win_rate" in stats
        assert "total_pnl" in stats

    def test_mini_stock_configuration(self, execution_engine):
        """Test mini stock configuration loading"""
        assert hasattr(execution_engine, "mini_stock_enabled")
        assert hasattr(execution_engine, "mini_stock_config")
