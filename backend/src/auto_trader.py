import logging
import time
import threading
import concurrent.futures
import pytz
from datetime import datetime
from typing import Dict, List, Optional

from .paper_trader import PaperTrader
from .data_loader import fetch_stock_data, get_latest_price
from .strategies import LightGBMStrategy, RSIStrategy
from .core.constants import NIKKEI_225_TICKERS
from .core.config import settings

logger = logging.getLogger(__name__)


class AutoTrader:
    """
    Automated Trading System (Auto-Pilot).
    Executes trades autonomously based on signals and strict risk limits.
    """

    def __init__(self, paper_trader: PaperTrader):
        self.pt = paper_trader
        self.is_running = False
        self.thread = None
        self._stop_event = threading.Event()

        # Configuration from centralized settings
        self.max_budget_per_trade = (
            settings.trading.max_position_size * settings.system.initial_capital
        )
        self.max_total_invested = settings.trading.max_total_invested or 200000.0
        self.stop_loss_pct = settings.trading.initial_stop_loss_pct
        self.scan_interval = settings.system.realtime_ttl_seconds * 10 or 300

        # Strategies
        self.strategies = {"RSI": RSIStrategy(), "LightGBM": LightGBMStrategy()}

        # State
        self.last_scan_time = None
        self.scan_status = "Idle"
        self.executor = concurrent.futures.ThreadPoolExecutor(max_workers=5)

    def _is_market_open(self) -> bool:
        """Check if Tokyo Market is open (09:00-11:30, 12:30-15:00 JST)."""
        tz = pytz.timezone("Asia/Tokyo")
        now = datetime.now(tz)

        # Weekend check
        if now.weekday() >= 5:
            return False

        current_time = now.time()
        morning_open = datetime.strptime("09:00", "%H:%M").time()
        morning_close = datetime.strptime("11:30", "%H:%M").time()
        afternoon_open = datetime.strptime("12:30", "%H:%M").time()
        afternoon_close = datetime.strptime("15:00", "%H:%M").time()

        is_morning = morning_open <= current_time <= morning_close
        is_afternoon = afternoon_open <= current_time <= afternoon_close

        return is_morning or is_afternoon

    def start(self):
        """Start the auto-trading loop in a background thread."""
        if self.is_running:
            return

        self.is_running = True
        self._stop_event.clear()
        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.thread.start()
        logger.info("AutoTrader started.")

    def stop(self):
        """Stop the auto-trading loop."""
        self.is_running = False
        self._stop_event.set()
        if self.thread:
            self.thread.join(timeout=5)
        self.scan_status = "Stopped"
        logger.info("AutoTrader stopped.")

    def get_status(self) -> Dict:
        """Return current status and config."""
        return {
            "is_running": self.is_running,
            "scan_status": self.scan_status,
            "last_scan_time": self.last_scan_time,
            "config": {
                "max_budget_per_trade": self.max_budget_per_trade,
                "max_total_invested": self.max_total_invested,
                "scan_interval": self.scan_interval,
            },
        }

    def _run_loop(self):
        """Main autonomous loop."""
        while not self._stop_event.is_set():
            try:
                self.scan_status = "Scanning..."
                self.last_scan_time = datetime.now().isoformat()
                logger.info("AutoTrader: Starting market scan...")

                self._check_and_trade()

                self.scan_status = "Sleeping"
                logger.info(f"AutoTrader: Sleeping for {self.scan_interval}s...")

                # Sleep in short bursts to allow quick stop
                for _ in range(self.scan_interval):
                    if self._stop_event.is_set():
                        break
                    time.sleep(1)

            except Exception as e:
                logger.error(f"AutoTrader loop error: {e}")
                self.scan_status = "Error"
                time.sleep(60)

    def _check_and_trade(self):
        """Execute the trading logic pipeline."""
        # Check Market Hours
        if not self._is_market_open():
            logger.info("AutoTrader: Market closed. Sleeping...")
            self.scan_status = "Market Closed"
            # Sleep longer if closed (handled in loop by status check or just return)
            # Actually loop waits scan_interval. Let's return.
            return

        # 1. Check Risk / Stop Loss / Take Profit
        self._monitor_positions()

        # 2. Check Budget Availability
        balance = self.pt.get_current_balance()
        invested = balance.get("invested_amount", 0)
        cash = balance.get("cash", 0)

        if invested >= self.max_total_invested:
            logger.info("AutoTrader: Max total investment reached. Skipping buys.")
            return

        if cash < self.max_budget_per_trade:
            logger.info("AutoTrader: Insufficient cash for new trade.")
            return

        # 3. Parallel Scan for New Opportunities
        # Use ThreadPoolExecutor to analyze tickers concurrently
        targets = NIKKEI_225_TICKERS

        # Filter out already owned tickers
        owned_tickers = [pos["ticker"] for _, pos in self.pt.get_positions().iterrows()]
        candidates = [t for t in targets if t not in owned_tickers]

        logger.info(f"AutoTrader: Analyzing {len(candidates)} tickers concurrently...")

        buy_signals = []

        def analyze_wrapper(t):
            if self._stop_event.is_set():
                return None
            try:
                sig = self._analyze_ticker(t)
                if sig == 1:
                    return t
            except Exception as e:
                logger.warning(f"Error analyzing {t}: {e}")
            return None

        # Execute Batch Analysis
        futures = [self.executor.submit(analyze_wrapper, t) for t in candidates]

        for future in concurrent.futures.as_completed(futures):
            res = future.result()
            if res:
                buy_signals.append(res)

        # Execute Buys (Sequential to handle budget correctly)
        for ticker in buy_signals:
            if self._stop_event.is_set():
                break
            self._execute_buy(ticker)

    def _monitor_positions(self):
        """Check existing positions for Stop Loss or Take Profit."""
        positions = self.pt.get_positions()
        if positions.empty:
            return

        for _, pos in positions.iterrows():
            ticker = pos["ticker"]
            current_price = pos["current_price"]
            avg_price = pos["avg_price"]
            qty = pos["quantity"]

            # Stop Loss check
            pnl_pct = (current_price - avg_price) / avg_price
            if pnl_pct <= -self.stop_loss_pct:
                logger.info(
                    f"AutoTrader: Stop Loss triggered for {ticker} ({pnl_pct:.1%})"
                )
                self.pt.execute_trade(
                    ticker, "SELL", int(qty), current_price, reason="Stop Loss (Auto)"
                )

            # Take Profit check (+10% or explicit target)
            elif pnl_pct >= 0.10:
                logger.info(
                    f"AutoTrader: Take Profit triggered for {ticker} ({pnl_pct:.1%})"
                )
                self.pt.execute_trade(
                    ticker, "SELL", int(qty), current_price, reason="Take Profit (Auto)"
                )

            # TODO: More complex logic (Trailing Stop) can come later

    def _analyze_ticker(self, ticker: str) -> int:
        """
        Analyze a ticker and return 1 (Buy), -1 (Sell), or 0 (Hold).
        Uses simple consensus: If RSI says Buy OR LightGBM says Buy (High Conf), return 1.
        """
        data_map = fetch_stock_data(
            [ticker], period="1y"
        )  # Need enough for LightGBM? 5y is better?
        # LightGBM needs more data. Let's use 5y for safety.
        # But fetching 5y per ticker every 5 mins is heavy.
        # Optimization: data_loader caches.

        df = data_map.get(ticker)
        if df is None or df.empty:
            return 0

        # RSI Check (Aggressive)
        rsi_res = self.strategies["RSI"].analyze(df)
        if rsi_res["signal"] == 1:
            logger.info(f"AutoTrader: Found RSI Opportunity for {ticker}")
            return 1

        # LightGBM Check (Smart)
        # Note: loading lightgbm model is fast if cached.
        lgbm_res = self.strategies["LightGBM"].analyze(df)
        if lgbm_res["signal"] == 1 and lgbm_res["confidence"] > 0.6:
            logger.info(f"AutoTrader: Found AI Opportunity for {ticker}")
            return 1

        return 0

    def _execute_buy(self, ticker: str):
        """Prepare and execute a BUY order."""
        price = get_latest_price(ticker)
        if not price:
            return

        # Calculate Logic
        # Buy max budget or min unit? Default 100 or budget limited.
        # Japanese stocks usually 100 units.
        quantity = 100
        cost = quantity * price

        if cost > self.max_budget_per_trade:
            # Cannot buy 100 units?
            # If S_Mod is enabled maybe 1 unit? But standard is 100.
            # Skip if too expensive
            logger.info(
                f"Skipping {ticker}: Min lot cost ¥{cost:,.0f} > Budget ¥{self.max_budget_per_trade:,.0f}"
            )
            return

        logger.info(f"AutoTrader: Executing BUY for {ticker} x {quantity}")
        self.pt.execute_trade(
            ticker,
            "BUY",
            quantity,
            price,
            reason="Auto-Pilot Entry",
            strategy="Auto-Consensus",
        )
