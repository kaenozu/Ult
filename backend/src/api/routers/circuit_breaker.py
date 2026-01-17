"""
Circuit Breaker API Endpoints
Hard Budget Limit & Kill Switch Control
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from src.api.websocket_types import (
    CircuitBreakerStatusPayload,
    CircuitBreakerTrippedPayload,
    CircuitBreakerResetPayload,
    CircuitBreakerStateEnum,
    CircuitBreakerTriggerTypeEnum,
    MessageFactory,
)
from src.circuit_breaker import (
    get_circuit_breaker,
    CircuitBreaker,
    CircuitBreakerConfig,
)

router = APIRouter()


class CircuitBreakerConfigUpdate(BaseModel):
    hard_budget_limit: Optional[float] = None
    daily_loss_limit: Optional[float] = None
    max_drawdown_limit: Optional[float] = None
    failure_threshold: Optional[int] = None
    failure_timeout: Optional[int] = None
    enable_kill_switch: Optional[bool] = None
    require_manual_reset: Optional[bool] = None


class KillSwitchRequest(BaseModel):
    reason: Optional[str] = None


class CircuitBreakerResetResponse(BaseModel):
    success: bool
    message: str
    state: str


@router.get("/status")
async def get_circuit_breaker_status():
    """Get current circuit breaker status"""
    cb = get_circuit_breaker()
    status_info = cb.get_status()
    return status_info


@router.post("/config")
async def update_circuit_breaker_config(config_update: CircuitBreakerConfigUpdate):
    """Update circuit breaker configuration"""
    cb = get_circuit_breaker()

    if config_update.hard_budget_limit is not None:
        cb.config.hard_budget_limit = config_update.hard_budget_limit
    if config_update.daily_loss_limit is not None:
        cb.config.daily_loss_limit = config_update.daily_loss_limit
    if config_update.max_drawdown_limit is not None:
        cb.config.max_drawdown_limit = config_update.max_drawdown_limit
    if config_update.failure_threshold is not None:
        cb.config.failure_threshold = config_update.failure_threshold
    if config_update.failure_timeout is not None:
        cb.config.failure_timeout = config_update.failure_timeout
    if config_update.enable_kill_switch is not None:
        cb.config.enable_kill_switch = config_update.enable_kill_switch
    if config_update.require_manual_reset is not None:
        cb.config.require_manual_reset = config_update.require_manual_reset

    cb._save_state()

    return {
        "success": True,
        "message": "Circuit breaker configuration updated",
        "config": cb.config.__dict__,
    }


@router.post("/kill-switch/activate")
async def activate_kill_switch(request: KillSwitchRequest = None):
    """Activate emergency kill switch - immediately halts all trading"""
    cb = get_circuit_breaker()

    reason = request.reason if request else "Manual activation via API"
    success = cb.activate_kill_switch(reason)

    if success:
        return {
            "success": True,
            "message": "Kill switch activated",
            "reason": reason,
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to activate kill switch (may be disabled in config)",
        )


@router.post("/kill-switch/deactivate")
async def deactivate_kill_switch():
    """Deactivate emergency kill switch"""
    cb = get_circuit_breaker()

    success = cb.deactivate_kill_switch()

    if success:
        return {
            "success": True,
            "message": "Kill switch deactivated",
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kill switch was not active",
        )


@router.post("/reset")
async def manual_reset_circuit_breaker(force: bool = False):
    """Manually reset the circuit breaker"""
    cb = get_circuit_breaker()

    if not cb.is_tripped():
        return {
            "success": True,
            "message": "Circuit breaker is already closed",
            "state": cb.state.state.value,
        }

    if not force and cb.state.manual_reset_required:
        return {
            "success": False,
            "message": "Manual reset is required. Use ?force=true to override.",
            "state": cb.state.state.value,
        }

    success = cb.manual_reset()

    if success:
        return {
            "success": True,
            "message": "Circuit breaker manually reset",
            "state": "closed",
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to reset circuit breaker",
        )


@router.post("/loss/record")
async def record_loss(loss_amount: float):
    """Record a loss and check circuit breaker"""
    cb = get_circuit_breaker()
    cb.record_loss(loss_amount)

    status_info = cb.get_status()
    return status_info


@router.get("/health")
async def circuit_breaker_health():
    """Quick health check for monitoring"""
    cb = get_circuit_breaker()

    return {
        "is_tripped": cb.is_tripped(),
        "kill_switch_active": cb.is_kill_switch_active(),
        "can_trade": cb.can_execute()[0],
        "total_losses": cb.state.total_losses,
        "state": cb.state.state.value,
        "timestamp": datetime.now().isoformat(),
    }
