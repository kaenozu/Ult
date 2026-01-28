"""
Market Correlation Analyzer

Analyzes correlation between individual stocks and market indices.
"""

import math
import statistics
from typing import List, Dict, Any
from .models import MarketTrend


class MarketCorrelation:
    """Analyzes market correlation and generates composite signals"""

    def calculate_correlation(self, stock_prices: List[float], index_prices: List[float]) -> float:
        """Calculate Pearson correlation coefficient

        Args:
            stock_prices: List of stock prices
            index_prices: List of index prices

        Returns:
            Correlation coefficient (-1 to 1)
        """
        if len(stock_prices) != len(index_prices):
            raise ValueError("Price series must have the same length")
        if len(stock_prices) < 2:
            raise ValueError("Need at least 2 data points")

        n = len(stock_prices)

        # Calculate means
        stock_mean = statistics.mean(stock_prices)
        index_mean = statistics.mean(index_prices)

        # Calculate correlation
        numerator = sum((s - stock_mean) * (i - index_mean) for s, i in zip(stock_prices, index_prices))
        stock_std = math.sqrt(sum((s - stock_mean) ** 2 for s in stock_prices))
        index_std = math.sqrt(sum((i - index_mean) ** 2 for i in index_prices))

        if stock_std == 0 or index_std == 0:
            return 0.0

        return numerator / (stock_std * index_std)

    def calculate_beta(self, stock_prices: List[float], index_prices: List[float]) -> float:
        """Calculate beta value (stock sensitivity to market)

        Args:
            stock_prices: List of stock prices
            index_prices: List of index prices

        Returns:
            Beta value (sensitivity to market movements)
        """
        if len(stock_prices) != len(index_prices):
            raise ValueError("Price series must have the same length")
        if len(stock_prices) < 2:
            raise ValueError("Need at least 2 data points")

        # Calculate returns
        stock_returns = [(stock_prices[i] - stock_prices[i-1]) / stock_prices[i-1]
                         for i in range(1, len(stock_prices))]
        index_returns = [(index_prices[i] - index_prices[i-1]) / index_prices[i-1]
                         for i in range(1, len(index_prices))]

        if len(stock_returns) != len(index_returns):
            raise ValueError("Returns calculation error")

        n = len(stock_returns)
        if n < 2:
            return 1.0

        # Calculate means
        stock_mean = statistics.mean(stock_returns)
        index_mean = statistics.mean(index_returns)

        # Calculate covariance (population)
        covariance = sum((s - stock_mean) * (i - index_mean) for s, i in zip(stock_returns, index_returns)) / n

        # Calculate variance (population)
        variance = sum((i - index_mean) ** 2 for i in index_returns) / n

        if variance == 0:
            return 1.0  # No market movement, beta is neutral

        return covariance / variance

    def detect_trend(self, prices: List[float]) -> MarketTrend:
        """Detect market trend from price series

        Args:
            prices: List of prices (oldest to newest)

        Returns:
            MarketTrend enum value
        """
        if len(prices) < 2:
            return MarketTrend.NEUTRAL

        # Calculate percentage change from oldest to newest
        oldest = prices[0]
        newest = prices[-1]

        if oldest == 0:
            return MarketTrend.NEUTRAL

        change_pct = (newest - oldest) / oldest

        # Threshold: 1% change required for trend
        if change_pct > 0.01:
            return MarketTrend.BULLISH
        elif change_pct < -0.01:
            return MarketTrend.BEARISH
        else:
            return MarketTrend.NEUTRAL

    def generate_composite_signal(
        self,
        market_trend: MarketTrend,
        individual_signal: str,
        correlation: float
    ) -> Dict[str, Any]:
        """Generate composite trading signal

        Args:
            market_trend: Current market trend
            individual_signal: Individual stock signal ("buy", "sell", "hold")
            correlation: Correlation coefficient (-1 to 1)

        Returns:
            Dictionary with recommendation and reasoning
        """
        # Normalize individual signal
        individual_signal = individual_signal.lower()

        # Determine base recommendation
        base_rec = individual_signal
        confidence = "medium"

        # Adjust based on market trend
        if individual_signal == "buy":
            if market_trend == MarketTrend.BULLISH:
                if correlation < 0.4:
                    # Bullish market + buy signal + low correlation = strong buy
                    base_rec = "buy"
                    confidence = "high"
                    reasoning = "Bullish market with individual strength (low correlation = stock-specific catalyst)"
                else:
                    # Bullish market + buy signal + high correlation = buy
                    base_rec = "buy"
                    confidence = "high"
                    reasoning = "Bullish market supporting individual signal"
            elif market_trend == MarketTrend.BEARISH:
                if correlation > 0.6:
                    # Bearish market + buy signal + high correlation = caution
                    base_rec = "wait"
                    confidence = "low"
                    reasoning = "Bearish market overriding individual signal (high correlation)"
                else:
                    # Bearish market + buy signal + low correlation = cautious buy
                    base_rec = "cautious_buy"
                    confidence = "low"
                    reasoning = "Individual strength despite bearish market (low correlation)"
            else:
                # Neutral market
                base_rec = "buy"
                confidence = "medium"
                reasoning = "Individual signal in neutral market"

        elif individual_signal == "sell":
            if market_trend == MarketTrend.BEARISH:
                if correlation < 0.4:
                    base_rec = "sell"
                    confidence = "high"
                    reasoning = "Bearish market with individual weakness (low correlation)"
                else:
                    base_rec = "sell"
                    confidence = "high"
                    reasoning = "Bearish market supporting individual signal"
            elif market_trend == MarketTrend.BULLISH:
                if correlation > 0.6:
                    base_rec = "wait"
                    confidence = "low"
                    reasoning = "Bullish market overriding individual signal (high correlation)"
                else:
                    base_rec = "cautious_sell"
                    confidence = "low"
                    reasoning = "Individual weakness despite bullish market (low correlation)"
            else:
                base_rec = "sell"
                confidence = "medium"
                reasoning = "Individual signal in neutral market"

        else:  # hold
            base_rec = "hold"
            confidence = "medium"
            reasoning = "No clear signal"

        return {
            "recommendation": base_rec,
            "confidence": confidence,
            "reasoning": reasoning,
            "market_trend": str(market_trend),
            "individual_signal": individual_signal,
            "correlation": correlation
        }
