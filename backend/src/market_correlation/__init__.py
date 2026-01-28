"""
Market Correlation Analysis

A module for analyzing market correlation and generating composite signals.
"""

from .analyzer import MarketCorrelation
from .models import MarketTrend

__all__ = ["MarketCorrelation", "MarketTrend"]
__version__ = "0.1.0"
