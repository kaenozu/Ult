# Market Data Broadcaster
# Phase 3: Realtime Synapse

import asyncio
import logging
from typing import Optional

import pandas as pd

from src.api.websocket_manager import manager
from src.api.websocket_types import (
    RegimeUpdatePayload,
    MarketRegimeEnum,
    MessageFactory,
)
from src.regime_detector import RegimeDetector

logger = logging.getLogger(__name__)


# ============================================================================
# MARKET DATA BROADCASTER
# ============================================================================


class MarketDataBroadcaster:
    """
    Broadcasts market data updates to subscribed WebSocket clients.
    Strictly typed - uses WsMessageEnvelope for all broadcasts.
    """

    def __init__(self, interval_seconds: int = 30):
        self.interval_seconds = interval_seconds
        self.is_running = False
        self.regime_detector = RegimeDetector()
        self._broadcast_task: Optional[asyncio.Task] = None

    async def start(self):
        """Start the broadcaster background task"""
        if self.is_running:
            logger.warning("Broadcaster already running")
            return

        self.is_running = True
        logger.info(
            f"Starting market data broadcaster (interval: {self.interval_seconds}s)"
        )

        self._broadcast_task = asyncio.create_task(self._broadcast_loop())

    async def stop(self):
        """Stop the broadcaster background task"""
        if not self.is_running:
            return

        self.is_running = False
        if self._broadcast_task:
            self._broadcast_task.cancel()
            try:
                await self._broadcast_task
            except asyncio.CancelledError:
                pass

        logger.info("Market data broadcaster stopped")

    async def _broadcast_loop(self):
        """Main broadcast loop"""
        while self.is_running:
            try:
                await self._fetch_and_broadcast_regime()
                await asyncio.sleep(self.interval_seconds)
            except asyncio.CancelledError:
                logger.info("Broadcast loop cancelled")
                break
            except Exception as e:
                logger.error(f"Error in broadcast loop: {e}")
                await asyncio.sleep(self.interval_seconds)

    async def _fetch_and_broadcast_regime(self):
        """
        Fetch market data and broadcast regime updates.
        Uses the existing regime detector.
        """
        try:
            # Fetch market data (using existing data_loader)
            from src.data_temp.data_loader import fetch_realtime_data

            # Monitor a representative stock for regime detection
            monitor_symbol = "7203.T"  # Toyota

            df = await asyncio.to_thread(
                fetch_realtime_data,
                ticker=monitor_symbol,
                period="5d",
                interval="15m",
            )

            if df is None or df.empty:
                logger.warning(f"No data fetched for {monitor_symbol}")
                return

            # Detect regime
            regime_str, confidence = self.regime_detector.detect_regime_with_confidence(df)
            strategy = self.regime_detector.get_regime_strategy(regime_str)

            # Map to our strict enum
            regime_enum = self._map_regime_to_enum(regime_str)

            # Get current price
            current_price = float(df["Close"].iloc[-1])

            # Broadcast regime update
            regime_msg = MessageFactory.regime_update(
                regime=regime_enum,
                confidence=confidence,
                strategy=strategy.get("strategy", "unknown"),
            )
            regime_msg.payload.indicators = {
                "current_price": current_price,
                "trend": strategy.get("trend", "unknown"),
                "volatility": strategy.get("volatility", "unknown"),
            }

            # Broadcast to regime channel
            sent_count = await manager.broadcast(regime_msg, channel="regime")
            logger.info(
                f"Regime update broadcast to {sent_count} connections: {regime_enum.value}"
            )

        except Exception as e:
            logger.error(f"Error fetching/broadcasting regime: {e}")

    def _map_regime_to_enum(self, regime_str: str) -> MarketRegimeEnum:
        """Map regime detector output to our strict enum"""
        mapping = {
            "trending_up": MarketRegimeEnum.BULL,
            "trending_down": MarketRegimeEnum.BEAR,
            "ranging": MarketRegimeEnum.SIDEWAYS,
            "high_volatility": MarketRegimeEnum.VOLATILE,
            "CRASH (市場崩壊警報)": MarketRegimeEnum.CRASH,
        }
        return mapping.get(regime_str.lower(), MarketRegimeEnum.UNCERTAIN)

    async def broadcast_regime_update(
        self,
        regime: MarketRegimeEnum,
        confidence: float,
        strategy: str,
        indicators: Optional[dict[str, float]] = None,
    ):
        """
        Manually broadcast a regime update.
        Useful for testing or external triggers.
        """
        regime_msg = MessageFactory.regime_update(
            regime=regime,
            confidence=confidence,
            strategy=strategy,
        )

        if indicators:
            regime_msg.payload.indicators = indicators

        sent_count = await manager.broadcast(regime_msg, channel="regime")
        logger.info(f"Manual regime update broadcast to {sent_count} connections")

    async def broadcast_price_alert(
        self,
        ticker: str,
        name: Optional[str],
        current_price: float,
        previous_price: float,
        alert_type: str,
        severity: str,
    ):
        """
        Broadcast a price alert.
        """
        from src.api.websocket_types import PriceAlertPayload

        change_percent = ((current_price - previous_price) / previous_price) * 100

        alert_msg = MessageFactory.price_alert(
            ticker=ticker,
            name=name,
            current_price=current_price,
            previous_price=previous_price,
            change_percent=change_percent,
            alert_type=alert_type,  # type: ignore
            severity=severity,  # type: ignore
        )

        sent_count = await manager.broadcast(alert_msg, channel="price_alerts")
        logger.info(f"Price alert broadcast to {sent_count} connections: {ticker}")


# ============================================================================
# GLOBAL INSTANCE
# ============================================================================

broadcaster = MarketDataBroadcaster(interval_seconds=30)
