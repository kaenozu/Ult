import json
import sqlite3
import datetime
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


class EarningsHistory:
    """Manages persistence of earnings analysis reports."""

    def __init__(self, db_path: str = "earnings_analysis.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        """Initialize the database table."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS earnings_reports (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp TEXT NOT NULL,
                        ticker TEXT,
                        company_name TEXT,
                        period TEXT,
                        score INTEGER,
                        summary TEXT,
                        raw_json TEXT,
                        sector TEXT,
                        industry TEXT
                    )
                """
                )
                # Handle migration if ticker column doesn't exist
                try:
                    cursor.execute("SELECT ticker FROM earnings_reports LIMIT 1")
                except sqlite3.OperationalError:
                    cursor.execute("ALTER TABLE earnings_reports ADD COLUMN ticker TEXT")

                try:
                    cursor.execute("SELECT sector FROM earnings_reports LIMIT 1")
                except sqlite3.OperationalError:
                    cursor.execute("ALTER TABLE earnings_reports ADD COLUMN sector TEXT")
                    cursor.execute("ALTER TABLE earnings_reports ADD COLUMN industry TEXT")

                conn.commit()
        except Exception as e:
            logger.error(f"Failed to initialize earnings DB: {e}")

    def save_analysis(self, analysis: Dict[str, Any], ticker: str = None) -> bool:
        """Save an analysis result to the database."""
        try:
            timestamp = datetime.datetime.now().isoformat()
            ticker = ticker or analysis.get("ticker", "Unknown")
            company_name = analysis.get("company_name", "Unknown")
            period = analysis.get("period", "Unknown")
            score = analysis.get("score", 0)
            summary = analysis.get("summary", "")
            raw_json = json.dumps(analysis, ensure_ascii=False)

            sector = analysis.get("sector", "Unknown")
            industry = analysis.get("industry", "Unknown")

            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    INSERT INTO earnings_reports (timestamp, ticker, company_name, period, score, summary, raw_json, sector, industry)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                    (
                        timestamp,
                        ticker,
                        company_name,
                        period,
                        score,
                        summary,
                        raw_json,
                        sector,
                        industry,
                    ),
                )
                conn.commit()
            return True
        except Exception as e:
            logger.error(f"Failed to save analysis: {e}")
            return False

    def get_latest_for_ticker(self, ticker: str) -> Optional[Dict[str, Any]]:
        """Retrieve the latest analysis for a specific ticker."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute(
                    """
                    SELECT * FROM earnings_reports
                    WHERE ticker = ? OR company_name LIKE ?
                    ORDER BY timestamp DESC LIMIT 1
                """,
                    (ticker, f"%{ticker}%"),
                )
                row = cursor.fetchone()

                if not row:
                    return None

                item = dict(row)
                try:
                    item["analysis"] = json.loads(item["raw_json"])
                except BaseException:
                    item["analysis"] = {}
                return item
        except Exception as e:
            logger.error(f"Failed to load latest for ticker {ticker}: {e}")
            return None

    def get_history(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Retrieve analysis history."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute(
                    """
                    SELECT * FROM earnings_reports
                    ORDER BY timestamp DESC LIMIT ?
                """,
                    (limit,),
                )
                rows = cursor.fetchall()

                history = []
                for row in rows:
                    item = dict(row)
                    # Parse raw_json back to dict for easy usage
                    try:
                        item["analysis"] = json.loads(item["raw_json"])
                    except BaseException:
                        item["analysis"] = {}
                    history.append(item)
                return history
        except Exception as e:
            logger.error(f"Failed to load history: {e}")
            return []
