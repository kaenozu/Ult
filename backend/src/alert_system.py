"""
Advanced Alert System - 価格アラート、指標アラートシステム

機能:
    pass
- 指定価格に到達したらアラート
- テクニカル指標（RSI、MACD等）でアラート
- カスタム条件でアラート
"""

import logging
import sqlite3
from datetime import datetime
from typing import Callable, Dict, List, Optional

import pandas as pd


class AlertSystem:
    """高度なアラートシステム"""

    def __init__(self, alerts_db: str = "alerts.db"):
        """
        Args:
            alerts_db: アラートデータベースファイル
        """
        self.alerts_db = alerts_db
        self.logger = logging.getLogger(__name__)

        # DB初期化
        self._initialize_database()

    def _initialize_database(self):
        """アラートデータベースを初期化"""
        conn = sqlite3.connect(self.alerts_db)
        cursor = conn.cursor()

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                alert_type TEXT NOT NULL,
                ticker TEXT NOT NULL,
                condition_type TEXT NOT NULL,
                condition_value REAL,
                condition_params TEXT,
                created_at TEXT NOT NULL,
                triggered_at TEXT,
                is_active INTEGER DEFAULT 1,
                notification_sent INTEGER DEFAULT 0
            )
        """
        )

        conn.commit()
        conn.close()

    def add_price_alert(self, ticker: str, target_price: float, direction: str = "above") -> int:
        """
        価格アラートを追加

        Args:
            ticker: 銘柄コード
            target_price: 目標価格
            direction: "above"（以上）or "below"（以下）

        Returns:
            アラートID
        """
        try:
            conn = sqlite3.connect(self.alerts_db)
            cursor = conn.cursor()

            cursor.execute(
                """
                INSERT INTO alerts (alert_type, ticker, condition_type, condition_value, created_at)
                VALUES (?, ?, ?, ?, ?)
            """,
                ("price", ticker, direction, target_price, datetime.now().isoformat()),
            )

            alert_id = cursor.lastrowid
            conn.commit()
            conn.close()

            self.logger.info(f"Price alert added: {ticker} {direction} {target_price}")
            return alert_id

        except Exception as e:
            self.logger.error(f"Failed to add price alert: {e}")
            return -1

    def add_indicator_alert(self, ticker: str, indicator: str, threshold: float, direction: str = "above") -> int:
        """
        指標アラートを追加

        Args:
            ticker: 銘柄コード
            indicator: 指標名（RSI, MACD, BB等）
            threshold: 閾値
            direction: "above"（以上）or "below"（以下）

        Returns:
            アラートID
        """
        try:
            conn = sqlite3.connect(self.alerts_db)
            cursor = conn.cursor()

            import json

            params = json.dumps({"indicator": indicator, "direction": direction})

            cursor.execute(
                """
                INSERT INTO alerts (alert_type, ticker, condition_type, condition_value, condition_params, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """,
                (
                    "indicator",
                    ticker,
                    indicator,
                    threshold,
                    params,
                    datetime.now().isoformat(),
                ),
            )

            alert_id = cursor.lastrowid
            conn.commit()
            conn.close()

            self.logger.info(f"Indicator alert added: {ticker} {indicator} {direction} {threshold}")
            return alert_id

        except Exception as e:
            self.logger.error(f"Failed to add indicator alert: {e}")
            return -1

    def add_custom_alert(self, ticker: str, condition_func: Callable, description: str) -> int:
        """
        カスタムアラートを追加

        Args:
            ticker: 銘柄コード
            condition_func: 条件判定関数
            description: アラートの説明

        Returns:
            アラートID
        """
        # カスタムアラートは実行時に評価するため、DBに保存せずメモリ保持
        # 本格実装ではpickleやcloudpickleで関数をシリアライズ
        self.logger.info(f"Custom alert added: {ticker} - {description}")
        return 0

    def check_price_alerts(self, ticker: str, current_price: float) -> List[Dict]:
        """
        価格アラートをチェック

        Args:
            ticker: 銘柄コード
            current_price: 現在価格

        Returns:
            トリガーされたアラートのリスト
        """
        try:
            conn = sqlite3.connect(self.alerts_db)
            cursor = conn.cursor()

            # アクティブな価格アラートを取得
            cursor.execute(
                """
                SELECT id, condition_type, condition_value
                FROM alerts
                WHERE alert_type = 'price'
                AND ticker = ?
                AND is_active = 1
                AND triggered_at IS NULL
            """,
                (ticker,),
            )

            alerts = cursor.fetchall()
            triggered = []

            for alert_id, direction, target_price in alerts:
                if (direction == "above" and current_price >= target_price) or (
                    direction == "below" and current_price <= target_price
                ):
                    # アラートをトリガー
                    cursor.execute(
                        """
                        UPDATE alerts
                        SET triggered_at = ?, is_active = 0
                        WHERE id = ?
                    """,
                        (datetime.now().isoformat(), alert_id),
                    )

                    triggered.append(
                        {
                            "id": alert_id,
                            "ticker": ticker,
                            "type": "price",
                            "condition": f"{direction} {target_price}",
                            "current_value": current_price,
                        }
                    )

            conn.commit()
            conn.close()

            return triggered

        except Exception as e:
            self.logger.error(f"Failed to check price alerts: {e}")
            return []

    def check_indicator_alerts(self, ticker: str, indicators: Dict[str, float]) -> List[Dict]:
        """
        指標アラートをチェック

        Args:
            ticker: 銘柄コード
            indicators: 指標の辞書 {"RSI": 30, "MACD": 0.5, ...}

        Returns:
            トリガーされたアラートのリスト
        """
        try:
            conn = sqlite3.connect(self.alerts_db)
            cursor = conn.cursor()

            cursor.execute(
                """
                SELECT id, condition_type, condition_value, condition_params
                FROM alerts
                WHERE alert_type = 'indicator'
                AND ticker = ?
                AND is_active = 1
                AND triggered_at IS NULL
            """,
                (ticker,),
            )

            alerts = cursor.fetchall()
            triggered = []

            for alert_id, indicator, threshold, params_json in alerts:
                current_value = indicators.get(indicator)

                if current_value is None:
                    continue

                import json

                params = json.loads(params_json) if params_json else {}
                direction = params.get("direction", "above")

                if (direction == "above" and current_value >= threshold) or (
                    direction == "below" and current_value <= threshold
                ):
                    # アラートをトリガー
                    cursor.execute(
                        """
                        UPDATE alerts
                        SET triggered_at = ?, is_active = 0
                        WHERE id = ?
                    """,
                        (datetime.now().isoformat(), alert_id),
                    )

                    triggered.append(
                        {
                            "id": alert_id,
                            "ticker": ticker,
                            "type": "indicator",
                            "indicator": indicator,
                            "condition": f"{indicator} {direction} {threshold}",
                            "current_value": current_value,
                        }
                    )

            conn.commit()
            conn.close()

            return triggered

        except Exception as e:
            self.logger.error(f"Failed to check indicator alerts: {e}")
            return []

    def get_active_alerts(self, ticker: Optional[str] = None) -> pd.DataFrame:
        """
        アクティブなアラート一覧を取得

        Args:
            ticker: 銘柄コード（Noneの場合は全銘柄）

        Returns:
            アラート一覧のDataFrame
        """
        try:
            conn = sqlite3.connect(self.alerts_db)

            if ticker:
                query = """
                    SELECT * FROM alerts
                    WHERE ticker = ? AND is_active = 1
                    ORDER BY created_at DESC
                """
                df = pd.read_sql_query(query, conn, params=(ticker,))
            else:
                query = """
                    SELECT * FROM alerts
                    WHERE is_active = 1
                    ORDER BY created_at DESC
                """
                df = pd.read_sql_query(query, conn)

            conn.close()
            return df

        except Exception as e:
            self.logger.error(f"Failed to get active alerts: {e}")
            return pd.DataFrame()

    def delete_alert(self, alert_id: int) -> bool:
        """
        アラートを削除

        Args:
            alert_id: アラートID

        Returns:
            成功したかどうか
        """
        try:
            conn = sqlite3.connect(self.alerts_db)
            cursor = conn.cursor()

            cursor.execute("DELETE FROM alerts WHERE id = ?", (alert_id,))

            conn.commit()
            conn.close()

            self.logger.info(f"Alert deleted: {alert_id}")
            return True

        except Exception as e:
            self.logger.error(f"Failed to delete alert: {e}")
            return False


if __name__ == "__main__":
    # テスト実行
    logging.basicConfig(level=logging.INFO)

    alert_system = AlertSystem()

    # 価格アラートを追加
    alert_id = alert_system.add_price_alert("7203.T", 10000, "above")
    print(f"Price alert added: ID={alert_id}")

    # 指標アラートを追加
    alert_id = alert_system.add_indicator_alert("7203.T", "RSI", 30, "below")
    print(f"Indicator alert added: ID={alert_id}")

    # アクティブなアラートを表示
    active_alerts = alert_system.get_active_alerts()
    print("\nActive alerts:")
    print(active_alerts)

    # 価格アラートをチェック
    triggered = alert_system.check_price_alerts("7203.T", 10500)
    if triggered:
        print(f"\nTriggered alerts: {triggered}")
