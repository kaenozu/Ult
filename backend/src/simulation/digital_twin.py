"""
Digital Twin Management
Manages 'Shadow Portfolios' that simulate alternative decision-making paths
to evaluate risk tolerance and strategy effectiveness.
"""

import os
import logging
import sqlite3
from datetime import datetime
from typing import Any, Dict

from src.data_loader import fetch_stock_data

logger = logging.getLogger(__name__)


class DigitalTwin:
    """
    Simulates alternative realities (Aggressive vs Conservative) to benchmark
    against the actual real-world portfolio decisions.
    """

    def __init__(self, db_path: str = "data/digital_twin.db"):
        self.db_path = db_path
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self._init_db()

    def _init_db(self):
        """Initializes the shadow portfolio database."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS shadow_positions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        twin_type TEXT NOT NULL,
                        ticker TEXT NOT NULL,
                        entry_price REAL,
                        quantity REAL,
                        entry_timestamp TEXT,
                        status TEXT DEFAULT 'OPEN'
                    )
                """
                )
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS performance_snapshot (
                        timestamp TEXT NOT NULL,
                        twin_type TEXT NOT NULL,
                        total_equity REAL,
                        unrealized_pnl REAL
                    )
                """
                )
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to init digital twin DB: {e}")

    def record_decision(self, ticker: str, original_decision: str, current_price: float):
        """
        Records what the twin WOULD have done.
        Original might be HOLD, but Aggressive might BUY.
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()

                # 1. Aggressive Twin: More prone to buying
                if original_decision in ["BUY", "HOLD"]:
                    cursor.execute(
                        "INSERT INTO shadow_positions (twin_type, ticker, entry_price, quantity, entry_timestamp) VALUES (?, ?, ?, ?, ?)",
                        ("AGGRESSIVE", ticker, current_price, 10, datetime.now().isoformat()),
                    )

                # 2. Conservative Twin: More prone to selling/holding
                if original_decision == "BUY":
                    # Only buy half size if real world buys
                    cursor.execute(
                        "INSERT INTO shadow_positions (twin_type, ticker, entry_price, quantity, entry_timestamp) VALUES (?, ?, ?, ?, ?)",
                        ("CONSERVATIVE", ticker, current_price, 5, datetime.now().isoformat()),
                    )

                conn.commit()
                logger.info(f"🎭 [Twin] Decision recorded for {ticker}")
        except Exception as e:
            logger.error(f"Failed to record shadow decision: {e}")

    def get_twin_performance(self) -> Dict[str, Any]:
        """Calculates REAL unrealized profit for twin portfolios by fetching latest prices."""
        results = {}
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()

                for twin_type in ["AGGRESSIVE", "CONSERVATIVE"]:
                    cursor.execute(
                        "SELECT ticker, entry_price, quantity FROM shadow_positions WHERE twin_type = ? AND status = 'OPEN'",
                        (twin_type,),
                    )
                    positions = [dict(row) for row in cursor.fetchall()]

                    if not positions:
                        results[twin_type] = {"pnl": 0.0, "pnl_pct": 0.0}
                        continue

                    # Fetch latest prices
                    tickers = list(set(p["ticker"] for p in positions))
                    try:
                        price_data = fetch_stock_data(tickers, period="1d")
                        total_cost = 0.0
                        total_current = 0.0

                        for p in positions:
                            ticker = p["ticker"]
                            cost = p["entry_price"] * p["quantity"]
                            total_cost += cost

                            if ticker in price_data and not price_data[ticker].empty:
                                current_price = price_data[ticker]["Close"].iloc[-1]
                                total_current += current_price * p["quantity"]
                            else:
                                total_current += cost  # Use cost as fallback

                        pnl = total_current - total_cost
                        pnl_pct = (pnl / total_cost * 100) if total_cost > 0 else 0.0

                        results[twin_type] = {
                            "pnl": round(pnl, 0),
                            "pnl_pct": round(pnl_pct, 2),
                            "count": len(positions),
                        }
                    except Exception as e:
                        logger.warning(f"Failed to fetch price for twin perf: {e}")
                        results[twin_type] = {"pnl": 0.0, "pnl_pct": 0.0, "error": True}

            return results
        except Exception as e:
            logger.error(f"Failed to get twin performance: {e}")
            return {}
