"""
Persistent Cache - SQLiteによる永続キャッシュ
再起動後もキャッシュを維持
"""

import logging
import os
import pickle
import sqlite3
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

DB_PATH = "data/prediction_cache.db"


class PersistentCache:
    """SQLite永続キャッシュ"""

    def __init__(self, ttl_hours: int = 24, db_path: str = DB_PATH):
        self.ttl = timedelta(hours=ttl_hours)
        self.db_path = str(db_path)
        self._init_db()

    def _init_db(self):
        """データベース初期化"""
        directory = os.path.dirname(self.db_path) or "."
        os.makedirs(directory, exist_ok=True)

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS cache (
                    key TEXT PRIMARY KEY,
                    value BLOB,
                    created_at TEXT,
                    expires_at TEXT
                )
            """
            )

            conn.commit()

    def get(self, key: str) -> Optional[Any]:
        """キャッシュから取得"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()

                cursor.execute("SELECT value, expires_at FROM cache WHERE key = ?", (key,))

                row = cursor.fetchone()

            if row is None:
                return None

            value_blob, expires_at = row

            # 期限チェック
            if datetime.fromisoformat(expires_at) < datetime.now():
                self.delete(key)
                return None

            return pickle.loads(value_blob)

        except Exception as e:
            logger.warning(f"Cache get error: {e}")
            return None

    def set(self, key: str, value: Any):
        """キャッシュに保存"""
        try:
            now = datetime.now()
            expires_at = now + self.ttl

            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()

                cursor.execute(
                    """
                    INSERT OR REPLACE INTO cache (key, value, created_at, expires_at)
                    VALUES (?, ?, ?, ?)
                """,
                    (key, pickle.dumps(value), now.isoformat(), expires_at.isoformat()),
                )

                conn.commit()

        except Exception as e:
            logger.warning(f"Cache set error: {e}")

    def delete(self, key: str):
        """キャッシュから削除"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM cache WHERE key = ?", (key,))
                conn.commit()
        except Exception as e:
            logger.warning(f"Cache delete error: {e}")

    def clear_expired(self):
        """期限切れエントリを削除"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()

                cursor.execute(
                    "DELETE FROM cache WHERE expires_at < ?",
                    (datetime.now().isoformat(),),
                )

                deleted = cursor.rowcount
                conn.commit()

            logger.info(f"Cleared {deleted} expired cache entries")
            return deleted

        except Exception as e:
            logger.warning(f"Clear expired error: {e}")
            return 0

    def get_stats(self) -> Dict:
        """キャッシュ統計を取得"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()

                cursor.execute("SELECT COUNT(*) FROM cache")
                total = cursor.fetchone()[0]

                cursor.execute(
                    "SELECT COUNT(*) FROM cache WHERE expires_at >= ?",
                    (datetime.now().isoformat(),),
                )
                valid = cursor.fetchone()[0]

            return {
                "total_entries": total,
                "valid_entries": valid,
                "expired_entries": total - valid,
            }

        except Exception as e:
            logger.warning(f"Stats error: {e}")
            return {"total_entries": 0, "valid_entries": 0, "expired_entries": 0}


# シングルトン
_cache = None


def get_persistent_cache() -> PersistentCache:
    global _cache
    if _cache is None:
        _cache = PersistentCache(ttl_hours=24)
    return _cache
