import sqlite3
import datetime
import json
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


class FeedbackStore:
    """
    Stores investment committee decisions and correlates them with future market performance
    to enable "Self-Learning" for AI agents.
    """

    def __init__(self, db_path: str = "committee_feedback.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        """Initializes the feedback database."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS decision_feedback (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp TEXT NOT NULL,
                        ticker TEXT NOT NULL,
                        decision TEXT NOT NULL,
                        rationale TEXT,
                        initial_price REAL,
                        price_1w REAL,
                        return_1w REAL,
                        outcome TEXT, -- 'SUCCESS', 'FAILURE', 'NEUTRAL'
                        lesson_learned TEXT,
                        raw_data TEXT
                    )
                """
                )
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to initialize feedback DB: {e}")

    def save_decision(
        self,
        ticker: str,
        decision: str,
        rationale: str,
        current_price: float,
        raw_data: Dict[str, Any],
    ):
        """Records a new decision to be evaluated later."""
        try:
            timestamp = datetime.datetime.now().isoformat()
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    INSERT INTO decision_feedback (timestamp, ticker, decision, rationale, initial_price, raw_data)
                    VALUES (?, ?, ?, ?, ?, ?)
                """,
                    (
                        timestamp,
                        ticker,
                        decision,
                        rationale,
                        current_price,
                        json.dumps(raw_data, ensure_ascii=False),
                    ),
                )
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to save decision feedback: {e}")

    def update_outcomes(self, ticker: str, current_price: float):
        """
        Updates pending decisions for a ticker with current market data to determine outcomes.
        Looks for decisions older than 5 days but newer than 10 days to evaluate the '1-week' performance.
        """
        try:
            now = datetime.datetime.now()
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                # Find decisions that are older than 5 days and don't have price_1w yet
                cursor.execute(
                    """
                    SELECT * FROM decision_feedback
                    WHERE ticker = ? AND price_1w IS NULL
                """,
                    (ticker,),
                )
                rows = cursor.fetchall()

                for row in rows:
                    decision_time = datetime.datetime.fromisoformat(row["timestamp"])
                    days_elapsed = (now - decision_time).days

                    if days_elapsed >= 5:  # Evaluation window (approx 1 week)
                        initial_price = row["initial_price"]
                        price_1w = current_price
                        return_1w = (price_1w - initial_price) / initial_price
                        decision = row["decision"]

                        # Determine Outcome
                        outcome = "NEUTRAL"
                        if decision == "BUY":
                            outcome = "SUCCESS" if return_1w > 0.02 else "FAILURE" if return_1w < -0.01 else "NEUTRAL"
                        elif decision == "SELL":
                            outcome = "SUCCESS" if return_1w < -0.02 else "FAILURE" if return_1w > 0.01 else "NEUTRAL"

                        cursor.execute(
                            """
                            UPDATE decision_feedback
                            SET price_1w = ?, return_1w = ?, outcome = ?
                            WHERE id = ?
                        """,
                            (price_1w, return_1w, outcome, row["id"]),
                        )
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to update outcomes: {e}")

    def get_lessons_for_ticker(self, ticker: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Retrieves past lessons learned for a specific ticker or similar setups."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute(
                    """
                    SELECT * FROM decision_feedback
                    WHERE ticker = ? AND outcome IS NOT NULL
                    ORDER BY timestamp DESC LIMIT ?
                """,
                    (ticker, limit),
                )
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Failed to get lessons: {e}")
            return []

    def get_recent_failures(self, limit: int = 5) -> List[Dict[str, Any]]:
        """Retrieves recent 'FAILURE' cases to warn the AI about typical mistakes."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute(
                    """
                    SELECT * FROM decision_feedback
                    WHERE outcome = 'FAILURE'
                    ORDER BY timestamp DESC LIMIT ?
                """,
                    (limit,),
                )
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Failed to get failures: {e}")
            return []
