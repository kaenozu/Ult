"""
Circuit Breaker - Hard Budget Limit & Kill Switch
Safety First! Protect against bankruptcy in 4K resolution.
"""

import json
import logging
import time
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Any, Dict, Optional, Tuple
from dataclasses import dataclass, field
import threading

logger = logging.getLogger(__name__)


class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


class TriggerType(Enum):
    DAILY_LOSS_LIMIT = "daily_loss_limit"
    MAX_DRAWDOWN = "max_drawdown"
    HARD_BUDGET_LIMIT = "hard_budget_limit"
    EMERGENCY_KILL_SWITCH = "emergency_kill_switch"
    API_ERROR_THRESHOLD = "api_error_threshold"
    MANUAL = "manual"


@dataclass
class CircuitBreakerConfig:
    hard_budget_limit: float = -100000.0
    daily_loss_limit: float = -5000.0
    max_drawdown_limit: float = -10.0
    failure_threshold: int = 5
    failure_timeout: int = 60
    half_open_success_threshold: int = 3
    auto_reset_hours: int = 24
    enable_kill_switch: bool = True
    require_manual_reset: bool = False


@dataclass
class CircuitBreakerState:
    state: CircuitState = CircuitState.CLOSED
    trigger_type: Optional[TriggerType] = None
    trigger_reason: str = ""
    triggered_at: Optional[str] = None
    failure_count: int = 0
    last_failure_at: Optional[str] = None
    success_count_in_half_open: int = 0
    total_losses: float = 0.0
    peak_loss: float = 0.0
    kill_switch_active: bool = False
    manual_reset_required: bool = False
    reset_at: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "state": self.state.value,
            "trigger_type": self.trigger_type.value if self.trigger_type else None,
            "trigger_reason": self.trigger_reason,
            "triggered_at": self.triggered_at,
            "failure_count": self.failure_count,
            "last_failure_at": self.last_failure_at,
            "success_count_in_half_open": self.success_count_in_half_open,
            "total_losses": self.total_losses,
            "peak_loss": self.peak_loss,
            "kill_switch_active": self.kill_switch_active,
            "manual_reset_required": self.manual_reset_required,
            "reset_at": self.reset_at,
            "metadata": self.metadata,
        }


class CircuitBreaker:
    _instance: Optional["CircuitBreaker"] = None
    _lock = threading.Lock()

    def __new__(
        cls, config: CircuitBreakerConfig = None, state_file: str = None
    ) -> "CircuitBreaker":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self, config: CircuitBreakerConfig = None, state_file: str = None):
        if hasattr(self, "_initialized") and self._initialized:
            return

        self.config = config or CircuitBreakerConfig()
        self.state_file = state_file
        self.state = CircuitBreakerState()
        self._lock = threading.Lock()
        self._callbacks: Dict[str, callable] = {}

        self._load_state()
        self._initialized = True
        logger.info("CircuitBreaker initialized with config: %s", self.config.__dict__)

    def register_callback(self, name: str, callback: callable):
        self._callbacks[name] = callback

    def _trigger_callbacks(self, event: str, *args, **kwargs):
        for name, callback in self._callbacks.items():
            try:
                callback(event, *args, **kwargs)
            except Exception as e:
                logger.error(f"CircuitBreaker callback {name} failed: {e}")

    def _load_state(self):
        if not self.state_file:
            return
        try:
            path = Path(self.state_file)
            if path.exists():
                with open(path, "r") as f:
                    data = json.load(f)
                    self.state = CircuitBreakerState(
                        state=CircuitState(data.get("state", "closed")),
                        trigger_type=TriggerType(data["trigger_type"])
                        if data.get("trigger_type")
                        else None,
                        trigger_reason=data.get("trigger_reason", ""),
                        triggered_at=data.get("triggered_at"),
                        failure_count=data.get("failure_count", 0),
                        last_failure_at=data.get("last_failure_at"),
                        success_count_in_half_open=data.get(
                            "success_count_in_half_open", 0
                        ),
                        total_losses=data.get("total_losses", 0.0),
                        peak_loss=data.get("peak_loss", 0.0),
                        kill_switch_active=data.get("kill_switch_active", False),
                        manual_reset_required=data.get("manual_reset_required", False),
                        reset_at=data.get("reset_at"),
                        metadata=data.get("metadata", {}),
                    )
                logger.info("CircuitBreaker state loaded: %s", self.state.to_dict())
        except Exception as e:
            logger.error(f"Failed to load CircuitBreaker state: {e}")

    def _save_state(self):
        if not self.state_file:
            return
        try:
            path = Path(self.state_file)
            path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.state_file, "w") as f:
                json.dump(self.state.to_dict(), f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save CircuitBreaker state: {e}")

    def can_execute(self) -> Tuple[bool, str]:
        if self.state.kill_switch_active:
            return False, "Kill switch is active - all trading halted"
        if self.state.state == CircuitState.OPEN:
            elapsed = (
                time.time()
                - datetime.fromisoformat(self.state.triggered_at).timestamp()
            )
            if elapsed >= self.config.failure_timeout:
                self.state.state = CircuitState.HALF_OPEN
                self._save_state()
                return True, "Circuit breaker entering half-open state"
            return False, f"Circuit breaker open: {self.state.trigger_reason}"
        return True, "Circuit breaker closed - trading allowed"

    def record_loss(self, loss_amount: float, trigger_type: TriggerType = None):
        with self._lock:
            self.state.total_losses += loss_amount
            self.state.peak_loss = min(self.state.peak_loss, loss_amount)

            if self.state.state == CircuitState.OPEN:
                return

            self.state.failure_count += 1
            self.state.last_failure_at = datetime.now().isoformat()

            triggered = False
            trigger_reason = ""

            if self.state.total_losses <= self.config.hard_budget_limit:
                triggered = True
                trigger_type = TriggerType.HARD_BUDGET_LIMIT
                trigger_reason = f"Hard budget limit exceeded: {self.state.total_losses:.2f} < {self.config.hard_budget_limit:.2f}"
            elif self.state.total_losses <= self.config.daily_loss_limit:
                triggered = True
                trigger_type = TriggerType.DAILY_LOSS_LIMIT
                trigger_reason = f"Daily loss limit exceeded: {self.state.total_losses:.2f} < {self.config.daily_loss_limit:.2f}"

            if triggered:
                self._trip_circuit(trigger_type, trigger_reason)
            else:
                self._save_state()

            self._trigger_callbacks(
                "loss_recorded", loss_amount, self.state.total_losses
            )

    def record_success(self):
        with self._lock:
            if self.state.state == CircuitState.HALF_OPEN:
                self.state.success_count_in_half_open += 1
                if (
                    self.state.success_count_in_half_open
                    >= self.config.half_open_success_threshold
                ):
                    self._reset_circuit()
            self._save_state()
            self._trigger_callbacks(
                "success_recorded", self.state.success_count_in_half_open
            )

    def _trip_circuit(self, trigger_type: TriggerType, reason: str):
        self.state.state = CircuitState.OPEN
        self.state.trigger_type = trigger_type
        self.state.trigger_reason = reason
        self.state.triggered_at = datetime.now().isoformat()
        self.state.manual_reset_required = self.config.require_manual_reset

        if trigger_type == TriggerType.EMERGENCY_KILL_SWITCH:
            self.state.kill_switch_active = True

        if self.config.auto_reset_hours > 0:
            self.state.reset_at = (
                datetime.now() + timedelta(hours=self.config.auto_reset_hours)
            ).isoformat()

        self._save_state()
        logger.critical(
            f"🔴 CIRCUIT BREAKER TRIGGERED: {trigger_type.value} - {reason}"
        )
        self._trigger_callbacks("tripped", trigger_type, reason)

    def _reset_circuit(self):
        previous_state = self.state.state.value
        self.state = CircuitBreakerState()
        self._save_state()
        logger.info(f"🔵 Circuit breaker reset: {previous_state} -> closed")
        self._trigger_callbacks("reset", previous_state)

    def activate_kill_switch(self, reason: str = "Manual activation") -> bool:
        with self._lock:
            if not self.config.enable_kill_switch:
                logger.warning("Kill switch is disabled in configuration")
                return False

            self._trip_circuit(
                TriggerType.EMERGENCY_KILL_SWITCH, f"Kill switch activated: {reason}"
            )
            self._trigger_callbacks("kill_switch_activated", reason)
            return True

    def deactivate_kill_switch(self) -> bool:
        with self._lock:
            if self.state.kill_switch_active:
                self.state.kill_switch_active = False
                if not self.config.require_manual_reset:
                    self._reset_circuit()
                else:
                    self._save_state()
                logger.info("Kill switch deactivated")
                self._trigger_callbacks("kill_switch_deactivated")
                return True
            return False

    def manual_reset(self) -> bool:
        with self._lock:
            if self.state.state == CircuitState.OPEN:
                self._reset_circuit()
                self._trigger_callbacks("manual_reset")
                return True
            return False

    def check_portfolio_health(
        self, current_value: float, initial_value: float
    ) -> Tuple[bool, str]:
        drawdown = (current_value - initial_value) / initial_value * 100

        if drawdown <= self.config.max_drawdown_limit:
            self._trip_circuit(
                TriggerType.MAX_DRAWDOWN,
                f"Max drawdown limit exceeded: {drawdown:.2f}% < {self.config.max_drawdown_limit:.2f}%",
            )
            return False, f"Drawdown limit exceeded: {drawdown:.2f}%"

        return True, f"Portfolio healthy: {drawdown:.2f}% drawdown"

    def get_state(self) -> CircuitBreakerState:
        return self.state

    def get_status(self) -> Dict[str, Any]:
        can_execute, message = self.can_execute()
        return {
            "can_trade": can_execute,
            "status_message": message,
            "state": self.state.to_dict(),
            "config": {
                "hard_budget_limit": self.config.hard_budget_limit,
                "daily_loss_limit": self.config.daily_loss_limit,
                "max_drawdown_limit": self.config.max_drawdown_limit,
                "failure_threshold": self.config.failure_threshold,
                "failure_timeout": self.config.failure_timeout,
            },
            "timestamp": datetime.now().isoformat(),
        }

    def reset_daily_losses(self):
        with self._lock:
            self.state.total_losses = 0.0
            self.state.failure_count = 0
            self._save_state()
            logger.info("Daily losses reset")

    def is_tripped(self) -> bool:
        return self.state.state == CircuitState.OPEN

    def is_kill_switch_active(self) -> bool:
        return self.state.kill_switch_active


circuit_breaker = CircuitBreaker(
    config=CircuitBreakerConfig(
        hard_budget_limit=-100000.0,
        daily_loss_limit=-5000.0,
        max_drawdown_limit=-10.0,
        failure_threshold=5,
        failure_timeout=60,
        half_open_success_threshold=3,
        auto_reset_hours=24,
        enable_kill_switch=True,
        require_manual_reset=False,
    ),
    state_file=str(
        Path(__file__).parent.parent / "data" / "circuit_breaker_state.json"
    ),
)


def get_circuit_breaker() -> CircuitBreaker:
    return circuit_breaker
