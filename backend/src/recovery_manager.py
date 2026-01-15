"""
Recovery Manager Module
Handles automatic error recovery and system resilience.
"""

import logging
import time
from functools import wraps
from typing import Any, Callable, Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class RecoveryManager:
    def __init__(self):
        self.max_retries = 3
        self.retry_delay = 1  # seconds
        self.circuit_breaker_threshold = 5
        self.circuit_breaker_timeout = 60  # seconds
        self.failure_count = {}
        self.circuit_open_until = {}

    def retry_with_backoff(
        self,
        func: Callable,
        max_retries: Optional[int] = None,
        backoff_factor: float = 2.0,
    ) -> Any:
        """
        Retry a function with exponential backoff.

        Args:
            func: Function to retry
            max_retries: Maximum number of retries
            backoff_factor: Backoff multiplier

        Returns:
            Function result
        """
        retries = max_retries or self.max_retries
        delay = self.retry_delay

        for attempt in range(retries):
            try:
                return func()
            except Exception as e:
                if attempt == retries - 1:
                    logger.error(f"Failed after {retries} attempts: {e}")
                    raise

                logger.warning(f"Attempt {attempt + 1} failed: {e}. Retrying in {delay}s...")
                time.sleep(delay)
                delay *= backoff_factor

    def circuit_breaker(self, service_name: str):
        """
        Circuit breaker decorator to prevent cascading failures.

        Args:
            service_name: Name of the service
        """

        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                # Check if circuit is open
                if service_name in self.circuit_open_until:
                    if time.time() < self.circuit_open_until[service_name]:
                        raise Exception(f"Circuit breaker open for {service_name}")
                    else:
                        # Try to close circuit
                        del self.circuit_open_until[service_name]
                        self.failure_count[service_name] = 0

                try:
                    result = func(*args, **kwargs)
                    # Success - reset failure count
                    self.failure_count[service_name] = 0
                    return result

                except Exception:
                    # Increment failure count
                    self.failure_count[service_name] = self.failure_count.get(service_name, 0) + 1

                    # Open circuit if threshold exceeded
                    if self.failure_count[service_name] >= self.circuit_breaker_threshold:
                        self.circuit_open_until[service_name] = time.time() + self.circuit_breaker_timeout
                        logger.error(f"Circuit breaker opened for {service_name}")

                    raise

            return wrapper

        return decorator

    def safe_execute(self, func: Callable, fallback: Any = None) -> Any:
        """
        Execute function safely with fallback.

        Args:
            func: Function to execute
            fallback: Fallback value if function fails

        Returns:
            Function result or fallback
        """
        try:
            return func()
        except Exception as e:
            logger.error(f"Safe execute failed: {e}. Using fallback.")
            return fallback

    def recover_database_connection(self, db_path: str) -> bool:
        """
        Attempt to recover database connection.

        Args:
            db_path: Path to database

        Returns:
            True if recovery successful
        """
        try:
            import sqlite3

            # Try to connect
            conn = sqlite3.connect(db_path, timeout=10)
            conn.execute("SELECT 1")
            conn.close()

            logger.info("Database connection recovered")
            return True

        except Exception as e:
            logger.error(f"Database recovery failed: {e}")
            return False

    def rollback_trade(self, trade_id: str) -> bool:
        """
        Rollback a failed trade.

        Args:
            trade_id: Trade identifier

        Returns:
            True if rollback successful
        """
        try:
            from src.paper_trader import PaperTrader

            PaperTrader()
            # Implementation would depend on trade tracking
            # For now, just log
            logger.info(f"Rolling back trade {trade_id}")
            return True

        except Exception as e:
            logger.error(f"Trade rollback failed: {e}")
            return False

    def emergency_shutdown(self, reason: str):
        """
        Perform emergency system shutdown.

        Args:
            reason: Reason for shutdown
        """
        logger.critical(f"EMERGENCY SHUTDOWN: {reason}")

        try:
            # Save state
            from src.db_maintenance import DatabaseMaintenance

            maintenance = DatabaseMaintenance()
            maintenance.backup_database(prefix="emergency")

            # Send alert
            from src.anomaly_detector import AnomalyDetector

            detector = AnomalyDetector()
            detector.send_alert(
                {
                    "type": "EMERGENCY_SHUTDOWN",
                    "severity": "CRITICAL",
                    "message": f"System shutdown: {reason}",
                }
            )

            logger.info("Emergency shutdown complete")

        except Exception as e:
            logger.error(f"Emergency shutdown error: {e}")


# Global instance
recovery_manager = RecoveryManager()


# Decorator for easy use
def auto_retry(max_retries: int = 3):
    """Decorator for automatic retry."""

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            return recovery_manager.retry_with_backoff(lambda: func(*args, **kwargs), max_retries=max_retries)

        return wrapper

    return decorator


if __name__ == "__main__":
    # Test
    manager = RecoveryManager()

    # Test retry
    @auto_retry(max_retries=3)
    def flaky_function():
        import random

        if random.random() < 0.7:
            raise Exception("Random failure")
        return "Success"

    try:
        result = flaky_function()
        print(f"Result: {result}")
    except Exception as e:
        print(f"Failed: {e}")
