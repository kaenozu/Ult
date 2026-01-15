import sqlite3
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def optimize_sqlite_connection(conn: sqlite3.Connection):
    """Enable performance optimizations for a SQLite connection."""
    try:
        cursor = conn.cursor()
        # Enable WAL mode for better concurrency
        cursor.execute("PRAGMA journal_mode=WAL;")
        # Keep more pages in memory
        cursor.execute("PRAGMA cache_size=-64000;")  # 64MB
        # Faster sync mode (trading off crash safety for speed, NORMAL is a good balance)
        cursor.execute("PRAGMA synchronous=NORMAL;")
        # Use memory for temp tables
        cursor.execute("PRAGMA temp_store=MEMORY;")
    except Exception as e:
        logger.warning(f"Failed to optimize SQLite connection: {e}")


def create_composite_indexes(db_path: str, table_name: str, columns: list):
    """Create a composite index if it doesn't exist."""
    index_name = f"idx_{table_name}_{'_'.join(columns)}"
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cols_str = ", ".join(columns)
        cursor.execute(f"CREATE INDEX IF NOT EXISTS {index_name} ON {table_name} ({cols_str})")
        conn.commit()
        conn.close()
        logger.info(f"Ensured index {index_name} on {table_name}")
    except Exception as e:
        logger.warning(f"Failed to create index {index_name}: {e}")
