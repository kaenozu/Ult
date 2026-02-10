"""
Market Correlation Analyzer

Analyzes correlation between individual stocks and market indices.
Optimized with NumPy for high-performance calculations.
"""

import math
import statistics
from typing import List, Dict, Any, Tuple
from .models import MarketTrend

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False

# Constants for trend detection
MIN_DATA_POINTS = 5
TREND_DETECTION_THRESHOLD = 0.0005  # 0.05% change per step

# Constants for correlation thresholds
CORR_LOW = 0.4
CORR_HIGH = 0.6


class MarketCorrelation:
    """Analyzes market correlation and generates composite signals"""

    def calculate_correlation(self, stock_prices: List[float], index_prices: List[float]) -> float:
        """Calculate Pearson correlation coefficient"""
        if len(stock_prices) != len(index_prices):
            raise ValueError("Price series must have the same length")
        if len(stock_prices) < 2:
            raise ValueError("at least 2 data points are required for correlation calculation")

        if HAS_NUMPY:
            return float(np.corrcoef(stock_prices, index_prices)[0, 1])
        
        # Fallback to pure Python
        stock_mean = statistics.mean(stock_prices)
        index_mean = statistics.mean(index_prices)
        numerator = sum((s - stock_mean) * (i - index_mean) for s, i in zip(stock_prices, index_prices))
        stock_std = math.sqrt(sum((s - stock_mean) ** 2 for s in stock_prices))
        index_std = math.sqrt(sum((i - index_mean) ** 2 for i in index_prices))

        return numerator / (stock_std * index_std) if stock_std * index_std != 0 else 0.0

    def calculate_beta(self, stock_prices: List[float], index_prices: List[float]) -> float:
        """Calculate beta value (stock sensitivity to market) using NumPy if available"""
        if len(stock_prices) != len(index_prices) or len(stock_prices) < 2:
            return 1.0

        if HAS_NUMPY:
            s_arr = np.array(stock_prices)
            i_arr = np.array(index_prices)
            s_returns = np.diff(s_arr) / s_arr[:-1]
            i_returns = np.diff(i_arr) / i_arr[:-1]
            
            if np.any(np.isnan(s_returns)) or np.any(np.isnan(i_returns)):
                return 1.0
                
            covariance = np.cov(s_returns, i_returns)[0, 1]
            variance = np.var(i_returns, ddof=1)  # Use sample variance to match np.cov's default ddof=1
            return float(covariance / variance) if variance != 0 else 1.0

        # Fallback to statistics-based calculation
        s_ret = [(stock_prices[j] - stock_prices[j-1]) / stock_prices[j-1] for j in range(1, len(stock_prices))]
        i_ret = [(index_prices[j] - index_prices[j-1]) / index_prices[j-1] for j in range(1, len(index_prices))]
        
        try:
            return statistics.covariance(s_ret, i_ret) / statistics.variance(i_ret)
        except (statistics.StatisticsError, ZeroDivisionError):
            return 1.0

    def detect_trend(self, prices: List[float]) -> MarketTrend:
        """Detect market trend using linear regression slope"""
        if len(prices) < MIN_DATA_POINTS:
            return MarketTrend.NEUTRAL

        if HAS_NUMPY:
            y = np.array(prices)
            x = np.arange(len(y))
            slope, _ = np.polyfit(x, y, 1)
            normalized_slope = slope / np.mean(y)
        else:
            n = len(prices)
            x = list(range(n))
            sum_x = sum(x)
            sum_y = sum(prices)
            sum_xy = sum(xi * yi for xi, yi in zip(x, prices))
            sum_xx = sum(xi**2 for xi in x)
            slope = (n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x**2)
            normalized_slope = slope / (sum_y / n)

        if normalized_slope > TREND_DETECTION_THRESHOLD:
            return MarketTrend.BULLISH
        if normalized_slope < -TREND_DETECTION_THRESHOLD:
            return MarketTrend.BEARISH
        return MarketTrend.NEUTRAL

    def generate_composite_signal(
        self,
        market_trend: MarketTrend,
        individual_signal: str,
        correlation: float
    ) -> Dict[str, Any]:
        """Generate composite trading signal using a rule-based decision logic"""
        sig = individual_signal.lower()
        
        # Decision Table Logic
        # (Signal, Trend) -> (Recommendation, Confidence, Reasoning)
        RULES = {
            ("buy", MarketTrend.BULLISH): ("buy", "high", "Bullish market supporting signal"),
            ("buy", MarketTrend.BEARISH): ("cautious_buy" if correlation < CORR_LOW else "wait", "low", 
                                          "Individual strength despite bearish market" if correlation < CORR_LOW else "Bearish market override"),
            ("sell", MarketTrend.BEARISH): ("sell", "high", "Bearish market supporting signal"),
            ("sell", MarketTrend.BULLISH): ("cautious_sell" if correlation < CORR_LOW else "wait", "low",
                                           "Individual weakness despite bullish market" if correlation < CORR_LOW else "Bullish market override"),
        }

        rec, conf, reason = RULES.get((sig, market_trend), (sig, "medium", "No market alignment override"))

        # Stock-specific catalyst detection
        if sig == "buy" and market_trend == MarketTrend.BULLISH and correlation < CORR_LOW:
            reason = "Low correlation - strong individual strength"

        return {
            "recommendation": rec,
            "confidence": conf,
            "reasoning": reason,
            "market_trend": str(market_trend),
            "individual_signal": sig,
            "correlation": correlation
        }