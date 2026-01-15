"""
Cache Manager
Handles persistent caching using SQLite to improve performance and reduce API calls.
"""

import json
import logging
import sqlite3
import time
from datetime import datetime
from typing import Any, Optional

logger = logging.getLogger(__name__)

DB_PATH = "cache.db"


class CacheManager:
    """SQLite-based Key-Value Cache with TTL support"""

    def __init__(self, db_path=DB_PATH):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS cache (
                    key TEXT PRIMARY KEY,
                    value TEXT,
                    expiry REAL,
                    created_at TEXT
                )
            """
            )
            # Index on expiry for cleanup
            conn.execute("CREATE INDEX IF NOT EXISTS idx_expiry ON cache (expiry)")

    def get(self, key: str) -> Optional[Any]:
        """Retrieve value if not expired"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("SELECT value, expiry FROM cache WHERE key = ?", (key,))
            row = cursor.fetchone()

            if row:
                value_json, expiry = row
                if expiry > time.time():
                    try:
                        return json.loads(value_json)
                    except json.JSONDecodeError:
                        return value_json  # Return raw if not JSON
                else:
                    # Lazy delete
                    self.delete(key)
        return None

    def set(self, key: str, value: Any, ttl_seconds: int = 3600):
        """Store value with TTL"""
        expiry = time.time() + ttl_seconds
        value_json = json.dumps(value, ensure_ascii=False)

        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO cache (key, value, expiry, created_at)
                VALUES (?, ?, ?, ?)
            """,
                (key, value_json, expiry, datetime.now().isoformat()),
            )

    def delete(self, key: str):
        """Remove key"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("DELETE FROM cache WHERE key = ?", (key,))

    def clear_expired(self):
        """Cleanup expired entries"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("DELETE FROM cache WHERE expiry < ?", (time.time(),))
            logger.info("Expired cache entries cleared.")
