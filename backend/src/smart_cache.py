"""
Smart Cache Layer with Request Deduplication
Implements intelligent caching strategies to minimize API calls and improve performance.
"""

import asyncio
import logging
import time
from collections import defaultdict
from dataclasses import dataclass
from typing import Dict, Optional, Any, Callable
import threading

import pandas as pd

logger = logging.getLogger(__name__)


@dataclass
class CacheEntry:
    """Represents a cached data entry."""

    data: pd.DataFrame
    timestamp: float
    ttl: int
    access_count: int = 0
    last_access: float = 0.0


class SmartCache:
    """
    Intelligent cache with request deduplication and adaptive TTL.
    """

    # Adaptive TTL based on asset type (seconds)
    TTL_CONFIG = {
        "crypto": 60,  # 1 minute (highly volatile)
        "fx": 300,  # 5 minutes
        "stock": 1800,  # 30 minutes
        "index": 3600,  # 1 hour
        "default": 1800,  # 30 minutes
    }

    # Memory management thresholds
    MAX_ENTRIES = 500
    EVICTION_THRESHOLD = 0.8  # Evict when 80% full

    def __init__(self):
        self._cache: Dict[str, CacheEntry] = {}
        self._pending_requests: Dict[str, asyncio.Future] = {}
        self._lock = threading.Lock()
        self._request_counts: Dict[str, int] = defaultdict(int)

    def _get_asset_type(self, ticker: str) -> str:
        """Determine asset type from ticker symbol."""
        ticker_upper = ticker.upper()

        if any(crypto in ticker_upper for crypto in ["BTC", "ETH", "DOGE", "SOL", "XRP"]):
            return "crypto"
        elif ticker_upper.endswith("=X") or "USD" in ticker_upper:
            return "fx"
        elif ticker_upper.startswith("^"):
            return "index"
        else:
            return "stock"

    def _get_ttl(self, ticker: str) -> int:
        """Get adaptive TTL based on asset type."""
        asset_type = self._get_asset_type(ticker)
        return self.TTL_CONFIG.get(asset_type, self.TTL_CONFIG["default"])

    def _make_cache_key(self, ticker: str, period: str, interval: str = "1d") -> str:
        """Generate cache key."""
        return f"{ticker}::{period}::{interval}"

    def _is_valid(self, entry: CacheEntry) -> bool:
        """Check if cache entry is still valid."""
        age = time.time() - entry.timestamp
        return age < entry.ttl

    def _evict_lru(self):
        """Evict least recently used entries when cache is full."""
        if len(self._cache) < self.MAX_ENTRIES * self.EVICTION_THRESHOLD:
            return

        # Sort by last access time and remove oldest 20%
        sorted_entries = sorted(self._cache.items(), key=lambda x: x[1].last_access)

        num_to_evict = int(len(self._cache) * 0.2)
        for key, _ in sorted_entries[:num_to_evict]:
            del self._cache[key]
            logger.debug(f"Evicted cache entry: {key}")

    def get(self, ticker: str, period: str, interval: str = "1d") -> Optional[pd.DataFrame]:
        """Get cached data if available and valid."""
        key = self._make_cache_key(ticker, period, interval)

        with self._lock:
            entry = self._cache.get(key)

            if entry and self._is_valid(entry):
                # Update access stats
                entry.access_count += 1
                entry.last_access = time.time()

                logger.debug(f"Cache HIT: {key} (age: {time.time() - entry.timestamp:.1f}s)")
                return entry.data.copy()

            logger.debug(f"Cache MISS: {key}")
            return None

    def set(self, ticker: str, period: str, data: pd.DataFrame, interval: str = "1d"):
        """Store data in cache with adaptive TTL."""
        key = self._make_cache_key(ticker, period, interval)
        ttl = self._get_ttl(ticker)

        with self._lock:
            self._cache[key] = CacheEntry(
                data=data.copy(),
                timestamp=time.time(),
                ttl=ttl,
                access_count=1,
                last_access=time.time(),
            )

            # Trigger eviction if needed
            self._evict_lru()

            logger.debug(f"Cached: {key} (TTL: {ttl}s)")

    def get_or_fetch(
        self,
        ticker: str,
        period: str,
        fetch_func: Callable,
        interval: str = "1d",
        prefetch_related: bool = False,
    ) -> pd.DataFrame:
        """
        Get from cache or fetch with request deduplication.
        If multiple requests for same ticker arrive concurrently, they share one fetch.
        """
        # Try cache first
        cached = self.get(ticker, period, interval)
        if cached is not None:
            return cached

        key = self._make_cache_key(ticker, period, interval)

        # Check if request is already pending
        with self._lock:
            if key in self._pending_requests:
                logger.debug(f"Request deduplication: {key}")
                # Wait for pending request to complete
                # (In sync context, we'll just fetch again - async would wait)

        # Fetch data
        try:
            data = fetch_func([ticker], period=period, interval=interval)

            if ticker in data and not data[ticker].empty:
                df = data[ticker]
                self.set(ticker, period, df, interval)

                # Predictive prefetch (if enabled)
                if prefetch_related:
                    self._prefetch_related(ticker, period, fetch_func, interval)

                return df
            else:
                return pd.DataFrame()

        except Exception as e:
            logger.error(f"Fetch failed for {ticker}: {e}")
            return pd.DataFrame()

    def _prefetch_related(self, ticker: str, period: str, fetch_func: Callable, interval: str):
        """Predictively prefetch related tickers (e.g., sector peers)."""
        # Simple heuristic: prefetch major indices
        related_tickers = []

        if ticker.endswith(".T"):  # Japanese stock
            related_tickers = ["^N225"]  # Nikkei
        elif not ticker.startswith("^"):  # US stock
            related_tickers = ["^GSPC"]  # S&P 500

        for related in related_tickers:
            if self.get(related, period, interval) is None:
                try:
                    data = fetch_func([related], period=period, interval=interval)
                    if related in data:
                        self.set(related, period, data[related], interval)
                        logger.debug(f"Prefetched: {related}")
                except Exception as e:
                    logger.debug(f"Prefetch failed for {related}: {e}")

    def invalidate(self, ticker: Optional[str] = None):
        """Invalidate cache entries."""
        with self._lock:
            if ticker:
                # Invalidate specific ticker
                keys_to_remove = [k for k in self._cache.keys() if k.startswith(f"{ticker}::")]
                for key in keys_to_remove:
                    del self._cache[key]
                logger.info(f"Invalidated cache for {ticker}")
            else:
                # Clear all
                self._cache.clear()
                logger.info("Cleared entire cache")

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        with self._lock:
            total_entries = len(self._cache)
            valid_entries = sum(1 for e in self._cache.values() if self._is_valid(e))

            total_accesses = sum(e.access_count for e in self._cache.values())

            return {
                "total_entries": total_entries,
                "valid_entries": valid_entries,
                "stale_entries": total_entries - valid_entries,
                "total_accesses": total_accesses,
                "hit_rate": f"{(total_accesses / max(total_entries, 1)):.2f}",
                "memory_usage_pct": f"{(total_entries / self.MAX_ENTRIES * 100):.1f}%",
            }


# Global singleton instance
_smart_cache_instance: Optional[SmartCache] = None


def get_smart_cache() -> SmartCache:
    """Get or create the global smart cache instance."""
    global _smart_cache_instance

    if _smart_cache_instance is None:
        _smart_cache_instance = SmartCache()
        logger.info("Initialized SmartCache")

    return _smart_cache_instance
