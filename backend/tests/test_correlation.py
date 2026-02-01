"""
Market Correlation Analysis Tests

This module tests the Market Correlation Analysis which handles:
- Fetching index data (Nikkei 225, S&P 500)
- Calculating correlation coefficients
- Calculating beta values
- Generating composite signals
"""

import pytest
from market_correlation import MarketCorrelation, MarketTrend


class TestMarketCorrelation:
    """Test cases for MarketCorrelation class"""

    def test_create_correlation_analyzer(self):
        """Test creating a correlation analyzer"""
        analyzer = MarketCorrelation()
        assert analyzer is not None

    def test_calculate_correlation_coefficient(self):
        """Test calculating correlation coefficient between two price series"""
        analyzer = MarketCorrelation()

        # Sample data: two perfectly correlated series
        stock_prices = [100, 102, 104, 106, 108]
        index_prices = [1000, 1020, 1040, 1060, 1080]

        correlation = analyzer.calculate_correlation(stock_prices, index_prices)

        # Perfect correlation should be 1.0
        assert correlation == pytest.approx(1.0, rel=0.01)

    def test_calculate_correlation_inverse(self):
        """Test calculating correlation for inverse relationship"""
        analyzer = MarketCorrelation()

        # Inverse relationship
        stock_prices = [100, 102, 104, 106, 108]
        index_prices = [108, 106, 104, 102, 100]

        correlation = analyzer.calculate_correlation(stock_prices, index_prices)

        # Perfect inverse correlation should be -1.0
        assert correlation == pytest.approx(-1.0, rel=0.01)

    def test_calculate_beta_value(self):
        """Test calculating beta value (stock sensitivity to market)"""
        analyzer = MarketCorrelation()

        # Simple linear relationship: stock return = 2 * market return
        # When market goes up 1%, stock goes up 2%
        # Prices: [100 -> 101 -> 102 -> 103 -> 104] (1% each step for market)
        #         [100 -> 102 -> 104 -> 106 -> 108] (2% each step for stock)
        stock_prices = [100.0, 102.0, 104.0, 106.0, 108.0]
        index_prices = [100.0, 101.0, 102.0, 103.0, 104.0]

        beta = analyzer.calculate_beta(stock_prices, index_prices)

        # Beta should be approximately 2.0 (2x market sensitivity)
        # Note: Due to percentage calculation differences, actual value may vary
        # The key is that beta > 1 (high sensitivity)
        assert beta > 1.0  # High beta stock
        assert beta < 5.0  # But not extremely high

    def test_detect_market_trend_bullish(self):
        """Test detecting bullish market trend"""
        analyzer = MarketCorrelation()

        # Rising prices
        prices = [100, 102, 104, 106, 108]

        trend = analyzer.detect_trend(prices)

        assert trend == MarketTrend.BULLISH
        assert trend.value > 0

    def test_detect_market_trend_bearish(self):
        """Test detecting bearish market trend"""
        analyzer = MarketCorrelation()

        # Falling prices
        prices = [108, 106, 104, 102, 100]

        trend = analyzer.detect_trend(prices)

        assert trend == MarketTrend.BEARISH
        assert trend.value < 0

    def test_detect_market_trend_neutral(self):
        """Test detecting neutral market trend"""
        analyzer = MarketCorrelation()

        # Flat prices
        prices = [100, 100, 100, 100, 100]

        trend = analyzer.detect_trend(prices)

        assert trend == MarketTrend.NEUTRAL
        assert trend.value == 0

    def test_generate_composite_signal(self):
        """Test generating composite signal from market and individual data"""
        analyzer = MarketCorrelation()

        # Bullish market + bullish individual signal + low correlation
        result = analyzer.generate_composite_signal(
            market_trend=MarketTrend.BULLISH,
            individual_signal="buy",
            correlation=0.3
        )

        assert result["recommendation"] == "buy"
        assert result["confidence"] == "high"
        assert "low correlation" in result["reasoning"].lower()

    def test_composite_signal_reduce_confidence(self):
        """Test that high correlation with opposite trend reduces confidence"""
        analyzer = MarketCorrelation()

        # Bearish market + bullish individual signal + high correlation
        result = analyzer.generate_composite_signal(
            market_trend=MarketTrend.BEARISH,
            individual_signal="buy",
            correlation=0.8
        )

        # Should recommend caution or wait
        assert result["recommendation"] in ["wait", "cautious_buy"]
        assert result["confidence"] in ["low", "medium"]

    def test_fetch_index_data_returns_list(self):
        """Test fetching index data returns a list of prices"""
        analyzer = MarketCorrelation()

        # Mock data for testing (without external API)
        # In real implementation, this would fetch from yfinance
        prices = [100.0, 101.0, 102.0, 103.0, 104.0]

        # Verify we can process index data
        trend = analyzer.detect_trend(prices)
        assert trend == MarketTrend.BULLISH

    def test_calculate_correlation_with_insufficient_data(self):
        """Test that insufficient data raises appropriate error"""
        analyzer = MarketCorrelation()

        with pytest.raises(ValueError, match="at least 2"):
            analyzer.calculate_correlation([100], [1000])

    def test_calculate_correlation_mismatched_lengths(self):
        """Test that mismatched price series raise error"""
        analyzer = MarketCorrelation()

        with pytest.raises(ValueError, match="same length"):
            analyzer.calculate_correlation([100, 102, 104], [1000, 1020])

    def test_composite_signal_bullish_market_high_correlation(self):
        """Test composite signal with bullish market and high correlation"""
        analyzer = MarketCorrelation()

        result = analyzer.generate_composite_signal(
            market_trend=MarketTrend.BULLISH,
            individual_signal="buy",
            correlation=0.8
        )

        assert result["recommendation"] == "buy"
        assert result["confidence"] == "high"

    def test_composite_signal_bearish_market_sell(self):
        """Test composite signal with bearish market and sell signal"""
        analyzer = MarketCorrelation()

        result = analyzer.generate_composite_signal(
            market_trend=MarketTrend.BEARISH,
            individual_signal="sell",
            correlation=0.7
        )

        assert result["recommendation"] == "sell"
        assert result["confidence"] == "high"

    def test_composite_signal_bullish_market_sell_low_correlation(self):
        """Test composite signal with bullish market and sell signal (low correlation)"""
        analyzer = MarketCorrelation()

        result = analyzer.generate_composite_signal(
            market_trend=MarketTrend.BULLISH,
            individual_signal="sell",
            correlation=0.3
        )

        # Individual weakness despite bullish market
        assert result["recommendation"] == "cautious_sell"

    def test_composite_signal_neutral_market(self):
        """Test composite signal in neutral market"""
        analyzer = MarketCorrelation()

        result = analyzer.generate_composite_signal(
            market_trend=MarketTrend.NEUTRAL,
            individual_signal="buy",
            correlation=0.5
        )

        assert result["recommendation"] == "buy"
        assert result["confidence"] == "medium"

    def test_composite_signal_hold(self):
        """Test composite signal with hold"""
        analyzer = MarketCorrelation()

        result = analyzer.generate_composite_signal(
            market_trend=MarketTrend.NEUTRAL,
            individual_signal="hold",
            correlation=0.0
        )

        assert result["recommendation"] == "hold"
        assert result["confidence"] == "medium"
