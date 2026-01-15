"""
セキュアなデータマネージャーモジュール
SQLインジェクション対策と入力検証を実装
"""

import sqlite3
import logging
import re
from typing import List, Dict, Any, Optional, Union, Tuple
from pathlib import Path
from contextlib import contextmanager
from datetime import datetime, timedelta
import pandas as pd

from .secure_config import get_secure_config, validate_input_data, log_security_event

logger = logging.getLogger(__name__)


class DatabaseSecurityError(Exception):
    """データベースセキュリティエラー"""

    pass


class SecureDataManager:
    """セキュアなデータマネージャー"""

    def __init__(self, db_path: str = "data/trading_data.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.config_manager = get_secure_config()

        # 許可されるSQL操作のホワイトリスト
        self.allowed_operations = {
            "SELECT",
            "INSERT",
            "UPDATE",
            "DELETE",
            "CREATE",
            "DROP",
            "ALTER",
        }

        # 許可されるテーブル名
        self.allowed_tables = {
            "stocks",
            "trades",
            "portfolio",
            "market_data",
            "predictions",
            "risk_metrics",
            "audit_log",
            "api_usage",
            "user_sessions",
        }

        # SQLインジェクションパターン
        self.sql_injection_patterns = [
            r"('|(\\')|(;|\\;)|(\\|\\|))",
            r"((\\%27)|(\\'))((\\%6F)|o|(\\%4F))((\\%72)|r|(\\%52))",
            r"((\\%27)|(\\'))union",
            r"exec(\\s|\\+)+(s|x)p\\w+",
            r"UNION.*SELECT",
            r"INSERT.*INTO",
            r"DELETE.*FROM",
            r"DROP.*TABLE",
        ]

    @contextmanager
    def get_connection(self):
        """データベース接続のコンテキストマネージャー"""
        conn = None
        try:
            conn = sqlite3.connect(self.db_path, timeout=30.0)
            conn.row_factory = sqlite3.Row  # 辞書形式で結果を取得
            # 外部キー制約を有効化
            conn.execute("PRAGMA foreign_keys = ON")
            # WALモードを有効化（並行性向上）
            conn.execute("PRAGMA journal_mode = WAL")
            yield conn
        except sqlite3.Error as e:
            logger.error(f"データベース接続エラー: {e}")
            raise DatabaseSecurityError(f"データベース接続に失敗しました: {e}")
        finally:
            if conn:
                conn.close()

    def validate_sql_query(self, query: str) -> bool:
        """SQLクエリを検証"""
        if not query or not isinstance(query, str):
            raise DatabaseSecurityError("無効なクエリです")

        query_upper = query.upper()

        # SQLインジェクションパターンチェック
        for pattern in self.sql_injection_patterns:
            if re.search(pattern, query, re.IGNORECASE):
                log_security_event("SQL_INJECTION_ATTEMPT", {"query": query[:100], "pattern": pattern})
                raise DatabaseSecurityError("潜在的なSQLインジェクションが検出されました")

        # 許可された操作のみを許可
        operation_found = False
        for op in self.allowed_operations:
            if query_upper.startswith(op):
                operation_found = True
                break

        if not operation_found:
            raise DatabaseSecurityError(f"許可されていないSQL操作です: {query[:50]}")

        return True

    def validate_table_name(self, table_name: str) -> bool:
        """テーブル名を検証"""
        if not table_name or not isinstance(table_name, str):
            raise DatabaseSecurityError("無効なテーブル名です")

        # アルファベットとアンダースコアのみ許可
        if not re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", table_name):
            raise DatabaseSecurityError(f"無効なテーブル名です: {table_name}")

        if table_name.lower() not in self.allowed_tables:
            raise DatabaseSecurityError(f"許可されていないテーブルです: {table_name}")

        return True

    def validate_column_names(self, columns: List[str]) -> bool:
        """カラム名を検証"""
        if not columns or not isinstance(columns, list):
            raise DatabaseSecurityError("無効なカラム名リストです")

        for col in columns:
            if not col or not isinstance(col, str):
                raise DatabaseSecurityError(f"無効なカラム名です: {col}")

            # アルファベット、数字、アンダースコアのみ許可
            if not re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", col):
                raise DatabaseSecurityError(f"無効なカラム名です: {col}")

        return True

    def execute_query(
        self, query: str, params: Optional[Tuple] = None, fetch_mode: str = "all"
    ) -> Union[List[Dict], Dict, None]:
        """セキュアにSQLクエリを実行"""
        # クエリ検証
        self.validate_sql_query(query)

        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()

                if params:
                    cursor.execute(query, params)
                else:
                    cursor.execute(query)

                # 結果を取得
                if fetch_mode == "all":
                    rows = cursor.fetchall()
                    return [dict(row) for row in rows]
                elif fetch_mode == "one":
                    row = cursor.fetchone()
                    return dict(row) if row else None
                elif fetch_mode == "none":
                    conn.commit()
                    return None

        except sqlite3.Error as e:
            logger.error(f"SQL実行エラー: {e}")
            log_security_event("SQL_EXECUTION_ERROR", {"query": query[:100], "error": str(e)})
            raise DatabaseSecurityError(f"SQL実行に失敗しました: {e}")

    def insert_stock_data(self, ticker: str, data: Dict[str, Any]) -> bool:
        """株価データを安全に挿入"""
        # 入力検証
        if not validate_input_data(ticker, "ticker_symbol"):
            raise DatabaseSecurityError(f"無効なティッカーシンボルです: {ticker}")

        required_fields = ["date", "open", "high", "low", "close", "volume"]
        for field in required_fields:
            if field not in data:
                raise DatabaseSecurityError(f"必須フィールドがありません: {field}")

        # データ検証
        for price_field in ["open", "high", "low", "close"]:
            if not validate_input_data(data[price_field], "price_data"):
                raise DatabaseSecurityError(f"無効な価格データです: {price_field}={data[price_field]}")

        query = """
        INSERT OR REPLACE INTO stocks 
        (ticker, date, open, high, low, close, volume, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """

        params = (
            ticker.upper(),
            data["date"],
            float(data["open"]),
            float(data["high"]),
            float(data["low"]),
            float(data["close"]),
            int(data["volume"]),
            datetime.now().isoformat(),
        )

        try:
            self.execute_query(query, params, fetch_mode="none")
            logger.info(f"株価データを挿入しました: {ticker} {data['date']}")
            return True
        except DatabaseSecurityError:
            raise
        except Exception as e:
            logger.error(f"株価データ挿入エラー: {e}")
            return False

    def get_stock_data(
        self,
        ticker: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> List[Dict]:
        """株価データを安全に取得"""
        # 入力検証
        if not validate_input_data(ticker, "ticker_symbol"):
            raise DatabaseSecurityError(f"無効なティッカーシンボルです: {ticker}")

        # クエリ構築
        query = "SELECT * FROM stocks WHERE ticker = ?"
        params = [ticker.upper()]

        if start_date:
            query += " AND date >= ?"
            params.append(start_date)

        if end_date:
            query += " AND date <= ?"
            params.append(end_date)

        query += " ORDER BY date DESC"

        if limit:
            if not isinstance(limit, int) or limit <= 0 or limit > 10000:
                raise DatabaseSecurityError(f"無効なリミット値です: {limit}")
            query += " LIMIT ?"
            params.append(limit)

        return self.execute_query(query, tuple(params), fetch_mode="all")

    def insert_trade_record(self, trade_data: Dict[str, Any]) -> bool:
        """取引記録を安全に挿入"""
        required_fields = ["ticker", "action", "quantity", "price", "timestamp"]
        for field in required_fields:
            if field not in trade_data:
                raise DatabaseSecurityError(f"必須フィールドがありません: {field}")

        # 取引データ検証
        if trade_data["action"].lower() not in ["buy", "sell"]:
            raise DatabaseSecurityError(f"無効な取引アクションです: {trade_data['action']}")

        if not validate_input_data(trade_data["ticker"], "ticker_symbol"):
            raise DatabaseSecurityError(f"無効なティッカーです: {trade_data['ticker']}")

        query = """
        INSERT INTO trades 
        (ticker, action, quantity, price, timestamp, strategy, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """

        params = (
            trade_data["ticker"].upper(),
            trade_data["action"].lower(),
            int(trade_data["quantity"]),
            float(trade_data["price"]),
            trade_data["timestamp"],
            trade_data.get("strategy", "unknown"),
            trade_data.get("notes", ""),
            datetime.now().isoformat(),
        )

        try:
            self.execute_query(query, params, fetch_mode="none")
            logger.info(f"取引記録を挿入しました: {trade_data['ticker']} {trade_data['action']}")
            return True
        except DatabaseSecurityError:
            raise
        except Exception as e:
            logger.error(f"取引記録挿入エラー: {e}")
            return False

    def get_portfolio_summary(self) -> Dict[str, Any]:
        """ポートフォリオ概要を安全に取得"""
        query = """
        SELECT 
            ticker,
            SUM(CASE WHEN action = 'buy' THEN quantity ELSE -quantity END) as total_quantity,
            AVG(price) as avg_price,
            COUNT(*) as trade_count
        FROM trades 
        GROUP BY ticker
        HAVING total_quantity > 0
        ORDER BY total_quantity DESC
        """

        try:
            results = self.execute_query(query, fetch_mode="all")

            portfolio = {}
            for row in results:
                portfolio[row["ticker"]] = {
                    "quantity": row["total_quantity"],
                    "avg_price": row["avg_price"],
                    "trade_count": row["trade_count"],
                }

            return portfolio
        except Exception as e:
            logger.error(f"ポートフォリオ取得エラー: {e}")
            return {}

    def log_api_usage(self, service: str, endpoint: str, status: str, response_time: float) -> None:
        """API使用状況をログ記録"""
        query = """
        INSERT INTO api_usage 
        (service, endpoint, status, response_time_ms, timestamp)
        VALUES (?, ?, ?, ?, ?)
        """

        params = (
            service,
            endpoint,
            status,
            int(response_time * 1000),
            datetime.now().isoformat(),
        )

        try:
            self.execute_query(query, params, fetch_mode="none")
        except Exception as e:
            logger.error(f"API使用ログ記録エラー: {e}")

    def initialize_database(self) -> None:
        """データベースを初期化"""
        tables = {
            "stocks": """
                CREATE TABLE IF NOT EXISTS stocks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ticker TEXT NOT NULL,
                    date TEXT NOT NULL,
                    open REAL NOT NULL,
                    high REAL NOT NULL,
                    low REAL NOT NULL,
                    close REAL NOT NULL,
                    volume INTEGER NOT NULL,
                    created_at TEXT NOT NULL,
                    UNIQUE(ticker, date)
                )
            """,
            "trades": """
                CREATE TABLE IF NOT EXISTS trades (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ticker TEXT NOT NULL,
                    action TEXT NOT NULL CHECK(action IN ('buy', 'sell')),
                    quantity INTEGER NOT NULL CHECK(quantity > 0),
                    price REAL NOT NULL CHECK(price > 0),
                    timestamp TEXT NOT NULL,
                    strategy TEXT,
                    notes TEXT,
                    created_at TEXT NOT NULL
                )
            """,
            "api_usage": """
                CREATE TABLE IF NOT EXISTS api_usage (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    service TEXT NOT NULL,
                    endpoint TEXT NOT NULL,
                    status TEXT NOT NULL,
                    response_time_ms INTEGER NOT NULL,
                    timestamp TEXT NOT NULL
                )
            """,
            "audit_log": """
                CREATE TABLE IF NOT EXISTS audit_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_type TEXT NOT NULL,
                    details TEXT,
                    timestamp TEXT NOT NULL
                )
            """,
        }

        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()

                for table_name, sql in tables.items():
                    cursor.execute(sql)
                    logger.info(f"テーブルを作成しました: {table_name}")

                conn.commit()
                logger.info("データベースの初期化が完了しました")

        except Exception as e:
            logger.error(f"データベース初期化エラー: {e}")
            raise DatabaseSecurityError(f"データベース初期化に失敗しました: {e}")


# グローバルインスタンス
data_manager = SecureDataManager()


def get_secure_data_manager() -> SecureDataManager:
    """セキュアなデータマネージャーを取得"""
    return data_manager
