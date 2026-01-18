import yfinance as yf
import pandas as pd
from datetime import datetime
import logging
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

class EarningsProvider:
    """
    Provides earnings calendar data using yfinance.
    Implements caching to avoid hitting API rate limits.
    """
    
    def __init__(self):
        self._cache = {}
        self._cache_ttl = 3600 * 12 # 12 hours
        self._last_update = datetime.min
        
    def get_upcoming_earnings(self, tickers: List[str], days_horizon: int = 14) -> List[Dict]:
        """
        Get list of stocks with earnings within the next N days.
        """
        results = []
        now = datetime.now()
        
        for ticker in tickers:
            try:
                # 1. Check Cache
                cached_date = self._get_cached_date(ticker)
                
                earnings_date = None
                
                if cached_date:
                    earnings_date = cached_date
                else:
                    # 2. Fetch from YFinance
                    # Note: yfinance fetching can be slow, normally this should be async or batched
                    # For prototype, we do it sequentially but we should be careful with list size
                    yf_ticker = yf.Ticker(ticker)
                    cal = yf_ticker.calendar
                    
                    if cal is not None:
                        # Handle different return types (Dict vs DataFrame)
                        if isinstance(cal, dict):
                             # Often returns {'Earnings Date': [date], ...}
                             if 'Earnings Date' in cal:
                                 dates = cal['Earnings Date']
                                 if len(dates) > 0:
                                     earnings_date = pd.to_datetime(dates[0])
                             # Sometimes keys are indices 0, 1
                             elif 0 in cal and 'Earnings Date' in cal[0]:
                                  earnings_date = pd.to_datetime(cal[0]['Earnings Date'])
                        elif hasattr(cal, 'empty') and not cal.empty:
                            if 'Earnings Date' in cal:
                                dates = cal['Earnings Date']
                                if len(dates) > 0:
                                    earnings_date = pd.to_datetime(dates[0])
                        
                    self._cache[ticker] = {
                        "date": earnings_date,
                        "timestamp": now
                    }
                
                if earnings_date:
                    days_diff = (earnings_date - now).days
                    
                    if 0 <= days_diff <= days_horizon:
                        results.append({
                            "ticker": ticker,
                            "earnings_date": earnings_date.strftime("%Y-%m-%d"),
                            "days_to_earnings": days_diff,
                            "consensus_eps": 0.0, # Placeholder, difficult to get reliable free consensus
                        })
                        
            except Exception as e:
                logger.warning(f"Failed to fetch earnings for {ticker}: {e}")
                continue
                
        # Sort by nearest date
        results.sort(key=lambda x: x["days_to_earnings"])
        return results

    def _get_cached_date(self, ticker: str) -> Optional[datetime]:
        if ticker in self._cache:
            entry = self._cache[ticker]
            if (datetime.now() - entry["timestamp"]).total_seconds() < self._cache_ttl:
                return entry["date"]
        return None

# Singleton
earnings_provider = EarningsProvider()
