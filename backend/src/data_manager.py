import logging
import sqlite3
import pandas as pd
from datetime import datetime
from typing import Optional
from pathlib import Path
from .config import settings

logger = logging.getLogger(__name__)


class DataManager:
    """
    Hybrid Data Storage Manager.
    - OHLCV Data: Stored in Parquet (Columnar, fast I/O)
    - Metadata/Status: Stored in SQLite (Relational, easy query)
    """

    def __init__(self, db_path: str = None):
        # Use settings for paths, fallback for backwards compatibility if arg provided
        self.db_path = str(settings.system.db_path) if db_path is None else db_path
        self.parquet_dir = settings.system.parquet_dir
        self._init_db()
        self._init_storage()

    def _init_storage(self):
        """Ensure storage directories exist."""
        self.parquet_dir.mkdir(parents=True, exist_ok=True)

    def _init_db(self):
        """Initialize the metadata database schema."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Metadata table (Index of what we have)
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS ticker_metadata (
                ticker TEXT PRIMARY KEY,
                last_updated TIMESTAMP,
                start_date TIMESTAMP,
                end_date TIMESTAMP,
                data_points INTEGER,
                file_path TEXT
            )
        """
        )

        # Keep legacy stock_data table for compatibility if needed,
        # but we won't actively write big data to it in v2.
        # Check if legacy table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='stock_data'")
        if not cursor.fetchone():
            # Create minimal schema if missing, just in case legacy code queries it
            cursor.execute(
                """
                CREATE TABLE stock_data (
                    ticker TEXT,
                    date TIMESTAMP,
                    open REAL, high REAL, low REAL, close REAL, volume REAL,
                    PRIMARY KEY (ticker, date)
                )
            """
            )

        conn.commit()
        conn.close()

    def _get_parquet_path(self, ticker: str) -> Path:
        # Sanitize ticker for filename (e.g. ^VIX -> VIX, USD/JPY -> USDJPY)
        safe_ticker = ticker.replace("^", "").replace("/", "").replace(":", "")
        return self.parquet_dir / f"{safe_ticker}.parquet"

    def save_data(self, df: pd.DataFrame, ticker: str):
        """
        Save DataFrame to Parquet and update metadata in SQLite.
        Expects index to be DatetimeIndex.
        """
        if df is None or df.empty:
            return

        try:
            # 1. Normalize Data
            # Ensure index name is 'date' or standardized column
            df_to_save = df.copy()

            # Standardize columns to lowercase for consistency
            df_to_save.columns = [c.lower() for c in df_to_save.columns]

            # Ensure it has standard OHLCV columns
            required = ["open", "high", "low", "close", "volume"]
            # If some missing, fill 0 (though unlikely for valid market data)
            for c in required:
                if c not in df_to_save.columns:
                    df_to_save[c] = 0.0

            # 2. Save to Parquet (Fast I/O)
            # Use 'pyarrow' engine for best performance with pandas
            file_path = self._get_parquet_path(ticker)
            df_to_save.to_parquet(file_path, engine="pyarrow", compression="snappy")

            # 3. Update Metadata in SQLite
            start_date = df_to_save.index.min()
            end_date = df_to_save.index.max()
            count = len(df_to_save)
            update_time = datetime.now()

            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO ticker_metadata (ticker, last_updated, start_date, end_date, data_points, file_path)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(ticker) DO UPDATE SET
                    last_updated=excluded.last_updated,
                    start_date=excluded.start_date,
                    end_date=excluded.end_date,
                    data_points=excluded.data_points,
                    file_path=excluded.file_path
            """,
                (ticker, update_time, str(start_date), str(end_date), count, str(file_path)),
            )
            conn.commit()
            conn.close()

            logger.info(f"Saved {count} records for {ticker} to Parquet storage.")

        except Exception as e:
            logger.error(f"Error saving data for {ticker}: {e}")
            # Fallback to pure SQLite legacy save if Parquet fails (optional, helps transition)
            # self._legacy_save(df, ticker)

    def load_data(
        self,
        ticker: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> pd.DataFrame:
        """
        Load data from Parquet storage.
        """
        try:
            file_path = self._get_parquet_path(ticker)
            if not file_path.exists():
                # Fallback: check legacy SQLite
                return self._legacy_load(ticker, start_date, end_date)

            df = pd.read_parquet(file_path, engine="pyarrow")

            # Filter by date range
            if start_date:
                df = df[df.index >= start_date]
            if end_date:
                df = df[df.index <= end_date]

            # Restore proper capital case for compatibility with existing codebase
            # Existing code expects: "Open", "High", "Low", "Close", "Volume"
            rename_map = {"open": "Open", "high": "High", "low": "Low", "close": "Close", "volume": "Volume"}
            df = df.rename(columns=rename_map)

            return df

        except Exception as e:
            logger.error(f"Error loading data for {ticker}: {e}")
            return pd.DataFrame()

    def _legacy_load(self, ticker: str, start_date: Optional[datetime], end_date: Optional[datetime]) -> pd.DataFrame:
        """Fallback to loading from old stock_data table."""
        conn = sqlite3.connect(self.db_path)
        query = "SELECT date, open, high, low, close, volume FROM stock_data WHERE ticker = ?"
        params = [ticker]
        if start_date:
            query += " AND date >= ?"
            params.append(start_date)
        if end_date:
            query += " AND date <= ?"
            params.append(end_date)
        query += " ORDER BY date ASC"

        try:
            df = pd.read_sql_query(query, conn, params=params, parse_dates=["date"])
            if not df.empty:
                df.set_index("date", inplace=True)
                df.columns = ["Open", "High", "Low", "Close", "Volume"]
            return df
        except Exception:
            return pd.DataFrame()
        finally:
            conn.close()

    def get_latest_date(self, ticker: str) -> Optional[datetime]:
        """Get the latest date available for a ticker (Metadata check first)."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Check metadata first (Faster)
        cursor.execute("SELECT end_date FROM ticker_metadata WHERE ticker = ?", (ticker,))
        row = cursor.fetchone()
        conn.close()

        if row and row[0]:
            return pd.to_datetime(row[0])

        # Fallback to loading data
        df = self.load_data(ticker)
        if not df.empty:
            return df.index.max()
        return None

    def vacuum_db(self):
        """Optimize the metadata db."""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.execute("PRAGMA journal_mode=WAL") # WALモード有効化
            conn.execute("PRAGMA synchronous=NORMAL")
            conn.execute("ANALYZE") # 統計情報の更新
            conn.execute("VACUUM") # 断片化解消
            conn.close()
            logger.info("Database optimization (DataManager) completed.")
        except Exception as e:
            logger.error(f"Database optimization error: {e}")

    def create_indexes(self):
        """必要なインデックスを作成して検索を高速化"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            # 銘柄と日付の複合インデックス
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_metadata_ticker_date ON ticker_metadata (ticker, last_updated)")
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Index creation error: {e}")
