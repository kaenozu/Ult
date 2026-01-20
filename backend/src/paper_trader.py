"""ペーパートレード機能を提供するモジュール。

このモジュールは、実際の資金を使用せずに取引戦略をテストするための仮想環境を提供します。
SQLiteデータベースを使用してポジション、残高、および注文履歴を管理します。
"""

import json
import logging
import sqlite3
import threading
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Union, Any, List, Tuple, Optional
import json

import pandas as pd


logger = logging.getLogger(__name__)


class PaperTrader:
    """ペーパートレード機能を提供するクラス。"""

    def __init__(self, db_path: str = None, initial_capital: float = None, account_id: str = None):
        if db_path is None:
            if account_id:
                db_path = f"paper_trading_{account_id}.db"
            else:
                db_path = "ult_trading.db"
        self.db_path = db_path

        # Load initial capital from config.json if not specified
        if initial_capital is None:
            try:
                config_path = Path("config.json")
                if config_path.exists():
                    with open(config_path, "r", encoding="utf-8") as f:
                        config = json.load(f)
                    initial_capital = config.get("paper_trading", {}).get("initial_capital", 1000000)
                else:
                    initial_capital = 1000000  # Default 1M JPY
            except Exception as e:
                logger.error(f"Error loading initial capital: {e}")
                initial_capital = 1000000  # Fallback to 1M JPY

        self.initial_capital = float(initial_capital)
        self.lock = threading.RLock()
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self._initialize_database()

    def _initialize_database(self):
        """Initialize the SQLite database with required tables."""
        cursor = self.conn.cursor()
        
        # パフォーマンス向上のための設定
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")

        # Create accounts table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS accounts (
                id INTEGER PRIMARY KEY,
                initial_capital REAL,
                current_balance REAL
            )
        """
        )

        # Create positions table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS positions (
                id INTEGER PRIMARY KEY,
                ticker TEXT UNIQUE,
                quantity INTEGER,
                avg_price REAL,
                entry_price REAL DEFAULT 0.0,
                entry_date TEXT,
                current_price REAL DEFAULT 0.0,
                stop_price REAL DEFAULT 0.0,
                highest_price REAL DEFAULT 0.0
            )
        """
        )

        # Create orders table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY,
                ticker TEXT,
                action TEXT,
                quantity INTEGER,
                price REAL,
                strategy_name TEXT,
                thought_context TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """
        )
        # インデックス追加
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_orders_ticker_time ON orders (ticker, timestamp)")

        # Create balance table for equity history
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS balance (
                date TEXT PRIMARY KEY,
                total_equity REAL,
                cash REAL,
                invested REAL
            )
        """
        )
        # 日付インデックス
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_balance_date ON balance (date)")

        # Initialize account balance if not exists
        cursor.execute("SELECT COUNT(*) FROM accounts")
        if cursor.fetchone()[0] == 0:
            cursor.execute(
                """
                INSERT INTO accounts (initial_capital, current_balance)
                VALUES (?, ?)
            """,
                (self.initial_capital, self.initial_capital),
            )



        with self.lock:
             self.conn.commit()
        
        # Ensure data consistency on startup
        self.recalculate_balance()

    def recalculate_balance(self):
        """
        Recalculates the current cash balance based on initial capital and order history.
        This fixes potential data corruption where orders exist but balance wasn't updated.
        """
        try:
            cursor = self.conn.cursor()
            
            # Since we don't have a deposits table, we'll assume the 'initial_capital' 
            # in the accounts table is the starting point.
            
            cursor.execute("SELECT initial_capital FROM accounts WHERE id=1")
            res = cursor.fetchone()
            if not res: return
            start_cap = res[0]
            
            # Sum up all BUYs and SELLs
            cursor.execute("SELECT action, quantity, price FROM orders")
            orders = cursor.fetchall()
            
            calculated_balance = start_cap
            
            for action, qty, price in orders:
                if price is None: continue
                amount = qty * price
                if action == "BUY":
                    calculated_balance -= amount
                elif action == "SELL":
                    calculated_balance += amount
            
            # Update the accounts table
            cursor.execute("UPDATE accounts SET current_balance = ? WHERE id = 1", (calculated_balance,))
            self.conn.commit()
            logger.info(f"Balance recalculated from history: {calculated_balance:,.0f} JPY")
            
        except Exception as e:
            logger.error(f"Failed to recalculate balance: {e}")

    def optimize_database(self):
        """データベースの最適化を実行"""
        try:
            self.conn.execute("ANALYZE")
            self.conn.execute("VACUUM")
            logger.info("PaperTrader database optimized.")
        except Exception as e:
            logger.error(f"DB optimization error: {e}")

    def get_balance(self) -> float:
        """Get the current cash balance."""
        with self.lock:
            return self._get_balance_unsafe()

    def _get_balance_unsafe(self) -> float:
        """Internal unsafe get_balance (must be called within lock)."""
        cursor = self.conn.cursor()
        cursor.execute("SELECT current_balance FROM accounts LIMIT 1")
        result = cursor.fetchone()
        return result[0] if result else 0.0

    def get_position(self, ticker: str) -> Dict[str, Union[int, float]]:
        """Get the current position for a given ticker."""
        with self.lock:
            return self._get_position_unsafe(ticker)

    def _get_position_unsafe(self, ticker: str) -> Dict[str, Union[int, float]]:
        """Internal unsafe get_position (must be called within lock)."""
        cursor = self.conn.cursor()
        cursor.execute("SELECT quantity, avg_price FROM positions WHERE ticker = ?", (ticker,))
        result = cursor.fetchone()
        if result:
            return {"quantity": result[0], "avg_price": result[1]}
        return {"quantity": 0, "avg_price": 0.0}

    def get_positions(self) -> pd.DataFrame:
        """Get all current positions as a DataFrame with market data.

        Returns:
            pd.DataFrame: DataFrame with columns [ticker, quantity, avg_price, current_price,
                                                market_value, unrealized_pnl, unrealized_pnl_pct, sector]
        """
        try:
            cursor = self.conn.cursor()
            # Select all columns
            cursor.execute("SELECT * FROM positions WHERE quantity > 0")
            columns = [description[0] for description in cursor.description]
            rows = cursor.fetchall()

            if not rows:
                return pd.DataFrame()

            positions = []
            tickers = [r[columns.index("ticker")] for r in rows]
            
            # Fetch current prices (using external data loader)
            try:
                from src.data_temp.data_loader import fetch_stock_data
                # Batch fetch prices for better performance
                data_map = fetch_stock_data(tickers, period="1mo")
                prices = {}
                volatilities = {}
                for ticker in tickers:
                    df = data_map.get(ticker)
                    if df is not None and not df.empty:
                        prices[ticker] = float(df["Close"].iloc[-1])
                        rets = df["Close"].pct_change().dropna()
                        vol = rets.std() * df["Close"].iloc[-1]
                        volatilities[ticker] = float(vol) if not pd.isna(vol) else 0.0
                    else:
                        prices[ticker] = 0.0
                        volatilities[ticker] = 0.0
            except Exception as e:
                logger.warning(f"Batch fetch failed: {e}")
                prices = {t: 0.0 for t in tickers}
                volatilities = {t: 0.0 for t in tickers}

            for row in rows:
                pos = dict(zip(columns, row))
                ticker = pos.get("ticker")
                qty = pos.get("quantity")
                avg_p = pos.get("avg_price", 0.0)
                
                # Use current price if available, fallback to stored current_price then avg_price
                curr_p = prices.get(ticker, 0.0)
                if curr_p <= 0:
                    curr_p = pos.get("current_price", 0.0)
                if curr_p <= 0:
                    curr_p = avg_p
                
                m_val = qty * curr_p
                
                if avg_p > 0:
                    u_pnl = m_val - (qty * avg_p)
                    u_pnl_pct = u_pnl / (qty * avg_p)
                else:
                    u_pnl = 0.0
                    u_pnl_pct = 0.0
                
                positions.append({
                    "ticker": ticker,
                    "quantity": qty,
                    "avg_price": avg_p,
                    "entry_price": pos.get("entry_price", avg_p),
                    "entry_date": pos.get("entry_date"),
                    "volatility": volatilities.get(ticker, 0.0),
                    "current_price": curr_p,
                    "market_value": m_val,
                    "unrealized_pnl": u_pnl,
                    "unrealized_pnl_pct": u_pnl_pct,
                    "sector": "Market",
                    "stop_price": pos.get("stop_price", 0.0),
                    "highest_price": pos.get("highest_price", 0.0)
                })
            
            return pd.DataFrame(positions)

        except Exception as e:
            logger.error(f"Error getting positions: {e}")
            return pd.DataFrame()

    def update_position_stop(self, ticker: str, stop_price: float, highest_price: float) -> bool:
        """Update stop price and highest price for a position."""
        with self.lock:
            try:
                cursor = self.conn.cursor()
                cursor.execute(
                    "UPDATE positions SET stop_price = ?, highest_price = ? WHERE ticker = ?",
                    (stop_price, highest_price, ticker)
                )
                self.conn.commit()
                return True
            except Exception as e:
                logger.error(f"Error updating position stop: {e}")
                return False

    def get_trade_history(self, limit: int = 1000, start_date: Optional[datetime] = None) -> pd.DataFrame:
        """Get trade history as DataFrame."""
        try:
            query = "SELECT * FROM orders"
            params = []
            if start_date:
                query += " WHERE timestamp >= ?"
                params.append(start_date.isoformat())
            query += " ORDER BY timestamp DESC LIMIT ?"
            params.append(limit)
            
            return pd.read_sql_query(query, self.conn, params=params)
        except Exception as e:
            logger.error(f"Error fetching trade history: {e}")
            return pd.DataFrame()

    def get_current_balance(self) -> Dict[str, float]:
        """Get balance summary including estimated total equity."""
        cash = self.get_balance()
        positions = self.get_positions()
        
        invested = 0.0
        unrealized_pnl = 0.0
        if not positions.empty:
            invested = (positions["quantity"] * positions["avg_price"]).sum()
            if "unrealized_pnl" in positions.columns:
                unrealized_pnl = positions["unrealized_pnl"].sum()
        
        total_equity = cash + invested + unrealized_pnl
        
        # Calculate daily pnl
        try:
            from src.utils_temp.pnl_utils import calculate_daily_pnl_standalone
            daily_pnl, _ = calculate_daily_pnl_standalone(self.db_path, total_equity)
        except Exception:
            daily_pnl = 0.0
            
        return {
            "cash": cash,
            "total_equity": total_equity,
            "invested_amount": invested,
            "unrealized_pnl": unrealized_pnl,
            "daily_pnl": daily_pnl
        }

    def execute_order(self, order: Any) -> bool:
        """Execute a trade order."""
        with self.lock:
            try:
                balance = self._get_balance_unsafe()
                position = self._get_position_unsafe(order.ticker)

                cost = order.quantity * order.price
                if order.action == "BUY":
                    if cost > balance:
                        logger.warning(f"Insufficient balance for order: {order}")
                        return False

                    new_balance = balance - cost
                    cursor = self.conn.cursor()
                    cursor.execute("UPDATE accounts SET current_balance = ? WHERE id = 1", (new_balance,))

                    new_quantity = position["quantity"] + order.quantity
                    if position["quantity"] > 0:
                        new_avg_price = (
                            (position["quantity"] * position["avg_price"]) + (order.quantity * order.price)
                        ) / new_quantity
                    else:
                        new_avg_price = order.price

                    cursor.execute(
                        """
                        INSERT OR REPLACE INTO positions (ticker, quantity, avg_price, entry_price, entry_date, current_price, highest_price)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                        (
                            order.ticker, 
                            new_quantity, 
                            new_avg_price, 
                            new_avg_price if position["quantity"] == 0 else position.get("entry_price", new_avg_price),
                            datetime.now().strftime("%Y-%m-%d %H:%M:%S") if position["quantity"] == 0 else position.get("entry_date"),
                            order.price,
                            max(new_avg_price, order.price)
                        ),
                    )

                elif order.action == "SELL":
                    if order.quantity > position["quantity"]:
                        logger.warning(f"Trying to sell more than owned: {order}")
                        return False

                    proceeds = order.quantity * order.price
                    new_balance = balance + proceeds
                    cursor = self.conn.cursor()
                    cursor.execute("UPDATE accounts SET current_balance = ? WHERE id = 1", (new_balance,))

                    new_quantity = position["quantity"] - order.quantity
                    if new_quantity == 0:
                        cursor.execute("DELETE FROM positions WHERE ticker = ?", (order.ticker,))
                    else:
                        cursor.execute(
                            "UPDATE positions SET quantity = ? WHERE ticker = ?",
                            (new_quantity, order.ticker),
                        )

                # Log order
                # Thought Context is updated via separate update if needed, or we modify schema
                # For Phase 10, we'll assume strategy_name might hold a summary or we can add a column
                # Let's check schema first.
                
                thought_json = None
                if hasattr(order, 'thought_context') and order.thought_context:
                    thought_json = json.dumps(order.thought_context)
                
                cursor.execute(
                    """
                    INSERT INTO orders (ticker, action, quantity, price, strategy_name, thought_context)
                    VALUES (?, ?, ?, ?, ?, ?)
                """,
                    (order.ticker, order.action, order.quantity, order.price, getattr(order, "strategy", None), thought_json),
                )

                self.conn.commit()
                return True

            except Exception as e:
                logger.error(f"Error executing order: {e}")
                self.conn.rollback()
                return False

    def execute_trade(self, ticker: str, action: str, quantity: int, price: float, reason: str = "", strategy: str = None, thought_context: dict = None) -> bool:
        """Simplified trade execution."""
        class SimpleOrder:
            def __init__(self, t, a, q, p, s, tc):
                self.ticker = t
                self.action = a
                self.quantity = q
                self.price = p
                self.strategy = s
                self.thought_context = tc
        
        return self.execute_order(SimpleOrder(ticker, action, quantity, price, strategy, thought_context))

    def update_daily_equity(self):
        """Update daily equity snapshot in database."""
        with self.lock:
            try:
                summary = self.get_current_balance()
                today = datetime.now().strftime("%Y-%m-%d")
                
                cursor = self.conn.cursor()
                cursor.execute(
                    """
                    INSERT OR REPLACE INTO balance (date, total_equity, cash, invested)
                    VALUES (?, ?, ?, ?)
                """,
                    (today, summary["total_equity"], summary["cash"], summary["invested_amount"]),
                )
                self.conn.commit()
                logger.info(f"Daily equity updated for {today}: {summary['total_equity']:,.0f}")
            except Exception as e:
                logger.error(f"Error updating daily equity: {e}")

    def get_equity_history(self, days: int = None) -> pd.DataFrame:
        """Get historical equity balance as a DataFrame. Optional days limit."""
        try:
            cursor = self.conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='balance'")
            if not cursor.fetchone():
                return pd.DataFrame(columns=["date", "total_equity", "cash", "invested"])

            query = "SELECT date, total_equity, cash, invested FROM balance ORDER BY date ASC"
            df = pd.read_sql_query(query, self.conn)

            if not df.empty:
                df["date"] = pd.to_datetime(df["date"])
                if days:
                    df = df.tail(days)

            return df
        except Exception as e:
            logger.error(f"Error fetching equity history: {e}")
            return pd.DataFrame(columns=["date", "total_equity", "cash", "invested"])

    def close(self):
        """Close database connection."""
        if hasattr(self, 'conn') and self.conn:
            self.conn.close()
