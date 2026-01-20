"""
パフォーマンス監視とメトリクス収集システム
Prometheus連携、Grafanaダッシュボード、カスタムメトリクス
"""

import asyncio
import time
import psutil
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
import threading
from collections import defaultdict, deque
import statistics

from prometheus_client import (
    Counter,
    Histogram,
    Gauge,
    CollectorRegistry,
    generate_latest,
)
from prometheus_client.exposition import start_http_server
import aioredis
from src.core.config import settings
from src.logging.structured_logger import get_logger, Component

logger = get_logger(__name__)


class MetricType(Enum):
    """メトリクスタイプ"""

    COUNTER = "counter"
    HISTOGRAM = "histogram"
    GAUGE = "gauge"


@dataclass
class MetricConfig:
    """メトリクス設定"""

    name: str
    metric_type: MetricType
    description: str
    labels: List[str] = field(default_factory=list)
    buckets: Optional[List[float]] = None  # Histogram用


@dataclass
class PerformanceSnapshot:
    """パフォーマンススナップショット"""

    timestamp: datetime
    cpu_percent: float
    memory_percent: float
    memory_used_mb: float
    disk_usage_percent: float
    active_connections: int
    db_connections: int
    cache_hit_rate: float
    request_rate: float
    error_rate: float
    response_time_avg: float
    custom_metrics: Dict[str, float] = field(default_factory=dict)


class CustomMetricsCollector:
    """カスタムメトリクス収集器"""

    def __init__(self):
        self.collectors: Dict[str, Callable] = {}
        self.registry = CollectorRegistry()
        self.metrics: Dict[str, Any] = {}

        # デフォルトメトリクス登録
        self._register_default_metrics()

    def _register_default_metrics(self):
        """デフォルトメトリクス登録"""

        # システムメトリクス
        self.register_metric(
            "system_cpu_usage", MetricType.GAUGE, "System CPU usage percentage", []
        )

        self.register_metric(
            "system_memory_usage",
            MetricType.GAUGE,
            "System memory usage percentage",
            [],
        )

        # アプリケーションメトリクス
        self.register_metric(
            "http_requests_total",
            MetricType.COUNTER,
            "Total HTTP requests",
            ["method", "endpoint", "status"],
        )

        self.register_metric(
            "http_request_duration_seconds",
            MetricType.HISTOGRAM,
            "HTTP request duration in seconds",
            ["method", "endpoint"],
            buckets=[0.1, 0.5, 1.0, 2.5, 5.0, 10.0],
        )

        self.register_metric(
            "database_operations_total",
            MetricType.COUNTER,
            "Total database operations",
            ["operation", "table", "status"],
        )

        self.register_metric(
            "trading_operations_total",
            MetricType.COUNTER,
            "Total trading operations",
            ["symbol", "action", "status"],
        )

        self.register_metric(
            "active_users", MetricType.GAUGE, "Number of active users", []
        )

    def register_metric(
        self,
        name: str,
        metric_type: MetricType,
        description: str,
        labels: List[str] = None,
        buckets: List[float] = None,
    ):
        """メトリクス登録"""

        config = MetricConfig(
            name=name,
            metric_type=metric_type,
            description=description,
            labels=labels or [],
            buckets=buckets,
        )

        if metric_type == MetricType.COUNTER:
            metric = Counter(name, description, config.labels, registry=self.registry)
        elif metric_type == MetricType.HISTOGRAM:
            metric = Histogram(
                name,
                description,
                config.labels,
                buckets=buckets,
                registry=self.registry,
            )
        elif metric_type == MetricType.GAUGE:
            metric = Gauge(name, description, config.labels, registry=self.registry)

        self.metrics[name] = {"config": config, "metric": metric}

        logger.info(f"Registered metric: {name}")

    def increment_counter(self, name: str, value: float = 1, **labels):
        """カウンター増加"""
        if (
            name in self.metrics
            and self.metrics[name]["config"].metric_type == MetricType.COUNTER
        ):
            metric = self.metrics[name]["metric"]
            if labels:
                metric.labels(**labels).inc(value)
            else:
                metric.inc(value)

    def observe_histogram(self, name: str, value: float, **labels):
        """ヒストグラム観測"""
        if (
            name in self.metrics
            and self.metrics[name]["config"].metric_type == MetricType.HISTOGRAM
        ):
            metric = self.metrics[name]["metric"]
            if labels:
                metric.labels(**labels).observe(value)
            else:
                metric.observe(value)

    def set_gauge(self, name: str, value: float, **labels):
        """ゲージ設定"""
        if (
            name in self.metrics
            and self.metrics[name]["config"].metric_type == MetricType.GAUGE
        ):
            metric = self.metrics[name]["metric"]
            if labels:
                metric.labels(**labels).set(value)
            else:
                metric.set(value)

    def get_metrics_json(self) -> str:
        """メトリクスJSON取得"""
        return generate_latest(self.registry).decode("utf-8")

    async def collect_system_metrics(self):
        """システムメトリクス収集"""

        try:
            # CPU使用率
            cpu_percent = psutil.cpu_percent(interval=1)
            self.set_gauge("system_cpu_usage", cpu_percent)

            # メモリ使用率
            memory = psutil.virtual_memory()
            self.set_gauge("system_memory_usage", memory.percent)

            # ディスク使用率
            disk = psutil.disk_usage("/")
            # disk_usage_metric 未実装

            # プロセス情報
            process = psutil.Process()
            self.set_gauge(
                "process_memory_mb", process.memory_info().rss / (1024 * 1024)
            )
            self.set_gauge("process_cpu_percent", process.cpu_percent())

        except Exception as e:
            logger.error(f"System metrics collection error: {e}")


class PerformanceAnalyzer:
    """パフォーマンス分析器"""

    def __init__(self, window_size: int = 1000):
        self.window_size = window_size
        self.response_times: deque = deque(maxlen=window_size)
        self.error_counts: deque = deque(maxlen=window_size)
        self.request_counts: deque = deque(maxlen=window_size)
        self.custom_metrics: Dict[str, deque] = defaultdict(
            lambda: deque(maxlen=window_size)
        )

        self.redis_pool = None
        asyncio.create_task(self._init_redis())

    async def _init_redis(self):
        """Redis初期化"""
        try:
            self.redis_pool = aioredis.ConnectionPool.from_url(
                settings.system.redis_url
            )
        except Exception as e:
            logger.warning(f"Redis init failed for performance analyzer: {e}")

    def record_request(self, response_time: float, is_error: bool = False):
        """リクエスト記録"""
        self.response_times.append(response_time)
        self.request_counts.append(1)
        self.error_counts.append(1 if is_error else 0)

    def record_custom_metric(self, name: str, value: float):
        """カスタムメトリクス記録"""
        self.custom_metrics[name].append(value)

    def get_current_stats(self) -> Dict[str, Any]:
        """現在の統計情報取得"""

        stats = {}

        # レスポンスタイム統計
        if self.response_times:
            stats["response_time"] = {
                "avg": statistics.mean(self.response_times),
                "min": min(self.response_times),
                "max": max(self.response_times),
                "p50": statistics.quantiles(self.response_times, n=2)[0]
                if len(self.response_times) > 1
                else 0,
                "p95": statistics.quantiles(self.response_times, n=20)[18]
                if len(self.response_times) > 20
                else 0,
                "p99": statistics.quantiles(self.response_times, n=100)[98]
                if len(self.response_times) > 100
                else 0,
            }

        # エラーレート
        total_requests = sum(self.request_counts)
        total_errors = sum(self.error_counts)

        if total_requests > 0:
            stats["error_rate"] = (total_errors / total_requests) * 100
            stats["request_rate"] = (
                total_requests / len(self.request_counts) if self.request_counts else 0
            )

        # カスタムメトリクス
        stats["custom_metrics"] = {}
        for name, values in self.custom_metrics.items():
            if values:
                stats["custom_metrics"][name] = {
                    "avg": statistics.mean(values),
                    "min": min(values),
                    "max": max(values),
                    "latest": values[-1],
                }

        return stats

    async def save_snapshot(self, snapshot: PerformanceSnapshot):
        """パフォーマンススナップショット保存"""
        if not self.redis_pool:
            return

        try:
            redis = aioredis.Redis(connection_pool=self.redis_pool)

            # 時系列データ保存
            key = f"perf_snapshot:{int(snapshot.timestamp.timestamp())}"
            await redis.setex(
                key,
                3600 * 24,  # 24時間保持
                json.dumps(
                    {"timestamp": snapshot.timestamp.isoformat(), **snapshot.__dict__},
                    default=str,
                ),
            )

            # 最新スナップショット保存
            await redis.set(
                "latest_snapshot",
                json.dumps(
                    {"timestamp": snapshot.timestamp.isoformat(), **snapshot.__dict__},
                    default=str,
                ),
            )

        except Exception as e:
            logger.warning(f"Snapshot save error: {e}")

    async def get_historical_data(
        self, start_time: datetime, end_time: datetime, metric_name: str = None
    ) -> List[Dict[str, Any]]:
        """履歴データ取得"""
        if not self.redis_pool:
            return []

        try:
            redis = aioredis.Redis(connection_pool=self.redis_pool)

            # キー範囲検索
            start_ts = int(start_time.timestamp())
            end_ts = int(end_time.timestamp())

            keys = []
            cursor = 0
            while True:
                cursor, batch_keys = await redis.scan(
                    cursor=cursor, match=f"perf_snapshot:*", count=100
                )

                for key in batch_keys:
                    try:
                        ts = int(key.decode().split(":")[-1])
                        if start_ts <= ts <= end_ts:
                            keys.append(key)
                    except (IndexError, ValueError):
                        continue

                if cursor == 0:
                    break

            # データ取得
            if keys:
                values = await redis.mget(keys)
                data = []
                for value in values:
                    snapshot = json.loads(value)
                    if not metric_name or metric_name in snapshot:
                        data.append(snapshot)

                return sorted(data, key=lambda x: x.get("timestamp", ""))

        except Exception as e:
            logger.warning(f"Historical data retrieval error: {e}")

        return []


class PerformanceMonitor:
    """パフォーマンス監視メインクラス"""

    def __init__(self, port: int = 8000):
        self.metrics_collector = CustomMetricsCollector()
        self.analyzer = PerformanceAnalyzer()
        self.port = port
        self.monitoring_active = False

        # Prometheusサーバー開始
        try:
            start_http_server(self.port)
            logger.info(f"Prometheus metrics server started on port {self.port}")
        except Exception as e:
            logger.warning(f"Failed to start metrics server: {e}")

    async def start_monitoring(self, interval_seconds: int = 30):
        """監視開始"""
        self.monitoring_active = True

        while self.monitoring_active:
            try:
                await self._collect_and_analyze()
                await asyncio.sleep(interval_seconds)
            except Exception as e:
                logger.error(f"Monitoring error: {e}")
                await asyncio.sleep(60)  # エラー時は1分待機

    async def stop_monitoring(self):
        """監視停止"""
        self.monitoring_active = False
        logger.info("Performance monitoring stopped")

    async def _collect_and_analyze(self):
        """メトリクス収集と分析"""

        # システムメトリクス収集
        await self.metrics_collector.collect_system_metrics()

        # パフォーマンススナップショット作成
        snapshot = await self._create_snapshot()
        await self.analyzer.save_snapshot(snapshot)

        # 異常検出
        await self._detect_anomalies(snapshot)

        # 統計情報ログ
        stats = self.analyzer.get_current_stats()
        if stats:
            logger.debug(f"Performance stats: {json.dumps(stats, default=str)}")

    async def _create_snapshot(self) -> PerformanceSnapshot:
        """パフォーマンススナップショット作成"""

        try:
            # システム情報
            cpu_percent = psutil.cpu_percent()
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage("/")

            # プロセス情報
            process = psutil.Process()

            # 統計情報
            stats = self.analyzer.get_current_stats()

            snapshot = PerformanceSnapshot(
                timestamp=datetime.utcnow(),
                cpu_percent=cpu_percent,
                memory_percent=memory.percent,
                memory_used_mb=memory.used / (1024 * 1024),
                disk_usage_percent=(disk.used / disk.total) * 100,
                active_connections=len(process.connections()),
                db_connections=0,  # DB接続数は別途実装
                cache_hit_rate=0.0,  # キャッシュヒット率は別途実装
                request_rate=stats.get("request_rate", 0.0),
                error_rate=stats.get("error_rate", 0.0),
                response_time_avg=stats.get("response_time", {}).get("avg", 0.0),
                custom_metrics=stats.get("custom_metrics", {}),
            )

            return snapshot

        except Exception as e:
            logger.error(f"Snapshot creation error: {e}")
            return PerformanceSnapshot(timestamp=datetime.utcnow())

    async def _detect_anomalies(self, snapshot: PerformanceSnapshot):
        """異常検出"""

        # CPU使用率異常
        if snapshot.cpu_percent > 90:
            logger.warning(
                f"High CPU usage detected: {snapshot.cpu_percent}%",
                cpu_percent=snapshot.cpu_percent,
                component=Component.MONITORING,
            )

        # メモリ使用率異常
        if snapshot.memory_percent > 85:
            logger.warning(
                f"High memory usage detected: {snapshot.memory_percent}%",
                memory_percent=snapshot.memory_percent,
                component=Component.MONITORING,
            )

        # エラーレート異常
        if snapshot.error_rate > 5.0:
            logger.warning(
                f"High error rate detected: {snapshot.error_rate}%",
                error_rate=snapshot.error_rate,
                component=Component.MONITORING,
            )

        # レスポンスタイム異常
        if snapshot.response_time_avg > 2.0:
            logger.warning(
                f"High response time detected: {snapshot.response_time_avg}s",
                response_time_avg=snapshot.response_time_avg,
                component=Component.MONITORING,
            )

    def create_grafana_dashboard_config(self) -> Dict[str, Any]:
        """Grafanaダッシュボード設定生成"""

        return {
            "dashboard": {
                "title": "Trading Platform Performance",
                "tags": ["trading", "performance"],
                "timezone": "browser",
                "panels": [
                    {
                        "title": "System CPU Usage",
                        "type": "graph",
                        "targets": [
                            {"expr": "system_cpu_usage", "legendFormat": "CPU %"}
                        ],
                    },
                    {
                        "title": "System Memory Usage",
                        "type": "graph",
                        "targets": [
                            {"expr": "system_memory_usage", "legendFormat": "Memory %"}
                        ],
                    },
                    {
                        "title": "HTTP Request Rate",
                        "type": "graph",
                        "targets": [
                            {
                                "expr": "rate(http_requests_total[5m])",
                                "legendFormat": "{{method}} {{endpoint}}",
                            }
                        ],
                    },
                    {
                        "title": "HTTP Response Time",
                        "type": "graph",
                        "targets": [
                            {
                                "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
                                "legendFormat": "95th percentile",
                            },
                            {
                                "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))",
                                "legendFormat": "50th percentile",
                            },
                        ],
                    },
                    {
                        "title": "Error Rate",
                        "type": "graph",
                        "targets": [
                            {
                                "expr": 'rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) * 100',
                                "legendFormat": "Error Rate %",
                            }
                        ],
                    },
                    {
                        "title": "Trading Operations",
                        "type": "graph",
                        "targets": [
                            {
                                "expr": "rate(trading_operations_total[5m])",
                                "legendFormat": "{{symbol}} {{action}}",
                            }
                        ],
                    },
                    {
                        "title": "Active Users",
                        "type": "singlestat",
                        "targets": [
                            {"expr": "active_users", "legendFormat": "Active Users"}
                        ],
                    },
                ],
            }
        }

    async def export_metrics(
        self,
        format: str = "prometheus",
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
    ) -> str:
        """メトリクスエクスポート"""

        if format == "prometheus":
            return self.metrics_collector.get_metrics_json()

        elif format == "json":
            # カスタムJSON形式
            if start_time and end_time:
                historical_data = await self.analyzer.get_historical_data(
                    start_time, end_time
                )
                return json.dumps(historical_data, default=str, indent=2)
            else:
                current_stats = self.analyzer.get_current_stats()
                return json.dumps(current_stats, default=str, indent=2)

        else:
            raise ValueError(f"Unsupported format: {format}")


# デコレータ
def monitor_performance(operation_name: str):
    """パフォーマンス監視デコレータ"""

    def decorator(func):
        # グローバルモニターインスタンス取得（簡略化）
        monitor = PerformanceMonitor()

        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            is_error = False

            try:
                result = await func(*args, **kwargs)
                return result
            except Exception as e:
                is_error = True
                raise
            finally:
                duration = time.time() - start_time
                monitor.analyzer.record_request(duration, is_error)
                monitor.metrics_collector.observe_histogram(
                    "function_duration_seconds", duration, function=operation_name
                )

        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            is_error = False

            try:
                result = func(*args, **kwargs)
                return result
            except Exception as e:
                is_error = True
                raise
            finally:
                duration = time.time() - start_time
                monitor.analyzer.record_request(duration, is_error)
                monitor.metrics_collector.observe_histogram(
                    "function_duration_seconds", duration, function=operation_name
                )

        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper

    return decorator


# グローバルインスタンス
_performance_monitor = None


def get_performance_monitor() -> PerformanceMonitor:
    """パフォーマンスモニター取得"""
    global _performance_monitor
    if _performance_monitor is None:
        _performance_monitor = PerformanceMonitor()
    return _performance_monitor


# 使用例
async def example_usage():
    """使用例"""

    monitor = get_performance_monitor()

    # 監視開始
    monitoring_task = asyncio.create_task(monitor.start_monitoring(30))

    # メトリクス記録
    monitor.metrics_collector.increment_counter(
        "http_requests_total", method="GET", endpoint="/api/v1/trades", status="200"
    )

    monitor.metrics_collector.observe_histogram(
        "http_request_duration_seconds", 0.5, method="GET", endpoint="/api/v1/trades"
    )

    # パフォーマンス分析
    monitor.analyzer.record_request(0.5, False)
    monitor.analyzer.record_custom_metric("custom_kpi", 42.0)

    stats = monitor.analyzer.get_current_stats()
    print(f"Current performance stats: {json.dumps(stats, default=str, indent=2)}")

    # Grafana設定
    grafana_config = monitor.create_grafana_dashboard_config()
    print(
        f"Grafana dashboard config: {json.dumps(grafana_config, default=str, indent=2)}"
    )

    # 5分後に停止
    await asyncio.sleep(300)
    await monitor.stop_monitoring()
    monitoring_task.cancel()


if __name__ == "__main__":
    asyncio.run(example_usage())
