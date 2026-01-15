"""
Real-Time Trading Engine
Monitors market in real-time and executes trades based on instant signals.
"""

import asyncio
import logging
from collections import deque
from datetime import datetime
from typing import Any, Callable, Dict, Optional

import numpy as np
import yfinance as yf

logger = logging.getLogger(__name__)


class RealTimeEngine:
    """
    Real-time market monitoring and trading engine.
    Detects anomalies and executes trades instantly.
    """

    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.is_running = False
        self.price_history = {}  # ticker -> deque of prices
        self.callbacks = []

        # Configuration
        self.update_interval = self.config.get("update_interval", 1.0)  # seconds
        self.history_window = self.config.get("history_window", 100)
        self.anomaly_threshold = self.config.get("anomaly_threshold", 3.0)  # std devs

    def register_callback(self, callback: Callable):
        self.callbacks.append(callback)

    async def start(self, tickers: list):
        """Start real-time monitoring."""
        self.is_running = True
        logger.info(f"🔴 Real-time engine started for {len(tickers)} tickers")

        # Initialize price history
        for ticker in tickers:
            self.price_history[ticker] = deque(maxlen=self.history_window)

        try:
            await self._monitoring_loop(tickers)
        except Exception as e:
            logger.error(f"Real-time engine error: {e}")
        finally:
            self.is_running = False

    def stop(self):
        """Stop real-time monitoring."""
        self.is_running = False
        logger.info("🛑 Real-time engine stopped")

    async def _monitoring_loop(self, tickers: list):
        while self.is_running:
            try:
                # Fetch current prices
                prices = await self._fetch_realtime_prices(tickers)

                # Process each ticker
                for ticker, price in prices.items():
                    if price is None:
                        continue

                    # Update history
                    self.price_history[ticker].append({"timestamp": datetime.now(), "price": price})

                    # Detect anomalies
                    anomaly = self._detect_anomaly(ticker, price)
                    if anomaly:
                        await self._handle_anomaly(ticker, anomaly)

                    # Check trading signals
                    signal = self._check_signal(ticker)
                    if signal:
                        await self._handle_signal(ticker, signal)

                # Wait for next update
                await asyncio.sleep(self.update_interval)

            except Exception as e:
                logger.error(f"Monitoring loop error: {e}")
                await asyncio.sleep(self.update_interval)

    async def _fetch_realtime_prices(self, tickers: list) -> Dict[str, float]:
        """Fetch real-time prices for tickers."""
        prices = {}
        # Note: In production, use a faster stream or WebSocket.
        # yfinance is slow for real-time.
        for ticker in tickers:
            try:
                stock = yf.Ticker(ticker)
                # Fast info access
                info = stock.fast_info
                price = info.last_price
                prices[ticker] = price
            except Exception as e:
                logger.debug(f"Failed to fetch price for {ticker}: {e}")
                prices[ticker] = None
        return prices

    def _detect_anomaly(self, ticker: str, current_price: float) -> Optional[Dict[str, Any]]:
        """Detect price anomalies using statistical methods."""
        history = self.price_history.get(ticker, [])
        if len(history) < 20:
            return None

        # Calculate statistics
        prices = [h["price"] for h in history]
        mean_price = np.mean(prices)
        std_price = np.std(prices)

        if std_price == 0:
            return None

        # Z-score
        z_score = (current_price - mean_price) / std_price

        # Detect anomaly
        if abs(z_score) > self.anomaly_threshold:
            anomaly_type = "SPIKE" if z_score > 0 else "CRASH"
            return {
                "type": anomaly_type,
                "z_score": z_score,
                "current_price": current_price,
                "mean_price": mean_price,
                "std_price": std_price,
                "severity": "HIGH" if abs(z_score) > 5 else "MEDIUM",
            }
        return None

    def _check_signal(self, ticker: str) -> Optional[Dict[str, Any]]:
        """Check for trading signals based on real-time data."""
        history = self.price_history.get(ticker, [])
        if len(history) < 10:
            return None

        # Simple momentum signal
        prices = [h["price"] for h in history]
        recent_prices = prices[-10:]

        # Calculate short-term trend
        trend = (recent_prices[-1] - recent_prices[0]) / recent_prices[0]

        # Generate signal
        if trend > 0.02:  # 2% upward momentum
            return {
                "action": "BUY",
                "reason": f"Strong upward momentum: {trend:.2%}",
                "confidence": min(abs(trend) * 10, 1.0),
            }
        elif trend < -0.02:  # 2% downward momentum
            return {
                "action": "SELL",
                "reason": f"Strong downward momentum: {trend:.2%}",
                "confidence": min(abs(trend) * 10, 1.0),
            }

        return None

    async def _handle_anomaly(self, ticker: str, anomaly: Dict[str, Any]):
        """Handle detected anomaly."""
        logger.warning(f"⚠️ ANOMALY DETECTED: {ticker} - {anomaly['type']} " f"(Z-score: {anomaly['z_score']:.2f})")
        # Notify callbacks
        event = {"type": "ANOMALY", "ticker": ticker, "data": anomaly, "timestamp": datetime.now()}
        for callback in self.callbacks:
            try:
                await callback(event)
            except Exception as e:
                logger.error(f"Callback error: {e}")

    async def _handle_signal(self, ticker: str, signal: Dict[str, Any]):
        """Handle trading signal."""
        logger.info(f"📊 SIGNAL: {ticker} - {signal['action']} " f"({signal['confidence']:.0%} confidence)")
        # Notify callbacks
        event = {"type": "SIGNAL", "ticker": ticker, "data": signal, "timestamp": datetime.now()}
        for callback in self.callbacks:
            try:
                await callback(event)
            except Exception as e:
                logger.error(f"Callback error: {e}")

    def get_statistics(self, ticker: str) -> Dict[str, Any]:
        """Get real-time statistics for a ticker."""
        history = self.price_history.get(ticker, [])
        if not history:
            return {}

        prices = [h["price"] for h in history]
        timestamps = [h["timestamp"] for h in history]

        return {
            "ticker": ticker,
            "current_price": prices[-1] if prices else None,
            "mean_price": np.mean(prices),
            "std_price": np.std(prices),
            "min_price": np.min(prices),
            "max_price": np.max(prices),
            "data_points": len(prices),
            "time_range": {
                "start": timestamps[0].isoformat() if timestamps else None,
                "end": timestamps[-1].isoformat() if timestamps else None,
            },
        }


class DynamicStopLoss:
    """
    Dynamic stop-loss and take-profit manager.
    Adjusts levels based on market volatility.
    """

    def __init__(self, initial_stop_pct: float = 0.02, initial_target_pct: float = 0.05):
        self.initial_stop_pct = initial_stop_pct
        self.initial_target_pct = initial_target_pct
        self.positions = {}

    def add_position(self, ticker: str, entry_price: float, quantity: int):
        self.positions[ticker] = {
            "entry_price": entry_price,
            "quantity": quantity,
            "stop_loss": entry_price * (1 - self.initial_stop_pct),
            "take_profit": entry_price * (1 + self.initial_target_pct),
            "highest_price": entry_price,
            "trailing_stop_active": False,
        }

    def update(self, ticker: str, current_price: float) -> Optional[str]:
        """
        Update position and check if stop/target hit.
        Returns:
            "STOP_LOSS", "TAKE_PROFIT", or None
        """
        if ticker not in self.positions:
            return None

        position = self.positions[ticker]

        # Update highest price
        if current_price > position["highest_price"]:
            position["highest_price"] = current_price

            # Activate trailing stop if profit > 3%
            if current_price > position["entry_price"] * 1.03:
                position["trailing_stop_active"] = True
                # Trail stop at 1.5% below highest
                position["stop_loss"] = current_price * 0.985

        # Check stop loss
        if current_price <= position["stop_loss"]:
            return "STOP_LOSS"

        # Check take profit
        if current_price >= position["take_profit"]:
            return "TAKE_PROFIT"

        return None

    def remove_position(self, ticker: str):
        if ticker in self.positions:
            del self.positions[ticker]

    def get_position_status(self, ticker: str) -> Optional[Dict[str, Any]]:
        """Get current position status."""
        return self.positions.get(ticker)
