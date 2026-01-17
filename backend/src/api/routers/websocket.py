"""
WebSocket router for real-time market regime updates.
"""

import asyncio
import json
import logging
from typing import Dict, List

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from src.regime_detector import RegimeDetector

logger = logging.getLogger(__name__)

router = APIRouter()
regime_detector = RegimeDetector()

# Store active WebSocket connections
active_connections: List[WebSocket] = []


@router.websocket("/ws/regime")
async def regime_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for real-time regime updates.
    """
    await websocket.accept()
    active_connections.append(websocket)
    logger.info(
        f"New WebSocket connection established. Total connections: {len(active_connections)}"
    )

    try:
        # Send initial regime state
        await _send_regime_update(websocket)

        # Keep connection alive and send periodic updates
        while True:
            await asyncio.sleep(30)  # Update every 30 seconds
            await _send_regime_update(websocket)

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        if websocket in active_connections:
            active_connections.remove(websocket)
        logger.info(
            f"WebSocket connection closed. Total connections: {len(active_connections)}"
        )


async def _send_regime_update(websocket: WebSocket):
    """
    Send current regime state to a specific WebSocket connection.
    """
    try:
        # Get current regime statistics
        stats = regime_detector.get_regime_statistics()

        # Add current strategy
        strategy = regime_detector.get_regime_strategy()

        update_data = {
            "type": "regime_update",
            "data": {
                "current_regime": stats.get("current_regime"),
                "strategy": strategy,
                "statistics": stats,
                "timestamp": stats.get("regime_history", [{}])[-1].get("timestamp")
                if stats.get("regime_history")
                else None,
            },
        }

        await websocket.send_text(json.dumps(update_data, default=str))
    except Exception as e:
        logger.error(f"Error sending regime update: {e}")


async def broadcast_regime_update():
    """
    Broadcast regime update to all connected WebSocket clients.
    Call this when regime changes or on market data updates.
    """
    if not active_connections:
        return

    # Get current regime statistics
    stats = regime_detector.get_regime_statistics()
    strategy = regime_detector.get_regime_strategy()

    update_data = {
        "type": "regime_update",
        "data": {
            "current_regime": stats.get("current_regime"),
            "strategy": strategy,
            "statistics": stats,
            "timestamp": stats.get("regime_history", [{}])[-1].get("timestamp")
            if stats.get("regime_history")
            else None,
        },
    }

    # Send to all active connections
    disconnected = []
    for connection in active_connections:
        try:
            await connection.send_text(json.dumps(update_data, default=str))
        except Exception as e:
            logger.error(f"Error broadcasting to connection: {e}")
            disconnected.append(connection)

    # Remove disconnected connections
    for conn in disconnected:
        if conn in active_connections:
            active_connections.remove(conn)


def update_regime_with_data(df, vix_value=None):
    """
    Update regime detector with new market data and broadcast changes.
    Call this function when new market data is available.
    """
    try:
        regime = regime_detector.detect_regime(df, vix_value)
        logger.info(f"Regime updated to: {regime}")

        # Broadcast update asynchronously
        asyncio.create_task(broadcast_regime_update())

    except Exception as e:
        logger.error(f"Error updating regime: {e}")


async def start_regime_monitoring():
    """
    Start background task to monitor market regime and broadcast updates.
    """
    logger.info("Starting regime monitoring...")

    while True:
        try:
            # Fetch market data for key indices
            from src.data_loader import fetch_stock_data

            # Monitor major indices for regime detection
            tickers = ["^GSPC", "^VIX"]  # S&P 500 and VIX
            data_map = fetch_stock_data(tickers, period="1mo")

            if data_map.get("^GSPC") is not None:
                df = data_map["^GSPC"]
                vix_value = None
                if data_map.get("^VIX") is not None:
                    vix_value = float(data_map["^VIX"]["Close"].iloc[-1])

                # Update regime and broadcast
                update_regime_with_data(df, vix_value)

        except Exception as e:
            logger.error(f"Error in regime monitoring: {e}")

        # Wait for next update (every 5 minutes)
        await asyncio.sleep(300)


# Export functions for use by other modules
__all__ = [
    "router",
    "broadcast_regime_update",
    "update_regime_with_data",
    "regime_detector",
    "start_regime_monitoring",
]
