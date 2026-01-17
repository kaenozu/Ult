import logging
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)

class CircuitBreaker:
    """
    Guardian class to prevent catastrophic losses by autonomous agents.
    Enforces hard budget limits and provides a manual kill switch.
    """
    def __init__(self, max_daily_loss: float = -10000.0):
        self.max_daily_loss = max_daily_loss
        self._is_tripped = False
        self._trip_reason = ""
        self._last_reset = datetime.now()
        
    def check_health(self, current_daily_pnl: float) -> bool:
        """
        Checks if the system is healthy to trade.
        Returns False if breaker is tripped or PnL exceeds max loss.
        """
        if self._is_tripped:
            return False
            
        if current_daily_pnl <= self.max_daily_loss:
            self.trip(f"Daily Loss Limit Breached: Current PnL {current_daily_pnl} <= Limit {self.max_daily_loss}")
            return False
            
        return True
        
    def trip(self, reason: str):
        """
        Manually trips the circuit breaker (Kill Switch).
        """
        self._is_tripped = True
        self._trip_reason = reason
        logger.critical(f"🛑 CIRCUIT BREAKER TRIPPED: {reason}")
        
    def reset(self):
        """
        Resets the circuit breaker. Should require manual intervention.
        """
        self._is_tripped = False
        self._trip_reason = ""
        self._last_reset = datetime.now()
        logger.info("✅ Circuit Breaker Manually Reset")
        
    @property
    def is_active(self) -> bool:
        """Returns True if the breaker is NOT tripped (System is Active)."""
        return not self._is_tripped
        
    @property
    def status(self) -> dict:
        return {
            "is_active": self.is_active,
            "is_tripped": self._is_tripped,
            "trip_reason": self._trip_reason,
            "max_daily_loss": self.max_daily_loss,
            "last_reset": self._last_reset.isoformat()
        }
