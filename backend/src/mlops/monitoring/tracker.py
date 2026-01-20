"""
Model Monitoring and Performance Tracking
モデル監視とパフォーマンストラッキング
"""

import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass

from .models import (
    MonitoringMetric,
    ModelPerformance,
    AlertRule,
    Alert,
    MetricType,
    ModelStatus,
)

logger = logging.getLogger(__name__)


@dataclass
class MetricCollector:
    """メトリックコレクター"""

    name: str
    metric_type: MetricType
    collection_interval: float  # seconds
    callback: Callable
    enabled: bool = True
    last_collection: Optional[datetime] = None


class ModelMonitor:
    """モデル監視"""

    def __init__(self):
        self.metrics: Dict[str, List[MonitoringMetric]] = {}
        self.collectors: Dict[str, MetricCollector] = {}
        self.alert_rules: Dict[str, AlertRule] = {}
        self.active_alerts: Dict[str, Alert] = {}
        self.performance_history: Dict[str, List[ModelPerformance]] = {}
        self.monitoring_tasks: Dict[str, asyncio.Task] = {}
        self.is_running = False

    def add_metric_collector(
        self,
        collector_id: str,
        name: str,
        metric_type: MetricType,
        callback: Callable,
        interval: float = 60.0,
    ) -> None:
        """メトリックコレクターを追加"""

        collector = MetricCollector(
            name=name,
            metric_type=metric_type,
            collection_interval=interval,
            callback=callback,
        )

        self.collectors[collector_id] = collector
        logger.info(f"Added metric collector: {collector_id}")

    def remove_metric_collector(self, collector_id: str) -> bool:
        """メトリックコレクターを削除"""

        if collector_id in self.collectors:
            del self.collectors[collector_id]

            # 監視タスクを停止
            if collector_id in self.monitoring_tasks:
                self.monitoring_tasks[collector_id].cancel()
                del self.monitoring_tasks[collector_id]

            logger.info(f"Removed metric collector: {collector_id}")
            return True

        return False

    def add_alert_rule(self, rule: AlertRule) -> None:
        """アラートルールを追加"""

        self.alert_rules[rule.rule_id] = rule
        logger.info(f"Added alert rule: {rule.rule_id}")

    def remove_alert_rule(self, rule_id: str) -> bool:
        """アラートルールを削除"""

        if rule_id in self.alert_rules:
            del self.alert_rules[rule_id]
            logger.info(f"Removed alert rule: {rule_id}")
            return True

        return False

    def record_metric(
        self,
        model_id: str,
        metric_type: MetricType,
        value: float,
        context: Dict[str, Any] = None,
    ) -> None:
        """メトリックを記録"""

        metric = MonitoringMetric(
            metric_id=f"{model_id}_{metric_type.value}_{int(time.time())}",
            model_id=model_id,
            metric_type=metric_type,
            value=value,
            timestamp=datetime.now(),
            context=context or {},
        )

        if model_id not in self.metrics:
            self.metrics[model_id] = []

        self.metrics[model_id].append(metric)

        # 古いメトリックを削除（24時間分保持）
        cutoff_time = datetime.now() - timedelta(hours=24)
        self.metrics[model_id] = [
            m for m in self.metrics[model_id] if m.timestamp > cutoff_time
        ]

        # アラートチェック
        self._check_alerts(model_id, metric)

    def get_metrics(
        self,
        model_id: str,
        metric_type: Optional[MetricType] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
    ) -> List[MonitoringMetric]:
        """メトリックを取得"""

        if model_id not in self.metrics:
            return []

        metrics = self.metrics[model_id]

        # フィルタリング
        if metric_type:
            metrics = [m for m in metrics if m.metric_type == metric_type]

        if start_time:
            metrics = [m for m in metrics if m.timestamp >= start_time]

        if end_time:
            metrics = [m for m in metrics if m.timestamp <= end_time]

        return metrics

    def get_performance_summary(
        self, model_id: str, hours: int = 24
    ) -> Optional[ModelPerformance]:
        """パフォーマンスサマリーを取得"""

        start_time = datetime.now() - timedelta(hours=hours)
        metrics = self.get_metrics(model_id, start_time=start_time)

        if not metrics:
            return None

        # メトリックタイプでグループ化
        metrics_by_type = {}
        for metric in metrics:
            if metric.metric_type not in metrics_by_type:
                metrics_by_type[metric.metric_type] = []
            metrics_by_type[metric.metric_type].append(metric)

        # 集計値を計算
        performance = ModelPerformance(model_id=model_id, timestamp=datetime.now())

        for metric_type, metric_list in metrics_by_type.items():
            values = [m.value for m in metric_list]
            avg_value = sum(values) / len(values)

            if metric_type == MetricType.ACCURACY:
                performance.accuracy = avg_value
            elif metric_type == MetricType.PRECISION:
                performance.precision = avg_value
            elif metric_type == MetricType.RECALL:
                performance.recall = avg_value
            elif metric_type == MetricType.F1_SCORE:
                performance.f1_score = avg_value
            elif metric_type == MetricType.LATENCY:
                performance.latency_ms = avg_value
            elif metric_type == MetricType.THROUGHPUT:
                performance.throughput_qps = avg_value
            elif metric_type == MetricType.MEMORY_USAGE:
                performance.memory_usage_mb = avg_value
            elif metric_type == MetricType.CPU_USAGE:
                performance.cpu_usage_percent = avg_value

        return performance

    def start_monitoring(self) -> None:
        """監視を開始"""

        if self.is_running:
            logger.warning("Monitoring is already running")
            return

        self.is_running = True

        # 各コレクターの監視タスクを開始
        for collector_id, collector in self.collectors.items():
            if collector.enabled:
                task = asyncio.create_task(
                    self._monitor_collector(collector_id, collector)
                )
                self.monitoring_tasks[collector_id] = task

        logger.info("Model monitoring started")

    def stop_monitoring(self) -> None:
        """監視を停止"""

        if not self.is_running:
            return

        self.is_running = False

        # 全ての監視タスクを停止
        for task in self.monitoring_tasks.values():
            task.cancel()

        self.monitoring_tasks.clear()
        logger.info("Model monitoring stopped")

    async def _monitor_collector(
        self, collector_id: str, collector: MetricCollector
    ) -> None:
        """コレクターを監視"""

        while self.is_running and collector.enabled:
            try:
                # コールバックを実行してメトリックを収集
                result = await collector.callback()

                if isinstance(result, dict):
                    for model_id, value in result.items():
                        self.record_metric(
                            model_id=model_id,
                            metric_type=collector.metric_type,
                            value=value,
                            context={"collector": collector.name},
                        )

                collector.last_collection = datetime.now()

                # 次の収集まで待機
                await asyncio.sleep(collector.collection_interval)

            except Exception as e:
                logger.error(f"Error in collector {collector_id}: {e}")
                await asyncio.sleep(collector.collection_interval)

    def _check_alerts(self, model_id: str, metric: MonitoringMetric) -> None:
        """アラートをチェック"""

        for rule in self.alert_rules.values():
            if not rule.enabled:
                continue

            # モデルIDフィルタリング
            if rule.model_id and rule.model_id != model_id:
                continue

            # メトリックタイプフィルタリング
            if rule.metric_type != metric.metric_type:
                continue

            # クールダウンチェック
            if rule.last_triggered:
                cooldown_end = rule.last_triggered + timedelta(
                    minutes=rule.cooldown_minutes
                )
                if datetime.now() < cooldown_end:
                    continue

            # 条件チェック
            triggered = self._evaluate_condition(
                metric.value, rule.condition, rule.threshold
            )

            if triggered:
                self._trigger_alert(rule, metric)

    def _evaluate_condition(
        self, value: float, condition: str, threshold: float
    ) -> bool:
        """条件を評価"""

        if condition == ">":
            return value > threshold
        elif condition == "<":
            return value < threshold
        elif condition == ">=":
            return value >= threshold
        elif condition == "<=":
            return value <= threshold
        elif condition == "==":
            return value == threshold
        elif condition == "!=":
            return value != threshold

        return False

    def _trigger_alert(self, rule: AlertRule, metric: MonitoringMetric) -> None:
        """アラートをトリガー"""

        alert = Alert(
            alert_id=f"alert_{rule.rule_id}_{int(time.time())}",
            rule_id=rule.rule_id,
            model_id=metric.model_id,
            metric_type=metric.metric_type,
            current_value=metric.value,
            threshold=rule.threshold,
            severity=rule.severity,
            message=f"{rule.name}: {metric.metric_type.value} is {metric.value} (threshold: {rule.threshold})",
            triggered_at=datetime.now(),
        )

        self.active_alerts[alert.alert_id] = alert
        rule.last_triggered = datetime.now()

        logger.warning(f"Alert triggered: {alert.message}")

        # 通知を送信（実装は別途）
        self._send_notification(alert)

    def _send_notification(self, alert: Alert) -> None:
        """通知を送信"""

        # 実装: Slack, Email, Webhookなど
        logger.info(f"Notification sent for alert: {alert.alert_id}")

    def acknowledge_alert(self, alert_id: str, user: str) -> bool:
        """アラートを確認"""

        if alert_id not in self.active_alerts:
            return False

        alert = self.active_alerts[alert_id]
        alert.acknowledged = True
        alert.acknowledged_by = user
        alert.acknowledged_at = datetime.now()

        logger.info(f"Alert acknowledged: {alert_id} by {user}")
        return True

    def resolve_alert(self, alert_id: str) -> bool:
        """アラートを解決"""

        if alert_id not in self.active_alerts:
            return False

        alert = self.active_alerts[alert_id]
        alert.resolved = True
        alert.resolved_at = datetime.now()

        # アクティブアラートから削除
        del self.active_alerts[alert_id]

        logger.info(f"Alert resolved: {alert_id}")
        return True

    def get_active_alerts(self, model_id: Optional[str] = None) -> List[Alert]:
        """アクティブなアラートを取得"""

        alerts = list(self.active_alerts.values())

        if model_id:
            alerts = [a for a in alerts if a.model_id == model_id]

        return alerts

    def get_alert_history(
        self, hours: int = 24, severity: Optional[str] = None
    ) -> List[Alert]:
        """アラート履歴を取得"""

        # 実装: アラート履歴をDBから取得
        return []
