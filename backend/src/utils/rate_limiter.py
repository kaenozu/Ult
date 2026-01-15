"""
API Rate Limiter
Manages API call limits to prevent rate limiting from Yahoo Finance and other services.
"""

import logging
import time
from collections import deque
from dataclasses import dataclass
from typing import Dict, Optional, Callable, Any
import threading

logger = logging.getLogger(__name__)


@dataclass
class RateLimitConfig:
    """Configuration for rate limiting."""

    max_calls: int  # Maximum calls allowed
    time_window: int  # Time window in seconds
    name: str = "default"


class RateLimiter:
    """
    Token bucket rate limiter with request queuing.
    """

    # Predefined limits for different services
    YAHOO_FINANCE_LIMIT = RateLimitConfig(max_calls=2000, time_window=3600, name="Yahoo Finance")
    GEMINI_API_LIMIT = RateLimitConfig(max_calls=60, time_window=60, name="Gemini API")

    def __init__(self, config: RateLimitConfig):
        self.config = config
        self._call_times: deque = deque()
        self._lock = threading.Lock()
        self._total_calls = 0
        self._blocked_calls = 0

    def _clean_old_calls(self):
        """Remove call timestamps outside the time window."""
        cutoff = time.time() - self.config.time_window

        while self._call_times and self._call_times[0] < cutoff:
            self._call_times.popleft()

    def can_proceed(self) -> bool:
        """Check if a call can proceed without blocking."""
        with self._lock:
            self._clean_old_calls()
            return len(self._call_times) < self.config.max_calls

    def wait_if_needed(self, timeout: Optional[float] = None) -> bool:
        """
        Wait until a call can proceed.
        Returns True if call can proceed, False if timeout reached.
        """
        start_time = time.time()

        while True:
            with self._lock:
                self._clean_old_calls()

                if len(self._call_times) < self.config.max_calls:
                    # Record this call
                    self._call_times.append(time.time())
                    self._total_calls += 1
                    return True

                # Calculate wait time
                if self._call_times:
                    oldest_call = self._call_times[0]
                    wait_time = (oldest_call + self.config.time_window) - time.time()
                else:
                    wait_time = 1.0

            # Check timeout
            if timeout and (time.time() - start_time) >= timeout:
                self._blocked_calls += 1
                logger.warning(f"{self.config.name}: Rate limit timeout reached")
                return False

            # Wait a bit before retrying
            sleep_time = min(wait_time, 1.0)
            if sleep_time > 0:
                logger.debug(f"{self.config.name}: Rate limited, waiting {sleep_time:.1f}s")
                time.sleep(sleep_time)

    def execute_with_limit(self, func: Callable, *args, timeout: Optional[float] = 30.0, **kwargs) -> Any:
        """
        Execute a function with rate limiting.
        Waits if necessary, returns None if timeout.
        """
        if not self.wait_if_needed(timeout):
            logger.error(f"{self.config.name}: Call blocked due to rate limit")
            return None

        try:
            return func(*args, **kwargs)
        except Exception as e:
            logger.error(f"{self.config.name}: Function execution failed: {e}")
            raise

    def get_stats(self) -> Dict[str, Any]:
        """Get rate limiter statistics."""
        with self._lock:
            self._clean_old_calls()

            current_calls = len(self._call_times)
            remaining = self.config.max_calls - current_calls

            # Calculate reset time
            if self._call_times:
                oldest = self._call_times[0]
                reset_in = (oldest + self.config.time_window) - time.time()
            else:
                reset_in = 0

            return {
                "service": self.config.name,
                "current_calls": current_calls,
                "max_calls": self.config.max_calls,
                "remaining": remaining,
                "utilization_pct": f"{(current_calls / self.config.max_calls * 100):.1f}%",
                "reset_in_seconds": max(0, int(reset_in)),
                "total_calls": self._total_calls,
                "blocked_calls": self._blocked_calls,
            }


class RateLimiterManager:
    """Manages multiple rate limiters for different services."""

    def __init__(self):
        self._limiters: Dict[str, RateLimiter] = {}
        self._lock = threading.Lock()

    def get_limiter(self, service: str) -> RateLimiter:
        """Get or create a rate limiter for a service."""
        with self._lock:
            if service not in self._limiters:
                # Create limiter based on service
                if service == "yahoo_finance":
                    config = RateLimiter.YAHOO_FINANCE_LIMIT
                elif service == "gemini":
                    config = RateLimiter.GEMINI_API_LIMIT
                else:
                    # Default: 100 calls per minute
                    config = RateLimitConfig(max_calls=100, time_window=60, name=service)

                self._limiters[service] = RateLimiter(config)

            return self._limiters[service]

    def get_all_stats(self) -> Dict[str, Dict[str, Any]]:
        """Get statistics for all rate limiters."""
        with self._lock:
            return {service: limiter.get_stats() for service, limiter in self._limiters.items()}


# Global singleton
_rate_limiter_manager: Optional[RateLimiterManager] = None


def get_rate_limiter_manager() -> RateLimiterManager:
    """Get the global rate limiter manager."""
    global _rate_limiter_manager

    if _rate_limiter_manager is None:
        _rate_limiter_manager = RateLimiterManager()
        logger.info("Initialized RateLimiterManager")

    return _rate_limiter_manager
