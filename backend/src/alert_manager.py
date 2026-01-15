"""
Alert Manager - アラート管理システム
価格アラート、ポートフォリオアラート、カスタムアラートをサポート
"""

import sqlite3
from dataclasses import dataclass
from enum import Enum
from typing import List, Optional

import pandas as pd


class AlertType(Enum):
    """アラートタイプ"""

    PRICE = "price"
    PORTFOLIO = "portfolio"
    CUSTOM = "custom"


class AlertCondition(Enum):
    """アラート条件"""

    ABOVE = "above"
    BELOW = "below"
    EQUALS = "equals"
    CHANGE_PERCENT = "change_percent"


@dataclass
class Alert:
    """アラート"""

    id: Optional[int] = None
    type: str = AlertType.PRICE.value
    ticker: Optional[str] = None
    condition: str = AlertCondition.ABOVE.value
    threshold: float = 0.0
    message: str = ""
    enabled: bool = True
    triggered: bool = False
    created_at: Optional[str] = None
    triggered_at: Optional[str] = None


class AlertManager:
    """アラート管理クラス"""

    def __init__(self, db_path: str = "alerts.db"):
        self.db_path = db_path
        self._init_database()

    def _init_database(self):
        """データベース初期化"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                ticker TEXT,
                condition TEXT NOT NULL,
                threshold REAL NOT NULL,
                message TEXT,
                enabled INTEGER DEFAULT 1,
                triggered INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                triggered_at TIMESTAMP
            )
        """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS alert_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                alert_id INTEGER,
                triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                value REAL,
                message TEXT,
                FOREIGN KEY (alert_id) REFERENCES alerts(id)
            )
        """
        )

        conn.commit()
        conn.close()

    def create_alert(self, alert: Alert) -> int:
        """アラート作成"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT INTO alerts (type, ticker, condition, threshold, message, enabled)
            VALUES (?, ?, ?, ?, ?, ?)
        """,
            (alert.type, alert.ticker, alert.condition, alert.threshold, alert.message, alert.enabled),
        )

        alert_id = cursor.lastrowid
        conn.commit()
        conn.close()

        return alert_id

    def get_alerts(self, enabled_only: bool = True) -> List[Alert]:
        """アラート一覧取得"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        query = "SELECT * FROM alerts"
        if enabled_only:
            query += " WHERE enabled = 1"

        cursor.execute(query)
        rows = cursor.fetchall()
        conn.close()

        alerts = []
        for row in rows:
            alert = Alert(
                id=row[0],
                type=row[1],
                ticker=row[2],
                condition=row[3],
                threshold=row[4],
                message=row[5],
                enabled=bool(row[6]),
                triggered=bool(row[7]),
                created_at=row[8],
                triggered_at=row[9],
            )
            alerts.append(alert)

        return alerts

    def check_price_alert(self, ticker: str, current_price: float) -> List[Alert]:
        """価格アラートチェック"""
        alerts = self.get_alerts()
        triggered_alerts = []

        for alert in alerts:
            if alert.type != AlertType.PRICE.value or alert.ticker != ticker:
                continue

            should_trigger = False

            if alert.condition == AlertCondition.ABOVE.value and current_price > alert.threshold:
                should_trigger = True
            elif alert.condition == AlertCondition.BELOW.value and current_price < alert.threshold:
                should_trigger = True
            elif alert.condition == AlertCondition.EQUALS.value and abs(current_price - alert.threshold) < 0.01:
                should_trigger = True

            if should_trigger:
                self._trigger_alert(alert.id, current_price)
                triggered_alerts.append(alert)

        return triggered_alerts

    def check_portfolio_alert(self, total_equity: float, initial_capital: float) -> List[Alert]:
        """ポートフォリオアラートチェック"""
        alerts = self.get_alerts()
        triggered_alerts = []

        pnl_percent = ((total_equity - initial_capital) / initial_capital) * 100

        for alert in alerts:
            if alert.type != AlertType.PORTFOLIO.value:
                continue

            should_trigger = False

            if alert.condition == AlertCondition.ABOVE.value and pnl_percent > alert.threshold:
                should_trigger = True
            elif alert.condition == AlertCondition.BELOW.value and pnl_percent < alert.threshold:
                should_trigger = True

            if should_trigger:
                self._trigger_alert(alert.id, pnl_percent)
                triggered_alerts.append(alert)

        return triggered_alerts

    def _trigger_alert(self, alert_id: int, value: float):
        """アラートトリガー"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # アラートを無効化
        cursor.execute(
            """
            UPDATE alerts 
            SET triggered = 1, triggered_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """,
            (alert_id,),
        )

        # 履歴に記録
        cursor.execute(
            """
            INSERT INTO alert_history (alert_id, value)
            VALUES (?, ?)
        """,
            (alert_id, value),
        )

        conn.commit()
        conn.close()

    def delete_alert(self, alert_id: int):
        """アラート削除"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("DELETE FROM alerts WHERE id = ?", (alert_id,))

        conn.commit()
        conn.close()

    def toggle_alert(self, alert_id: int, enabled: bool):
        """アラート有効/無効切り替え"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute(
            """
            UPDATE alerts 
            SET enabled = ?
            WHERE id = ?
        """,
            (enabled, alert_id),
        )

        conn.commit()
        conn.close()

    def get_alert_history(self, limit: int = 100) -> pd.DataFrame:
        """アラート履歴取得"""
        conn = sqlite3.connect(self.db_path)

        query = """
            SELECT 
                ah.id,
                ah.alert_id,
                a.ticker,
                a.type,
                a.condition,
                a.threshold,
                ah.value,
                ah.triggered_at
            FROM alert_history ah
            JOIN alerts a ON ah.alert_id = a.id
            ORDER BY ah.triggered_at DESC
            LIMIT ?
        """

        df = pd.read_sql_query(query, conn, params=(limit,))
        conn.close()

        return df


if __name__ == "__main__":
    # テスト
    manager = AlertManager("test_alerts.db")

    # 価格アラート作成
    alert1 = Alert(
        type=AlertType.PRICE.value,
        ticker="7203.T",
        condition=AlertCondition.ABOVE.value,
        threshold=1500.0,
        message="トヨタが1500円を超えました",
    )
    alert_id = manager.create_alert(alert1)
    print(f"Alert created: {alert_id}")

    # アラートチェック
    triggered = manager.check_price_alert("7203.T", 1600.0)
    print(f"Triggered alerts: {len(triggered)}")

    # 履歴取得
    history = manager.get_alert_history()
    print(f"Alert history:\n{history}")
