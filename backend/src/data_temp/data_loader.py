"""
Data Loader Module
Provides functions for fetching stock data, market data, and other financial data.
"""
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)

# Simple in-memory cache
_cache: Dict[str, Any] = {}
_cache_timestamps: Dict[str, datetime] = {}
CACHE_TTL = 300  # 5 minutes


def _is_cache_valid(key: str) -> bool:
    """Check if cache entry is still valid."""
    if key not in _cache_timestamps:
        return False
    return (datetime.now() - _cache_timestamps[key]).total_seconds() < CACHE_TTL


def fetch_stock_data(tickers: List[str], period: str = "1y", interval: str = "1d") -> Dict[str, pd.DataFrame]:
    """
    Fetch historical stock data for given tickers.
    
    Args:
        tickers: List of stock ticker symbols
        period: Time period (e.g., "1y", "6mo", "1mo")
        interval: Data interval (e.g., "1d", "1h")
    
    Returns:
        Dictionary mapping ticker to DataFrame with OHLCV data
    """
    try:
        import yfinance as yf
        
        result = {}
        for ticker in tickers:
            cache_key = f"stock_{ticker}_{period}_{interval}"
            
            if _is_cache_valid(cache_key):
                result[ticker] = _cache[cache_key]
                continue
            
            try:
                stock = yf.Ticker(ticker)
                df = stock.history(period=period, interval=interval)
                
                if df is not None and not df.empty:
                    # Standardize column names
                    df.columns = [c.lower() for c in df.columns]
                    result[ticker] = df
                    _cache[cache_key] = df
                    _cache_timestamps[cache_key] = datetime.now()
            except Exception as e:
                logger.warning(f"Failed to fetch data for {ticker}: {e}")
                result[ticker] = pd.DataFrame()
        
        return result
    except ImportError:
        logger.error("yfinance not installed")
        return {t: pd.DataFrame() for t in tickers}


def get_latest_price(ticker: str) -> Optional[float]:
    """
    Get the latest price for a single ticker.
    
    Args:
        ticker: Stock ticker symbol
    
    Returns:
        Latest price or None if not available
    """
    try:
        import yfinance as yf
        
        stock = yf.Ticker(ticker)
        hist = stock.history(period="1d")
        
        if hist is not None and not hist.empty:
            return float(hist['Close'].iloc[-1])
        return None
    except Exception as e:
        logger.error(f"Failed to get latest price for {ticker}: {e}")
        return None


def fetch_macro_data(period: str = "1y") -> Dict[str, pd.DataFrame]:
    """
    Fetch macroeconomic indicators data.
    
    Args:
        period: Time period for data
    
    Returns:
        Dictionary with macro indicator DataFrames
    """
    try:
        import yfinance as yf
        
        # Common macro indicators (ETFs/Indices as proxies)
        indicators = {
            "SPY": "S&P 500",
            "TLT": "Long-term Treasuries",
            "GLD": "Gold",
            "VIX": "^VIX",  # Volatility Index
            "DXY": "DX-Y.NYB",  # US Dollar Index
        }
        
        result = {}
        for name, ticker in indicators.items():
            try:
                data = yf.Ticker(ticker).history(period=period)
                if data is not None and not data.empty:
                    data.columns = [c.lower() for c in data.columns]
                    result[name] = data
            except Exception as e:
                logger.warning(f"Failed to fetch macro data for {name}: {e}")
        
        return result
    except ImportError:
        logger.error("yfinance not installed")
        return {}


def fetch_external_data(period: str = "3mo") -> Dict[str, Any]:
    """
    Fetch external market data like VIX, indices, etc.
    
    Args:
        period: Time period for data
    
    Returns:
        Dictionary with external market data
    """
    try:
        import yfinance as yf
        
        external_tickers = {
            "vix": "^VIX",
            "sp500": "^GSPC",
            "nasdaq": "^IXIC",
            "dji": "^DJI",
        }
        
        result = {}
        for name, ticker in external_tickers.items():
            try:
                data = yf.Ticker(ticker).history(period=period)
                if data is not None and not data.empty:
                    data.columns = [c.lower() for c in data.columns]
                    result[name] = data
                    # Add latest value for convenience
                    result[f"{name}_latest"] = float(data['close'].iloc[-1]) if not data.empty else None
            except Exception as e:
                logger.warning(f"Failed to fetch external data for {name}: {e}")
        
        return result
    except ImportError:
        logger.error("yfinance not installed")
        return {}


def fetch_fundamental_data(ticker: str) -> Dict[str, Any]:
    """
    Fetch fundamental data for a ticker.
    
    Args:
        ticker: Stock ticker symbol
    
    Returns:
        Dictionary with fundamental metrics
    """
    try:
        import yfinance as yf
        
        stock = yf.Ticker(ticker)
        info = stock.info
        
        return {
            "pe_ratio": info.get("trailingPE"),
            "pb_ratio": info.get("priceToBook"),
            "market_cap": info.get("marketCap"),
            "dividend_yield": info.get("dividendYield"),
            "eps": info.get("trailingEps"),
            "revenue": info.get("totalRevenue"),
            "profit_margin": info.get("profitMargins"),
            "debt_to_equity": info.get("debtToEquity"),
            "roe": info.get("returnOnEquity"),
            "roa": info.get("returnOnAssets"),
            "sector": info.get("sector"),
            "industry": info.get("industry"),
        }
    except Exception as e:
        logger.error(f"Failed to fetch fundamental data for {ticker}: {e}")
        return {}


def fetch_earnings_dates(tickers: List[str]) -> Dict[str, Optional[datetime]]:
    """
    Fetch upcoming earnings dates for tickers.
    
    Args:
        tickers: List of stock ticker symbols
    
    Returns:
        Dictionary mapping ticker to earnings date
    """
    try:
        import yfinance as yf
        
        result = {}
        for ticker in tickers:
            try:
                stock = yf.Ticker(ticker)
                calendar = stock.calendar
                if calendar is not None and not calendar.empty:
                    earnings_date = calendar.get('Earnings Date')
                    if earnings_date is not None and len(earnings_date) > 0:
                        result[ticker] = earnings_date[0]
                    else:
                        result[ticker] = None
                else:
                    result[ticker] = None
            except Exception as e:
                logger.warning(f"Failed to fetch earnings date for {ticker}: {e}")
                result[ticker] = None
        
        return result
    except ImportError:
        logger.error("yfinance not installed")
        return {t: None for t in tickers}


def fetch_realtime_data(tickers: List[str]) -> Dict[str, Dict[str, Any]]:
    """
    Fetch real-time (or near real-time) data for tickers.
    
    Args:
        tickers: List of stock ticker symbols
    
    Returns:
        Dictionary with real-time data per ticker
    """
    try:
        import yfinance as yf
        
        result = {}
        for ticker in tickers:
            try:
                stock = yf.Ticker(ticker)
                info = stock.info
                
                result[ticker] = {
                    "price": info.get("currentPrice") or info.get("regularMarketPrice"),
                    "bid": info.get("bid"),
                    "ask": info.get("ask"),
                    "volume": info.get("volume") or info.get("regularMarketVolume"),
                    "day_high": info.get("dayHigh") or info.get("regularMarketDayHigh"),
                    "day_low": info.get("dayLow") or info.get("regularMarketDayLow"),
                    "change": info.get("regularMarketChange"),
                    "change_percent": info.get("regularMarketChangePercent"),
                }
            except Exception as e:
                logger.warning(f"Failed to fetch realtime data for {ticker}: {e}")
                result[ticker] = {}
        
        return result
    except ImportError:
        logger.error("yfinance not installed")
        return {t: {} for t in tickers}


class DataLoader:
    """
    Unified data loader class for fetching various types of financial data.
    """
    
    def __init__(self, cache_ttl: int = 300):
        self.cache_ttl = cache_ttl
        self._cache: Dict[str, Any] = {}
        self._timestamps: Dict[str, datetime] = {}
    
    def fetch_stock_data(self, tickers: List[str], period: str = "1y") -> Dict[str, pd.DataFrame]:
        return fetch_stock_data(tickers, period)
    
    def get_latest_price(self, ticker: str) -> Optional[float]:
        return get_latest_price(ticker)
    
    def fetch_macro_data(self, period: str = "1y") -> Dict[str, pd.DataFrame]:
        return fetch_macro_data(period)
    
    def fetch_external_data(self, period: str = "3mo") -> Dict[str, Any]:
        return fetch_external_data(period)
    
    def fetch_fundamental_data(self, ticker: str) -> Dict[str, Any]:
        return fetch_fundamental_data(ticker)
    
    def fetch_earnings_dates(self, tickers: List[str]) -> Dict[str, Optional[datetime]]:
        return fetch_earnings_dates(tickers)
    
    def fetch_realtime_data(self, tickers: List[str]) -> Dict[str, Dict[str, Any]]:
        return fetch_realtime_data(tickers)
