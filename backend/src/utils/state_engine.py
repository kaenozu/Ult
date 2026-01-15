import logging
from datetime import datetime, timedelta
from typing import Any

logger = logging.getLogger(__name__)


class MacroShockManager:
    """
    Monitors economic calendars and significant macro events to trigger safety pauses.
    """

    def __init__(self):
        # In a real scenario, this would fetch from an API like AlphaVantage or Investing.com
        # For now, we simulate with a list of known "High Volatility" windows if applicable.
        self.emergency_pause_active = False
        self.important_events = [
            {"name": "FOMC", "time": "2025-12-31 03:00:00", "impact": "CRITICAL"},
            {"name": "NFP", "time": "2026-01-02 22:30:00", "impact": "HIGH"},
        ]

    def is_shock_imminent(self) -> bool:
        """Checks if we are within 30 minutes of a high-impact event."""
        now = datetime.now()
        for event in self.important_events:
            event_time = datetime.strptime(event["time"], "%Y-%m-%d %H:%M:%S")
            # Window: 30 mins before to 30 mins after
            start_window = event_time - timedelta(minutes=30)
            end_window = event_time + timedelta(minutes=30)

            if start_window <= now <= end_window:
                logger.warning(f"⚠️ MACRO SHOCK DETECTED: {event['name']} is imminent or active.")
                return True
        return False


class SystemStateEngine:
    """
    High-speed In-memory state storage.
    """

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SystemStateEngine, cls).__new__(cls)
            cls._instance.state = {
                "positions": {},
                "regime": "UNKNOWN",
                "last_scan_time": None,
                "active_mirror_account": "main",
            }
        return cls._instance

    def update_state(self, key: str, value: Any):
        self.state[key] = value

    def get_state(self, key: str, default=None):
        return self.state.get(key, default)


state_engine = SystemStateEngine()
