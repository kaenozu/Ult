import schedule
import time
import logging
import threading
from typing import Callable

logger = logging.getLogger(__name__)

class SovereignScheduler:
    """
    The Heartbeat.
    Manages the daily schedule of the Sovereign Agent.
    """
    def __init__(self):
        self.is_running = False
        self._thread = None

    def register_job(self, time_str: str, func: Callable, *args, **kwargs):
        """
        Register a daily job.
        Args:
            time_str: "HH:MM" format (24h)
            func: Function to execute
        """
        job = schedule.every().day.at(time_str).do(func, *args, **kwargs)
        logger.info(f"Job scheduled: {func.__name__} at {time_str}")
        return job

    def register_interval(self, minutes: int, func: Callable, *args, **kwargs):
        """Register a repeating job every N minutes (e.g., for heartbeats)."""
        job = schedule.every(minutes).minutes.do(func, *args, **kwargs)
        logger.info(f"Job scheduled: {func.__name__} every {minutes} mins")
        return job

    def run_pending(self):
        """Run pending jobs (non-blocking, single iteration)."""
        schedule.run_pending()

    def start(self):
        """Start the scheduler loop in a blocking manner (or thread if we wanted)."""
        self.is_running = True
        logger.info("SovereignScheduler started. beating...")
        try:
            while self.is_running:
                schedule.run_pending()
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("Scheduler stopped by user.")
            self.stop()

    def stop(self):
        self.is_running = False
