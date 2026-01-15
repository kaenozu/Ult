"""
AGStock データ永続化層
SQLite によるポートフォリオ・設定・履歴の保存
"""

import json
import logging
import os
import sqlite3
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import uuid4

logger = logging.getLogger(__name__)

DATA_DIR = "data"
DB_PATH = os.path.join(DATA_DIR, "agstock.db")


@dataclass
class PortfolioRecord:
    """ポートフォリオ記録"""

    id: Optional[str] = None
    timestamp: str = ""
    total_value: float = 0.0
    cash_balance: float = 0.0
    positions: str = ""  # JSON serialized
    daily_return: float = 0.0
    total_return: float = 0.0


@dataclass
class TradeRecord:
    """取引記録"""

    id: Optional[str] = None
    timestamp: str = ""
    symbol: str = ""
    action: str = ""  # BUY, SELL
    quantity: float = 0.0
    price: float = 0.0
    total: float = 0.0
    status: str = "pending"


@dataclass
class AlertRecord:
    """アラート記録"""

    id: Optional[str] = None
    timestamp: str = ""
    alert_type: str = ""
    message: str = ""
    severity: str = "info"  # info, warning, critical
    status: str = "active"
    metadata: str = ""


@dataclass
class SystemConfigRecord:
    """システム設定記録"""

    id: Optional[str] = None
    key: str = ""
    value: str = ""
    category: str = ""
    updated_at: str = ""


class DatabaseManager:
    """データベース管理クラス"""

    _instance: Optional["DatabaseManager"] = None

    def __new__(cls) -> "DatabaseManager":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self._init_db()

    def _init_db(self):
        """データベース初期化"""
        os.makedirs(DATA_DIR, exist_ok=True)
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS portfolio_history (
                    id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    total_value REAL NOT NULL,
                    cash_balance REAL NOT NULL,
                    positions TEXT,
                    daily_return REAL,
                    total_return REAL
                )
            """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS trades (
                    id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    symbol TEXT NOT NULL,
                    action TEXT NOT NULL,
                    quantity REAL NOT NULL,
                    price REAL NOT NULL,
                    total REAL NOT NULL,
                    status TEXT DEFAULT 'pending'
                )
            """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS alerts (
                    id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    alert_type TEXT NOT NULL,
                    message TEXT NOT NULL,
                    severity TEXT DEFAULT 'info',
                    status TEXT DEFAULT 'active',
                    metadata TEXT
                )
            """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS system_config (
                    id TEXT PRIMARY KEY,
                    key TEXT UNIQUE NOT NULL,
                    value TEXT NOT NULL,
                    category TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS audit_log (
                    id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    action TEXT NOT NULL,
                    module TEXT NOT NULL,
                    user_id TEXT,
                    details TEXT,
                    ip_address TEXT
                )
            """
            )
            conn.commit()
        logger.info(f"Database initialized: {DB_PATH}")

    @contextmanager
    def _get_connection(self):
        """DB接続コンテキストマネージャー"""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    def _generate_id(self) -> str:
        """ID生成"""
        return str(uuid4())

    # Portfolio methods
    def save_portfolio(
        self,
        total_value: float,
        cash_balance: float,
        positions: Dict[str, Any],
        daily_return: float = 0.0,
        total_return: float = 0.0,
    ) -> str:
        """ポートフォリオ保存"""
        portfolio_id = self._generate_id()
        timestamp = datetime.now().isoformat()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO portfolio_history
                (id, timestamp, total_value, cash_balance, positions, daily_return, total_return)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    portfolio_id,
                    timestamp,
                    total_value,
                    cash_balance,
                    json.dumps(positions),
                    daily_return,
                    total_return,
                ),
            )
            conn.commit()
        return portfolio_id

    def get_portfolio_history(self, limit: int = 100) -> List[Dict[str, Any]]:
        """ポートフォリオ履歴取得"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM portfolio_history ORDER BY timestamp DESC LIMIT ?",
                (limit,),
            )
            return [dict(row) for row in cursor.fetchall()]

    def get_latest_portfolio(self) -> Optional[Dict[str, Any]]:
        """最新ポートフォリオ取得"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM portfolio_history ORDER BY timestamp DESC LIMIT 1")
            row = cursor.fetchone()
            return dict(row) if row else None

    # Trade methods
    def save_trade(
        self,
        symbol: str,
        action: str,
        quantity: float,
        price: float,
        status: str = "pending",
    ) -> str:
        """取引保存"""
        trade_id = self._generate_id()
        timestamp = datetime.now().isoformat()
        total = quantity * price
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO trades (id, timestamp, symbol, action, quantity, price, total, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (trade_id, timestamp, symbol, action, quantity, price, total, status),
            )
            conn.commit()
        return trade_id

    def get_trades(self, symbol: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
        """取引履歴取得"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if symbol:
                cursor.execute(
                    "SELECT * FROM trades WHERE symbol = ? ORDER BY timestamp DESC LIMIT ?",
                    (symbol, limit),
                )
            else:
                cursor.execute("SELECT * FROM trades ORDER BY timestamp DESC LIMIT ?", (limit,))
            return [dict(row) for row in cursor.fetchall()]

    def update_trade_status(self, trade_id: str, status: str) -> bool:
        """取引ステータス更新"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE trades SET status = ? WHERE id = ?", (status, trade_id))
            conn.commit()
            return cursor.rowcount > 0

    # Alert methods
    def save_alert(
        self,
        alert_type: str,
        message: str,
        severity: str = "info",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> str:
        """アラート保存"""
        alert_id = self._generate_id()
        timestamp = datetime.now().isoformat()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO alerts (id, timestamp, alert_type, message, severity, metadata)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    alert_id,
                    timestamp,
                    alert_type,
                    message,
                    severity,
                    json.dumps(metadata or {}),
                ),
            )
            conn.commit()
        return alert_id

    def get_alerts(
        self,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """アラート履歴取得"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            query = "SELECT * FROM alerts WHERE 1=1"
            params = []
            if status:
                query += " AND status = ?"
                params.append(status)
            if severity:
                query += " AND severity = ?"
                params.append(severity)
            query += " ORDER BY timestamp DESC LIMIT ?"
            params.append(limit)
            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]

    def resolve_alert(self, alert_id: str) -> bool:
        """アラート解決"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE alerts SET status = 'resolved' WHERE id = ?", (alert_id,))
            conn.commit()
            return cursor.rowcount > 0

    # Config methods
    def save_config(self, key: str, value: Any, category: str = "general") -> str:
        """設定保存"""
        config_id = self._generate_id()
        updated_at = datetime.now().isoformat()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO system_config (id, key, value, category, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET
                    value = excluded.value,
                    updated_at = excluded.updated_at
                """,
                (config_id, key, json.dumps(value), category, updated_at),
            )
            conn.commit()
        return config_id

    def get_config(self, key: str) -> Optional[Any]:
        """設定取得"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM system_config WHERE key = ?", (key,))
            row = cursor.fetchone()
            return json.loads(row["value"]) if row else None

    def get_all_config(self, category: Optional[str] = None) -> Dict[str, Any]:
        """全設定取得"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if category:
                cursor.execute(
                    "SELECT key, value FROM system_config WHERE category = ?",
                    (category,),
                )
            else:
                cursor.execute("SELECT key, value FROM system_config")
            return {row["key"]: json.loads(row["value"]) for row in cursor.fetchall()}

    # Audit log methods
    def log_audit(
        self,
        action: str,
        module: str,
        details: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> str:
        """監査ログ記録"""
        audit_id = self._generate_id()
        timestamp = datetime.now().isoformat()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO audit_log (id, timestamp, action, module, user_id, details, ip_address)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    audit_id,
                    timestamp,
                    action,
                    module,
                    user_id,
                    json.dumps(details or {}),
                    ip_address,
                ),
            )
            conn.commit()
        return audit_id

    def get_audit_logs(
        self,
        module: Optional[str] = None,
        action: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """監査ログ取得"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            query = "SELECT * FROM audit_log WHERE 1=1"
            params = []
            if module:
                query += " AND module = ?"
                params.append(module)
            if action:
                query += " AND action = ?"
                params.append(action)
            query += " ORDER BY timestamp DESC LIMIT ?"
            params.append(limit)
            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]

    def cleanup_old_data(self, days: int = 30) -> Dict[str, int]:
        """古いデータ削除"""
        from datetime import datetime, timedelta

        cutoff = (datetime.now() - timedelta(days=days)).isoformat()
        results = {}
        with self._get_connection() as conn:
            cursor = conn.cursor()
            for table in ["portfolio_history", "trades", "alerts", "audit_log"]:
                cursor.execute(f"DELETE FROM {table} WHERE timestamp < ?", (cutoff,))
                results[table] = cursor.rowcount
            conn.commit()
        return results


db_manager = DatabaseManager()
