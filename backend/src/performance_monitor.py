"""
Performance Monitor - システムパフォーマンス監視

機能:
    pass
- 実行時間の記録
- メモリ使用量の記録
- API呼び出し回数の記録
- パフォーマンスレポート生成
"""

import functools
import logging
import sqlite3
import time
from datetime import datetime, timedelta
from typing import Callable, Dict

import psutil


class PerformanceMonitor:
    """パフォーマンス監視クラス"""

    def __init__(self, metrics_db: str = "metrics.db"):
        """
        Args:
            metrics_db: メトリクスを保存するDBファイル
        """
        self.metrics_db = metrics_db
        self.logger = logging.getLogger(__name__)

        # DB初期化
        self._initialize_database()

    def _initialize_database(self):
        """メトリクスデータベースを初期化"""
        conn = sqlite3.connect(self.metrics_db)
        cursor = conn.cursor()

        # 実行時間テーブル
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS execution_time (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                function_name TEXT NOT NULL,
                duration_seconds REAL NOT NULL,
                status TEXT DEFAULT 'success'
            )
        """
        )

        # メモリ使用量テーブル
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS memory_usage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                memory_mb REAL NOT NULL,
                memory_percent REAL NOT NULL
            )
        """
        )

        # API呼び出しテーブル
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS api_calls (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                api_name TEXT NOT NULL,
                success INTEGER NOT NULL
            )
        """
        )

        conn.commit()
        conn.close()

    def track_execution_time(self, function_name: str, duration: float, status: str = "success"):
        """
        実行時間を記録

        Args:
            function_name: 関数名
            duration: 実行時間（秒）
            status: ステータス（success/error）
        """
        try:
            conn = sqlite3.connect(self.metrics_db)
            cursor = conn.cursor()

            cursor.execute(
                """
                INSERT INTO execution_time (timestamp, function_name, duration_seconds, status)
                VALUES (?, ?, ?, ?)
            """,
                (datetime.now().isoformat(), function_name, duration, status),
            )

            conn.commit()
            conn.close()

        except Exception as e:
            self.logger.error(f"Failed to track execution time: {e}")

    def track_memory_usage(self):
        """現在のメモリ使用量を記録"""
        try:
            process = psutil.Process()
            memory_info = process.memory_info()
            memory_mb = memory_info.rss / (1024 * 1024)  # MB単位
            memory_percent = process.memory_percent()

            conn = sqlite3.connect(self.metrics_db)
            cursor = conn.cursor()

            cursor.execute(
                """
                INSERT INTO memory_usage (timestamp, memory_mb, memory_percent)
                VALUES (?, ?, ?)
            """,
                (datetime.now().isoformat(), memory_mb, memory_percent),
            )

            conn.commit()
            conn.close()

        except Exception as e:
            self.logger.error(f"Failed to track memory usage: {e}")

    def track_api_call(self, api_name: str, success: bool = True):
        """
        API呼び出しを記録

        Args:
            api_name: API名
            success: 成功したかどうか
        """
        try:
            conn = sqlite3.connect(self.metrics_db)
            cursor = conn.cursor()

            cursor.execute(
                """
                INSERT INTO api_calls (timestamp, api_name, success)
                VALUES (?, ?, ?)
            """,
                (datetime.now().isoformat(), api_name, 1 if success else 0),
            )

            conn.commit()
            conn.close()

        except Exception as e:
            self.logger.error(f"Failed to track API call: {e}")

    def generate_report(self, days: int = 7) -> Dict:
        """
        パフォーマンスレポートを生成

        Args:
            days: レポート対象期間（日数）

        Returns:
            パフォーマンスメトリクス
        """
        cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()

        try:
            conn = sqlite3.connect(self.metrics_db)
            cursor = conn.cursor()

            # 実行時間の統計
            cursor.execute(
                """
                SELECT
                    AVG(duration_seconds) as avg_duration,
                    MAX(duration_seconds) as max_duration,
                    MIN(duration_seconds) as min_duration,
                    COUNT(*) as total_executions
                FROM execution_time
                WHERE timestamp >= ?
            """,
                (cutoff_date,),
            )

            exec_stats = cursor.fetchone()

            # 関数別の実行時間
            cursor.execute(
                """
                SELECT
                    function_name,
                    AVG(duration_seconds) as avg_duration,
                    COUNT(*) as call_count
                FROM execution_time
                WHERE timestamp >= ?
                GROUP BY function_name
                ORDER BY avg_duration DESC
                LIMIT 5
            """,
                (cutoff_date,),
            )

            slowest_functions = cursor.fetchall()

            # メモリ使用量の統計
            cursor.execute(
                """
                SELECT
                    AVG(memory_mb) as avg_memory,
                    MAX(memory_mb) as peak_memory,
                    AVG(memory_percent) as avg_percent
                FROM memory_usage
                WHERE timestamp >= ?
            """,
                (cutoff_date,),
            )

            memory_stats = cursor.fetchone()

            # API呼び出しの統計
            cursor.execute(
                """
                SELECT
                    COUNT(*) as total_calls,
                    SUM(success) as successful_calls
                FROM api_calls
                WHERE timestamp >= ?
            """,
                (cutoff_date,),
            )

            api_stats = cursor.fetchone()

            conn.close()

            # レポート生成
            report = {
                "period_days": days,
                "execution": {
                    "avg_duration": exec_stats[0] if exec_stats[0] else 0,
                    "max_duration": exec_stats[1] if exec_stats[1] else 0,
                    "min_duration": exec_stats[2] if exec_stats[2] else 0,
                    "total_executions": exec_stats[3] if exec_stats[3] else 0,
                },
                "slowest_functions": [
                    {"function": func, "avg_duration": dur, "call_count": count}
                    for func, dur, count in slowest_functions
                ],
                "memory": {
                    "avg_mb": memory_stats[0] if memory_stats[0] else 0,
                    "peak_mb": memory_stats[1] if memory_stats[1] else 0,
                    "avg_percent": memory_stats[2] if memory_stats[2] else 0,
                },
                "api_calls": {
                    "total": api_stats[0] if api_stats[0] else 0,
                    "successful": api_stats[1] if api_stats[1] else 0,
                    "success_rate": (api_stats[1] / api_stats[0] * 100) if api_stats[0] and api_stats[0] > 0 else 0,
                },
            }

            return report

        except Exception as e:
            self.logger.error(f"Failed to generate report: {e}")
            return {}

    def timing_decorator(self, func: Callable) -> Callable:
        """
        関数の実行時間を自動記録するデコレータ

        Usage:
            @performance_monitor.timing_decorator
            def my_function():
                ...
        """

        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            status = "success"

            try:
                result = func(*args, **kwargs)
                return result
            except Exception:
                status = "error"
                raise
            finally:
                duration = time.time() - start_time
                self.track_execution_time(func.__name__, duration, status)

        return wrapper


# グローバルインスタンス（シングルトン）
_performance_monitor = None


def get_performance_monitor() -> PerformanceMonitor:
    """パフォーマンスモニターのインスタンスを取得"""
    global _performance_monitor
    if _performance_monitor is None:
        _performance_monitor = PerformanceMonitor()
    return _performance_monitor


if __name__ == "__main__":
    # テスト実行
    logging.basicConfig(level=logging.INFO)

    pm = PerformanceMonitor()

    # 実行時間を記録
    pm.track_execution_time("test_function", 1.5)
    pm.track_execution_time("test_function", 2.3)

    # メモリ使用量を記録
    pm.track_memory_usage()

    # API呼び出しを記録
    pm.track_api_call("yfinance", True)
    pm.track_api_call("yfinance", False)

    # レポート生成
    report = pm.generate_report(days=7)

    print("=" * 60)
    print("Performance Report (Last 7 days)")
    print("=" * 60)
    print("\n実行統計:")
    print(f"  平均実行時間: {report['execution']['avg_duration']:.2f}秒")
    print(f"  最大実行時間: {report['execution']['max_duration']:.2f}秒")
    print(f"  総実行回数: {report['execution']['total_executions']}")

    print("\nメモリ使用:")
    print(f"  平均: {report['memory']['avg_mb']:.2f} MB")
    print(f"  ピーク: {report['memory']['peak_mb']:.2f} MB")

    print("\nAPI呼び出し:")
    print(f"  総呼び出し数: {report['api_calls']['total']}")
    print(f"  成功率: {report['api_calls']['success_rate']:.1f}%")
