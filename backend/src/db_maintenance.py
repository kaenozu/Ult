"""
Database Maintenance Module
Handles database optimization, indexing, and backups.
"""

import logging
import os
import shutil
import sqlite3
from datetime import datetime
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DatabaseMaintenance:
    def __init__(self, db_path: str = "paper_trading.db"):
        self.db_path = db_path
        self.backup_dir = Path("backups")
        self.backup_dir.mkdir(exist_ok=True)

    def create_indexes(self):
        """Create indexes for better query performance."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Create indexes
            indexes = [
                "CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(date)",
                "CREATE INDEX IF NOT EXISTS idx_orders_ticker ON orders(ticker)",
                "CREATE INDEX IF NOT EXISTS idx_positions_ticker ON positions(ticker)",
                "CREATE INDEX IF NOT EXISTS idx_balance_date ON balance(date)",
            ]

            for index_sql in indexes:
                cursor.execute(index_sql)
                logger.info(f"Created index: {index_sql}")

            conn.commit()
            conn.close()

            logger.info("All indexes created successfully")
            return True

        except Exception as e:
            logger.error(f"Error creating indexes: {e}")
            return False

    def backup_database(self, prefix: str = "paper_trading") -> str:
        """
        Create a backup of the database.

        Args:
            prefix: Prefix for backup filename

        Returns:
            Path to backup file
        """
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_path = self.backup_dir / f"{prefix}_{timestamp}.db"

            shutil.copy2(self.db_path, backup_path)
            logger.info(f"Database backed up to: {backup_path}")

            # Clean old backups (keep last 30)
            self._cleanup_old_backups(keep=30)

            return str(backup_path)

        except Exception as e:
            logger.error(f"Error backing up database: {e}")
            return ""

    def _cleanup_old_backups(self, keep: int = 30):
        """Remove old backup files, keeping only the most recent ones."""
        try:
            backups = sorted(self.backup_dir.glob("*.db"), key=os.path.getmtime, reverse=True)

            for old_backup in backups[keep:]:
                old_backup.unlink()
                logger.info(f"Removed old backup: {old_backup}")

        except Exception as e:
            logger.error(f"Error cleaning up backups: {e}")

    def vacuum_database(self):
        """Optimize database by running VACUUM."""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.execute("VACUUM")
            conn.close()

            logger.info("Database vacuumed successfully")
            return True

        except Exception as e:
            logger.error(f"Error vacuuming database: {e}")
            return False

    def get_database_stats(self) -> dict:
        """Get database statistics."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            stats = {}

            # Get table sizes
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = cursor.fetchall()

            for table in tables:
                table_name = table[0]
                cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                count = cursor.fetchone()[0]
                stats[f"{table_name}_count"] = count

            # Get database file size
            stats["file_size_mb"] = os.path.getsize(self.db_path) / (1024 * 1024)

            conn.close()

            return stats

        except Exception as e:
            logger.error(f"Error getting database stats: {e}")
            return {}


if __name__ == "__main__":
    # Run maintenance
    maintenance = DatabaseMaintenance()

    print("Creating indexes...")
    maintenance.create_indexes()

    print("\nBacking up database...")
    backup_path = maintenance.backup_database()
    print(f"Backup created: {backup_path}")

    print("\nDatabase stats:")
    stats = maintenance.get_database_stats()
    for key, value in stats.items():
        print(f"  {key}: {value}")
