"""
Runtime helpers for the one-click defense mode.

This module only touches environment variables so that existing components
(`ExecutionEngine`, `simple_dashboard` scenario sliders, etc.) can pick up
the stricter risk profile without rewriting configs.
"""

import os
from typing import Dict


DEFAULT_DEFENSE_ENV = {
    "SAFE_MODE": "1",
    "TRADING_SCENARIO": "conservative",
    "MAX_PER_TICKER_PCT": "0.10",
    "MAX_PER_SECTOR_PCT": "0.20",
}


def _read_current_env() -> Dict[str, str]:
    """Collect the current risk-related environment variables."""
    return {
        "SAFE_MODE": os.getenv("SAFE_MODE", ""),
        "TRADING_SCENARIO": os.getenv("TRADING_SCENARIO", ""),
        "MAX_PER_TICKER_PCT": os.getenv("MAX_PER_TICKER_PCT", ""),
        "MAX_PER_SECTOR_PCT": os.getenv("MAX_PER_SECTOR_PCT", ""),
    }


def activate_defense(previous: Dict[str, str] = None) -> Dict[str, str]:
    """
    Enable defense mode by applying stricter env overrides.
    Returns the previous env snapshot so the caller can restore later.
    """
    # Always capture the current environment when switching on
    snapshot = previous or _read_current_env()
    for key, val in DEFAULT_DEFENSE_ENV.items():
        os.environ[key] = val
    return snapshot


def deactivate_defense(snapshot: Dict[str, str]) -> None:
    """
    Restore env vars from the snapshot.
    Unknown or missing keys are ignored to keep this idempotent.
    """
    if not snapshot:
        # Snapshot missing: ensure defense-related keys are cleared
        for key in DEFAULT_DEFENSE_ENV:
            os.environ.pop(key, None)
        return

    for key, val in snapshot.items():
        if val:
            os.environ[key] = val
        else:
            os.environ.pop(key, None)


def defense_status() -> bool:
    """Quick check whether defense mode is currently active."""
    return (
        os.getenv("SAFE_MODE", "").lower() in {"1", "true", "yes"}
        and os.getenv("TRADING_SCENARIO", "").lower() == "conservative"
    )
