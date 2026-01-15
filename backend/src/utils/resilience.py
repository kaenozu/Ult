"""
Iron Dome: Resilience & Circuit Breaker Utilities.
Provides decorators and classes to prevent cascading failures.
"""

import time
import logging
import functools
from typing import Any

logger = logging.getLogger("IronDome")


class CircuitBreakerOpenException(Exception):
    pass


class CircuitBreaker:
    """
    Manages the state of a circuit breaker.
    States: CLOSED (Normal), OPEN (Failing), HALF-OPEN (Recovery Test)
    """

    def __init__(self, failure_threshold: int = 5, recovery_timeout: int = 300, name: str = "Circuit"):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.name = name
        self.failures = 0
        self.last_failure_time = 0
        self.state = "CLOSED"  # 'CLOSED', 'OPEN', 'HALF-OPEN'

    def allow_request(self) -> bool:
        if self.state == "OPEN":
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = "HALF-OPEN"
                logger.info(f"🛡️ Iron Dome: '{self.name}' entering HALF-OPEN state. Testing recovery...")
                return True
            return False
        return True

    def record_success(self):
        if self.state == "HALF-OPEN":
            self.state = "CLOSED"
            self.failures = 0
            logger.info(f"🛡️ Iron Dome: '{self.name}' recovered. Circuit CLOSED.")
        elif self.state == "CLOSED":
            self.failures = 0

    def record_failure(self):
        self.failures += 1
        self.last_failure_time = time.time()
        logger.warning(f"🛡️ Iron Dome: '{self.name}' failure detected ({self.failures}/{self.failure_threshold}).")

        if self.failures >= self.failure_threshold:
            self.state = "OPEN"
            logger.error(f"🛡️ Iron Dome: '{self.name}' threshold exceeded. Circuit OPEN for {self.recovery_timeout}s.")


def circuit_breaker(failure_threshold: int = 3, recovery_timeout: int = 60, fallback_value: Any = None):
    """
    Decorator to apply circuit breaker logic to a function.
    """

    def decorator(func):
        # Create a specific breaker instance for this function
        breaker = CircuitBreaker(failure_threshold, recovery_timeout, name=func.__qualname__)

        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            if not breaker.allow_request():
                logger.warning(f"🛡️ Iron Dome: '{func.__qualname__}' calls blocked (Circuit OPEN). Returning fallback.")
                return fallback_value

            try:
                result = func(*args, **kwargs)
                breaker.record_success()
                return result
            except Exception as e:
                breaker.record_failure()
                logger.error(f"Error in secured function '{func.__qualname__}': {e}")
                return fallback_value

        # Attach breaker to wrapper for inspection if needed
        wrapper.breaker = breaker
        return wrapper

    return decorator
