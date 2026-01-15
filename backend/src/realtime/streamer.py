import threading
import time
from datetime import datetime
from typing import Callable, Dict, List, Optional

import yfinance as yf


class marketStreamer:
    """
    Simulates real-time data streaming by polling yfinance.
    In a real scenario, this would connect to a WebSocket.
    """

    def __init__(
        self, tickers, interval_sec=60, max_retries=3, backoff_factor=2.0, max_backoff_sec=30, downloader=None
    ):
        self.tickers = tickers
        self.interval_sec = interval_sec
        self.max_retries = max_retries
        self.backoff_factor = backoff_factor
        self.max_backoff_sec = max_backoff_sec
        self.downloader = downloader or yf.download

        self.latest_data: Dict[str, Dict] = {}
        self.running = False
        self.thread: Optional[threading.Thread] = None
        self.callbacks: List[Callable] = []

        self.last_update: Optional[datetime] = None
        self.failure_count = 0
        self.last_error: Optional[str] = None

    def start(self):
        if self.running:
            return
        self.running = True
        self.thread = threading.Thread(target=self._poll_loop, daemon=True)
        self.thread.start()

    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join()

    def register_callback(self, callback):
        self.callbacks.append(callback)

    def _poll_loop(self):
        while self.running:
            try:
                self._fetch_latest()
                time.sleep(self.interval_sec)
            except Exception as e:
                self.last_error = str(e)
                print(f"Streamer Error: {e}")
                time.sleep(5)

    def _fetch_latest(self):
        # Batch fetch for efficiency
        tickers_str = " ".join(self.tickers)

        for attempt in range(1, self.max_retries + 1):
            try:
                # period='1d', interval='1m' gets the latest minute data
                data = self.downloader(tickers_str, period="1d", interval="1m", progress=False)

                timestamp = datetime.now()

                if len(self.tickers) == 1:
                    row = data.iloc[-1]
                    update = {
                        "ticker": self.tickers[0],
                        "price": row["Close"],
                        "volume": row["Volume"],
                        "time": timestamp,
                    }
                    self._notify(update)
                else:
                    # MultiIndex: (PriceType, Ticker)
                    for ticker in self.tickers:
                        try:
                            price = data["Close"][ticker].iloc[-1]
                            volume = data["Volume"][ticker].iloc[-1]
                            update = {"ticker": ticker, "price": price, "volume": volume, "time": timestamp}
                            self._notify(update)
                        except KeyError:
                            continue

                self.last_update = timestamp
                self.last_error = None
                self.failure_count = 0
                return
            except Exception as e:
                self.failure_count += 1
                self.last_error = str(e)

                if attempt < self.max_retries:
                    sleep_time = min(self.max_backoff_sec, self.backoff_factor ** (attempt - 1))
                    time.sleep(sleep_time)
                else:
                    print(f"Fetch Error after {attempt} attempts: {e}")
                    return

    def _notify(self, data):
        self.latest_data[data["ticker"]] = data
        for cb in self.callbacks:
            cb(data)


# Singleton instance placeholder
_monitor = None


def get_streamer(tickers=None):
    global _monitor
    if _monitor is None and tickers:
        _monitor = marketStreamer(tickers)
    return _monitor
