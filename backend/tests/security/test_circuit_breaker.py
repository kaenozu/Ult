import pytest
from src.security.circuit_breaker import CircuitBreaker

def test_circuit_breaker_initialization():
    cb = CircuitBreaker(max_daily_loss=-5000.0)
    assert cb.max_daily_loss == -5000.0
    assert cb.is_active is True
    assert cb._is_tripped is False

def test_check_health_safe():
    cb = CircuitBreaker(max_daily_loss=-1000.0)
    # PnL above limit (e.g. -500 > -1000)
    assert cb.check_health(current_daily_pnl=-500.0) is True
    assert cb.is_active is True

def test_check_health_unsafe():
    cb = CircuitBreaker(max_daily_loss=-1000.0)
    # PnL below limit (e.g. -1200 < -1000)
    assert cb.check_health(current_daily_pnl=-1200.0) is False
    assert cb.is_active is False
    assert cb._is_tripped is True
    assert "Daily Loss Limit Breached" in cb._trip_reason

def test_manual_trip():
    cb = CircuitBreaker()
    cb.trip("Manual Kill Switch")
    assert cb.is_active is False
    assert cb._is_tripped is True
    assert cb._trip_reason == "Manual Kill Switch"
    
    # Check health should be false after trip regardless of PnL
    assert cb.check_health(0.0) is False

def test_reset():
    cb = CircuitBreaker()
    cb.trip("Test Trip")
    assert cb.is_active is False
    
    cb.reset()
    assert cb.is_active is True
    assert cb._is_tripped is False
    assert cb._trip_reason == ""

def test_status_property():
    cb = CircuitBreaker(max_daily_loss=-999.0)
    status = cb.status
    assert status["is_active"] is True
    assert status["max_daily_loss"] == -999.0
    assert "last_reset" in status
