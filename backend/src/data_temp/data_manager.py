
import sqlite3
import pandas as pd
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class DataManager:
    """
    Simple Data Manager for handling stock data persistence.
    Used by AsyncDataLoader.
    """
    def __init__(self, db_path: str = "stock_data.db"):
        self.db_path = db_path

    def load_data(self, ticker: str, start_date: Optional[str] = None) -> Optional[pd.DataFrame]:
        """
        Load stock data from SQLite database.
        
        Args:
            ticker: Stock ticker symbol
            start_date: Filter data from this date (YYYY-MM-DD string)
            
        Returns:
            DataFrame with Date index or None if error/empty
        """
        try:
            conn = sqlite3.connect(self.db_path)
            query = f"SELECT * FROM stock_prices WHERE ticker = '{ticker}'"
            if start_date:
                query += f" AND Date >= '{start_date}'"
            query += " ORDER BY Date"
            
            # Read SQL directly into DataFrame
            df = pd.read_sql(query, conn, index_col="Date", parse_dates=["Date"])
            conn.close()
            
            if df.empty:
                return None
                
            return df
        except Exception as e:
            # Table might not exist yet or other error
            # logger.debug(f"Could not load data for {ticker}: {e}")
            return None

    def save_data(self, df: pd.DataFrame, ticker: str) -> bool:
        """
        Save stock data to SQLite database.
        
        Args:
            df: DataFrame containing stock data
            ticker: Stock ticker symbol
            
        Returns:
            True if successful, False otherwise
        """
        if df is None or df.empty:
            return False
            
        try:
            conn = sqlite3.connect(self.db_path)
            
            # Prepare DataFrame for saving
            df_to_save = df.copy()
            df_to_save["ticker"] = ticker
            
            # Ensure index is named Date
            if df_to_save.index.name != "Date":
                df_to_save.index.name = "Date"
            
            # Save to database (append mode)
            # Use a replace strategy or handle duplicates if necessary, 
            # but for simplicity 'append' or 'replace' (careful with existing data)
            # Here we follow a simple append strategy, but in real app handled duplicates better.
            # Ideally we should use 'replace' if we fetch the whole range, or check existance.
            # For this fix, let's assume 'replace' for the specific ticker to avoid duplicates
            # However, 'replace' drops the table. We need to delete only rows for this ticker.
            
            cursor = conn.cursor()
            cursor.execute(f"DELETE FROM stock_prices WHERE ticker = '{ticker}'")
            # We don't commit yet
            
            df_to_save.to_sql("stock_prices", conn, if_exists="append", index=True)
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"Error saving data for {ticker}: {e}")
            return False
