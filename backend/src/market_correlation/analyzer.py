"""
Market Correlation Analyzer

Analyzes correlation between individual stocks and market indices.
"""

import math
import statistics
import numpy as np
from typing import List, Dict, Any
from .models import MarketTrend
from backend.src.cache.cache_manager import cached

# Constants for trend detection
MIN_DATA_POINTS = 5
TREND_DETECTION_THRESHOLD = 0.0005  # 0.05% change per step (approx 1% over 20 days)

# Constants for correlation-based signal generation
LOW_CORRELATION_THRESHOLD = 0.4
HIGH_CORRELATION_THRESHOLD = 0.6


class MarketCorrelation:
    """Analyzes market correlation and generates composite signals"""

    @cached(ttl=60, max_size=500)
    def calculate_correlation(self, stock_prices: List[float], index_prices: List[float]) -> float:
        """Calculate Pearson correlation coefficient using numpy vectorization

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

        # Convert to numpy arrays for vectorized operations
        stock_arr = np.array(stock_prices, dtype=np.float64)
        index_arr = np.array(index_prices, dtype=np.float64)

        # Use numpy's optimized correlation coefficient function
        correlation_matrix = np.corrcoef(stock_arr, index_arr)
        
        # Prevent division by zero: if no price variation, correlation is undefined (return 0.0)
        # This handles cases where all prices are identical (zero standard deviation)
        if np.isnan(correlation_matrix[0, 1]):
            return 0.0

        return correlation_matrix[0, 1]

    @cached(ttl=60, max_size=500)
    def calculate_beta(self, stock_prices: List[float], index_prices: List[float]) -> float:
        """Calculate beta value using numpy vectorization

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

        # Convert to numpy arrays for vectorized operations
        stock_arr = np.array(stock_prices, dtype=np.float64)
        index_arr = np.array(index_prices, dtype=np.float64)

        # Calculate returns using numpy vectorization
        stock_returns = np.diff(stock_arr) / stock_arr[:-1]
        index_returns = np.diff(index_arr) / index_arr[:-1]

        if len(stock_returns) != len(index_returns):
            raise ValueError("Returns calculation error")

        n = len(stock_returns)
        if n < 2:
            return 1.0

        # Calculate means using numpy
        stock_mean = np.mean(stock_returns)
        index_mean = np.mean(index_returns)

        # Calculate covariance and variance using numpy vectorization
        covariance = np.mean((stock_returns - stock_mean) * (index_returns - index_mean))
        variance = np.var(index_returns)

        # Prevent division by zero: if market has no movement, beta is neutral (1.0)
        # This handles cases where index prices are flat (zero variance)
        if variance == 0:
            return 1.0

        return covariance / variance

    @cached(ttl=120, max_size=500)
    def detect_trend(self, prices: List[float]) -> MarketTrend:
        """Detect market trend using numpy vectorization for linear regression

        Args:
            prices: List of prices (oldest to newest)

        Returns:
            MarketTrend enum value
        """
        if len(prices) < MIN_DATA_POINTS:
            return MarketTrend.NEUTRAL

        # Convert to numpy array for vectorized operations
        prices_arr = np.array(prices, dtype=np.float64)
        n = len(prices_arr)
        
        # Create x values (0, 1, 2, ..., n-1)
        x = np.arange(n)

        # Use numpy's polyfit for linear regression (more optimized)
        # Returns coefficients [slope, intercept]
        coeffs = np.polyfit(x, prices_arr, 1)
        slope = coeffs[0]

        # Normalize slope by dividing by average price to get percentage change per step
        avg_price = np.mean(prices_arr)
        
        # Prevent division by zero: if average price is zero, cannot normalize
        # Return neutral trend as percentage change is undefined
        if avg_price == 0:
            return MarketTrend.NEUTRAL

        normalized_slope = slope / avg_price

        threshold = TREND_DETECTION_THRESHOLD

        if normalized_slope > threshold:
            return MarketTrend.BULLISH
        elif normalized_slope < -threshold:
            return MarketTrend.BEARISH
        else:
            return MarketTrend.NEUTRAL

    @cached(ttl=30, max_size=500)
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
                if correlation < LOW_CORRELATION_THRESHOLD:
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
                if correlation > HIGH_CORRELATION_THRESHOLD:
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
                if correlation < LOW_CORRELATION_THRESHOLD:
                    base_rec = "sell"
                    confidence = "high"
                    reasoning = "Bearish market with individual weakness (low correlation)"
                else:
                    base_rec = "sell"
                    confidence = "high"
                    reasoning = "Bearish market supporting individual signal"
            elif market_trend == MarketTrend.BULLISH:
                if correlation > HIGH_CORRELATION_THRESHOLD:
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
            "market_trend": str(market_trend),
            "individual_signal": individual_signal,
            "correlation": correlation
        }



            "market_trend": str(market_trend),
            "individual_signal": individual_signal,
            "correlation": correlation
        }



        }

            "reasoning": reasoning,
            "market_trend": str(market_trend),
            "individual_signal": individual_signal,
            "correlation": correlation
        }
            "market_trend": str(market_trend),
            "individual_signal": individual_signal,
            "correlation": correlation
        }


