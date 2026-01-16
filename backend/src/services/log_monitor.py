"""
Structured Logging and Monitoring System
エラーログの集約と構造化監視システム
"""

import logging
import json
import time
import threading
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from pathlib import Path
import asyncio
from collections import defaultdict, deque


class StructuredLogger:
    """構造化ロガー"""

    def __init__(self, log_level: str = "INFO", log_file: Optional[str] = None):
        self.logger = logging.getLogger("AGStock.StructuredLogger")
        self.logger.setLevel(getattr(logging, log_level.upper()))

        # フォーマッタ
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )

        # コンソールハンドラ
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        self.logger.addHandler(console_handler)

        # ファイルハンドラ（オプション）
        if log_file:
            file_handler = logging.FileHandler(log_file)
            file_handler.setFormatter(formatter)
            self.logger.addHandler(file_handler)

        # 構造化ログ用バッファ
        self.log_buffer: List[Dict[str, Any]] = []
        self.max_buffer_size = 1000

    def log_structured(self, level: str, event: str, **kwargs):
        """構造化ログ記録"""
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "level": level,
            "event": event,
            "data": kwargs,
        }

        # バッファに追加
        self.log_buffer.append(log_entry)

        # バッファサイズ制限
        if len(self.log_buffer) > self.max_buffer_size:
            self.log_buffer.pop(0)

        # 通常のログにも記録
        log_message = f"{event}: {json.dumps(kwargs, ensure_ascii=False)}"
        log_method = getattr(self.logger, level.lower(), self.logger.info)
        log_method(log_message)

    def log_api_request(
        self,
        method: str,
        path: str,
        status_code: int,
        duration: float,
        user_agent: Optional[str] = None,
    ):
        """APIリクエストログ"""
        self.log_structured(
            "INFO",
            "api_request",
            method=method,
            path=path,
            status_code=status_code,
            duration=duration,
            user_agent=user_agent or "unknown",
        )

    def log_error(
        self,
        error_type: str,
        message: str,
        traceback: Optional[str] = None,
        user_id: Optional[str] = None,
        request_id: Optional[str] = None,
    ):
        """エラーログ"""
        self.log_structured(
            "ERROR",
            "application_error",
            error_type=error_type,
            message=message,
            traceback=traceback,
            user_id=user_id,
            request_id=request_id,
        )

    def log_performance(
        self, operation: str, duration: float, metadata: Optional[Dict[str, Any]] = None
    ):
        """パフォーマンスログ"""
        self.log_structured(
            "INFO",
            "performance_metric",
            operation=operation,
            duration=duration,
            metadata=metadata or {},
        )

    def log_business_event(
        self, event_type: str, user_id: Optional[str] = None, **kwargs
    ):
        """ビジネスイベントログ"""
        self.log_structured(
            "INFO", "business_event", event_type=event_type, user_id=user_id, **kwargs
        )

    def get_recent_logs(self, limit: int = 100) -> List[Dict[str, Any]]:
        """最近のログを取得"""
        return self.log_buffer[-limit:]

    def search_logs(
        self, query: Dict[str, Any], limit: int = 100
    ) -> List[Dict[str, Any]]:
        """ログ検索"""
        results = []
        for log_entry in reversed(self.log_buffer):
            match = True
            for key, value in query.items():
                if (
                    key not in log_entry.get("data", {})
                    or log_entry["data"][key] != value
                ):
                    match = False
                    break
            if match:
                results.append(log_entry)
                if len(results) >= limit:
                    break
        return results


class MonitoringSystem:
    """監視システム"""

    def __init__(self, logger: StructuredLogger):
        self.logger = logger
        self.metrics: Dict[str, Any] = {}
        self.alerts: List[Dict[str, Any]] = []
        self.health_checks: Dict[str, Dict[str, Any]] = {}

        # 監視間隔（秒）
        self.check_interval = 60
        self.monitoring_active = False
        self.monitor_thread: Optional[threading.Thread] = None

    def start_monitoring(self):
        """監視開始"""
        if self.monitoring_active:
            return

        self.monitoring_active = True
        self.monitor_thread = threading.Thread(
            target=self._monitoring_loop, daemon=True
        )
        self.monitor_thread.start()
        self.logger.log_structured("INFO", "monitoring_started")

    def stop_monitoring(self):
        """監視停止"""
        self.monitoring_active = False
        if self.monitor_thread and self.monitor_thread.is_alive():
            self.monitor_thread.join(timeout=5)
        self.logger.log_structured("INFO", "monitoring_stopped")

    def _monitoring_loop(self):
        """監視ループ"""
        while self.monitoring_active:
            try:
                self._perform_health_checks()
                self._check_alerts()
                self._collect_metrics()
                time.sleep(self.check_interval)
            except Exception as e:
                self.logger.log_error("monitoring_error", str(e))

    def _perform_health_checks(self):
        """ヘルスチェック実行"""
        # APIヘルスチェック
        api_health = self._check_api_health()
        self.health_checks["api"] = {
            "status": "healthy" if api_health else "unhealthy",
            "last_check": datetime.now().isoformat(),
            "response_time": 0.0,  # 実際のチェックで測定
        }

        # データベースヘルスチェック
        db_health = self._check_database_health()
        self.health_checks["database"] = {
            "status": "healthy" if db_health else "unhealthy",
            "last_check": datetime.now().isoformat(),
            "connection_count": 0,  # 実際のチェックで測定
        }

        # 全体ヘルスステータス
        overall_healthy = all(
            check["status"] == "healthy" for check in self.health_checks.values()
        )

        self.logger.log_structured(
            "INFO",
            "health_check_completed",
            overall_status="healthy" if overall_healthy else "unhealthy",
            checks=self.health_checks,
        )

    def _check_api_health(self) -> bool:
        """APIヘルスチェック"""
        try:
            # 実際の実装ではHTTPリクエストを行う
            # ここではモック
            return True
        except Exception:
            return False

    def _check_database_health(self) -> bool:
        """データベースヘルスチェック"""
        try:
            # 実際の実装ではDB接続チェックを行う
            # ここではモック
            return True
        except Exception:
            return False

    def _check_alerts(self):
        """アラートチェック"""
        current_time = datetime.now()

        # エラーレートチェック
        error_rate = self._calculate_error_rate()
        if error_rate > 0.05:  # 5%を超えるエラー
            self._trigger_alert(
                "high_error_rate",
                f"Error rate is {error_rate:.2%}, exceeding threshold of 5%",
                "error",
            )

        # レスポンスタイムチェック
        avg_response_time = self._calculate_avg_response_time()
        if avg_response_time > 5.0:  # 5秒を超える
            self._trigger_alert(
                "slow_response_time",
                f"Average response time is {avg_response_time:.2f}s, exceeding threshold of 5s",
                "performance",
            )

    def _calculate_error_rate(self) -> float:
        """エラーレート計算"""
        # 最近のログからエラーをカウント
        recent_logs = self.logger.get_recent_logs(1000)
        error_logs = [log for log in recent_logs if log["level"] == "ERROR"]
        return len(error_logs) / len(recent_logs) if recent_logs else 0

    def _calculate_avg_response_time(self) -> float:
        """平均レスポンスタイム計算"""
        # 最近のAPIリクエストログから計算
        recent_logs = self.logger.get_recent_logs(1000)
        api_logs = [
            log
            for log in recent_logs
            if log.get("data", {}).get("event") == "api_request"
        ]

        if not api_logs:
            return 0.0

        response_times = [
            log["data"]["duration"] for log in api_logs if "duration" in log["data"]
        ]
        return sum(response_times) / len(response_times) if response_times else 0

    def _trigger_alert(self, alert_type: str, message: str, severity: str):
        """アラート発動"""
        alert = {
            "id": f"{alert_type}_{int(time.time())}",
            "type": alert_type,
            "message": message,
            "severity": severity,
            "timestamp": datetime.now().isoformat(),
            "resolved": False,
        }

        self.alerts.append(alert)
        self.logger.log_structured("WARNING", "alert_triggered", **alert)

    def _collect_metrics(self):
        """メトリクス収集"""
        self.metrics = {
            "timestamp": datetime.now().isoformat(),
            "error_rate": self._calculate_error_rate(),
            "avg_response_time": self._calculate_avg_response_time(),
            "active_alerts": len([a for a in self.alerts if not a["resolved"]]),
            "health_status": self.health_checks,
        }

        self.logger.log_structured("INFO", "metrics_collected", **self.metrics)

    def get_health_status(self) -> Dict[str, Any]:
        """ヘルスステータス取得"""
        return {
            "overall_status": "healthy"
            if all(
                check["status"] == "healthy" for check in self.health_checks.values()
            )
            else "unhealthy",
            "checks": self.health_checks,
            "last_updated": datetime.now().isoformat(),
        }

    def get_active_alerts(self) -> List[Dict[str, Any]]:
        """アクティブなアラート取得"""
        return [alert for alert in self.alerts if not alert["resolved"]]

    def resolve_alert(self, alert_id: str):
        """アラート解決"""
        for alert in self.alerts:
            if alert["id"] == alert_id:
                alert["resolved"] = True
                alert["resolved_at"] = datetime.now().isoformat()
                self.logger.log_structured("INFO", "alert_resolved", alert_id=alert_id)
                break

    def get_metrics_summary(self) -> Dict[str, Any]:
        """メトリクスサマリー取得"""
        return {
            "current_metrics": self.metrics,
            "alert_summary": {
                "total_alerts": len(self.alerts),
                "active_alerts": len(self.get_active_alerts()),
                "resolved_alerts": len([a for a in self.alerts if a["resolved"]]),
            },
            "health_summary": self.get_health_status(),
        }


class LogAggregator:
    """ログ集約システム"""

    def __init__(self, retention_days: int = 30):
        self.retention_days = retention_days
        self.aggregated_logs: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        self.stats = {
            "total_logs_processed": 0,
            "logs_by_level": defaultdict(int),
            "logs_by_event": defaultdict(int),
            "error_patterns": defaultdict(int),
        }

    def aggregate_log(self, log_entry: Dict[str, Any]):
        """ログを集約"""
        self.stats["total_logs_processed"] += 1
        self.stats["logs_by_level"][log_entry["level"]] += 1

        if "event" in log_entry:
            self.stats["logs_by_event"][log_entry["event"]] += 1

        # エラーパターン集約
        if log_entry["level"] == "ERROR":
            error_pattern = self._extract_error_pattern(log_entry)
            self.stats["error_patterns"][error_pattern] += 1

        # 時間ベースの集約
        hour_key = datetime.fromisoformat(log_entry["timestamp"]).strftime(
            "%Y-%m-%d-%H"
        )
        self.aggregated_logs[hour_key].append(log_entry)

        # 古いログのクリーンアップ
        self._cleanup_old_logs()

    def _extract_error_pattern(self, log_entry: Dict[str, Any]) -> str:
        """エラーパターン抽出"""
        data = log_entry.get("data", {})
        error_type = data.get("error_type", "unknown")
        event = log_entry.get("event", "unknown")

        return f"{event}:{error_type}"

    def _cleanup_old_logs(self):
        """古いログのクリーンアップ"""
        cutoff_date = datetime.now() - timedelta(days=self.retention_days)
        cutoff_key = cutoff_date.strftime("%Y-%m-%d-%H")

        keys_to_remove = [
            key for key in self.aggregated_logs.keys() if key < cutoff_key
        ]
        for key in keys_to_remove:
            del self.aggregated_logs[key]

    def get_error_summary(self, hours: int = 24) -> Dict[str, Any]:
        """エラーサマリー取得"""
        cutoff_time = datetime.now() - timedelta(hours=hours)

        recent_errors = []
        for hour_logs in self.aggregated_logs.values():
            for log in hour_logs:
                if (
                    log["level"] == "ERROR"
                    and datetime.fromisoformat(log["timestamp"]) > cutoff_time
                ):
                    recent_errors.append(log)

        return {
            "period_hours": hours,
            "total_errors": len(recent_errors),
            "error_patterns": dict(self.stats["error_patterns"]),
            "most_common_error": max(
                self.stats["error_patterns"].items(), key=lambda x: x[1]
            )
            if self.stats["error_patterns"]
            else None,
        }

    def get_performance_summary(self, hours: int = 24) -> Dict[str, Any]:
        """パフォーマンスサマリー取得"""
        cutoff_time = datetime.now() - timedelta(hours=hours)

        performance_logs = []
        for hour_logs in self.aggregated_logs.values():
            for log in hour_logs:
                if (
                    log.get("event") == "performance_metric"
                    and datetime.fromisoformat(log["timestamp"]) > cutoff_time
                ):
                    performance_logs.append(log)

        if not performance_logs:
            return {"avg_response_time": 0, "total_measurements": 0}

        response_times = [log["data"]["duration"] for log in performance_logs]
        avg_response_time = sum(response_times) / len(response_times)

        return {
            "period_hours": hours,
            "total_measurements": len(performance_logs),
            "avg_response_time": avg_response_time,
            "min_response_time": min(response_times),
            "max_response_time": max(response_times),
        }
