"""
ログ集約・フィルタリングシステム
Kibanaダッシュボード設定、ログ検索、アラート機能
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union
from dataclasses import dataclass, field
from enum import Enum
import re
from elasticsearch import AsyncElasticsearch
import aioredis
from src.core.config import settings
from src.logging.structured_logger import get_logger, LogLevel, Component

logger = get_logger(__name__)


class AlertSeverity(Enum):
    """アラート深刻度"""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class LogFilter:
    """ログフィルター"""

    component: Optional[Component] = None
    level: Optional[LogLevel] = None
    time_range: Optional[tuple] = None  # (start, end)
    user_id: Optional[str] = None
    correlation_id: Optional[str] = None
    message_pattern: Optional[str] = None
    custom_query: Optional[Dict[str, Any]] = None


@dataclass
class LogAlert:
    """ログアラート"""

    name: str
    condition: Dict[str, Any]
    severity: AlertSeverity
    threshold: int
    time_window_minutes: int
    notification_channels: List[str] = field(default_factory=list)
    enabled: bool = True
    cooldown_minutes: int = 15


class LogAggregator:
    """ログ集約クラス"""

    def __init__(self):
        self.elasticsearch: Optional[AsyncElasticsearch] = None
        self.redis_pool: Optional[aioredis.ConnectionPool] = None
        self._alerts: Dict[str, LogAlert] = {}

        asyncio.create_task(self._initialize())

    async def _initialize(self):
        """初期化"""
        try:
            # Elasticsearch接続
            if settings.get("logging.elasticsearch.enabled", False):
                self.elasticsearch = AsyncElasticsearch(
                    settings.get("logging.elasticsearch.url", "http://localhost:9200")
                )

            # Redis接続
            if settings.get("logging.redis.enabled", False):
                self.redis_pool = aioredis.ConnectionPool.from_url(
                    settings.system.redis_url
                )

            # デフォルトアラート設定
            await self._setup_default_alerts()

        except Exception as e:
            logger.error(f"LogAggregator initialization failed: {e}")

    async def search_logs(
        self, log_filter: LogFilter, size: int = 100, sort: str = "timestamp:desc"
    ) -> Dict[str, Any]:
        """ログ検索"""
        if not self.elasticsearch:
            return {"hits": {"total": {"value": 0}, "hits": []}}

        try:
            # クエリ構築
            query = self._build_query(log_filter)

            # 検索実行
            index_pattern = f"logs-*"
            result = await self.elasticsearch.search(
                index=index_pattern,
                body={
                    "query": query,
                    "size": size,
                    "sort": sort.split(":"),
                    "highlight": {"fields": {"message": {}, "exception.message": {}}},
                },
            )

            return result

        except Exception as e:
            logger.error(f"Log search failed: {e}")
            return {"hits": {"total": {"value": 0}, "hits": []}}

    def _build_query(self, log_filter: LogFilter) -> Dict[str, Any]:
        """Elasticsearchクエリ構築"""
        must_clauses = []
        filter_clauses = []

        # 時間範囲
        if log_filter.time_range:
            start_time, end_time = log_filter.time_range
            filter_clauses.append(
                {"range": {"timestamp": {"gte": start_time, "lte": end_time}}}
            )

        # コンポーネント
        if log_filter.component:
            must_clauses.append({"term": {"component": log_filter.component.value}})

        # レベル
        if log_filter.level:
            must_clauses.append({"term": {"level": log_filter.level.value}})

        # ユーザーID
        if log_filter.user_id:
            must_clauses.append({"term": {"user_id": log_filter.user_id}})

        # 相関ID
        if log_filter.correlation_id:
            must_clauses.append({"term": {"correlation_id": log_filter.correlation_id}})

        # メッセージパターン
        if log_filter.message_pattern:
            must_clauses.append(
                {"wildcard": {"message": f"*{log_filter.message_pattern}*"}}
            )

        # カスタムクエリ
        if log_filter.custom_query:
            must_clauses.append(log_filter.custom_query)

        return {"bool": {"must": must_clauses, "filter": filter_clauses}}

    async def get_log_statistics(
        self, time_range_hours: int = 24, group_by: str = "component"
    ) -> Dict[str, Any]:
        """ログ統計取得"""
        if not self.elasticsearch:
            return {}

        try:
            end_time = datetime.utcnow()
            start_time = end_time - timedelta(hours=time_range_hours)

            # 集計クエリ
            aggs = {}

            if group_by == "component":
                aggs["components"] = {
                    "terms": {"field": "component.keyword"},
                    "aggs": {"levels": {"terms": {"field": "level.keyword"}}},
                }
            elif group_by == "level":
                aggs["levels"] = {
                    "terms": {"field": "level.keyword"},
                    "aggs": {"components": {"terms": {"field": "component.keyword"}}},
                }
            elif group_by == "hourly":
                aggs["timeline"] = {
                    "date_histogram": {"field": "timestamp", "interval": "1h"},
                    "aggs": {"levels": {"terms": {"field": "level.keyword"}}},
                }

            result = await self.elasticsearch.search(
                index="logs-*",
                body={
                    "query": {
                        "range": {
                            "timestamp": {
                                "gte": start_time.isoformat(),
                                "lte": end_time.isoformat(),
                            }
                        }
                    },
                    "aggs": aggs,
                    "size": 0,
                },
            )

            return result.get("aggregations", {})

        except Exception as e:
            logger.error(f"Log statistics failed: {e}")
            return {}

    async def create_alert(self, alert: LogAlert) -> str:
        """アラート作成"""
        alert_id = f"alert_{alert.name}_{int(datetime.utcnow().timestamp())}"
        self._alerts[alert_id] = alert

        # Redisに保存
        if self.redis_pool:
            try:
                redis = aioredis.Redis(connection_pool=self.redis_pool)
                await redis.hset(
                    "log_alerts", alert_id, json.dumps(alert.__dict__, default=str)
                )
            except Exception as e:
                logger.warning(f"Failed to save alert to Redis: {e}")

        logger.info(f"Created log alert: {alert.name}")
        return alert_id

    async def check_alerts(self):
        """アラートチェック"""
        for alert_id, alert in self._alerts.items():
            if not alert.enabled:
                continue

            try:
                # クールダウンチェック
                if await self._is_in_cooldown(alert_id, alert.cooldown_minutes):
                    continue

                # アラート条件チェック
                triggered = await self._check_alert_condition(alert)

                if triggered:
                    await self._trigger_alert(alert_id, alert)

            except Exception as e:
                logger.error(f"Alert check failed for {alert.name}: {e}")

    async def _check_alert_condition(self, alert: LogAlert) -> bool:
        """アラート条件チェック"""
        if not self.elasticsearch:
            return False

        try:
            # 時間ウィンドウ設定
            end_time = datetime.utcnow()
            start_time = end_time - timedelta(minutes=alert.time_window_minutes)

            # 条件クエリ構築
            condition_query = alert.condition.get("query", {})

            result = await self.elasticsearch.count(
                index="logs-*",
                body={
                    "query": {
                        "bool": {
                            "must": [
                                {
                                    "range": {
                                        "timestamp": {
                                            "gte": start_time.isoformat(),
                                            "lte": end_time.isoformat(),
                                        }
                                    }
                                },
                                condition_query,
                            ]
                        }
                    }
                },
            )

            count = result.get("count", 0)
            return count >= alert.threshold

        except Exception as e:
            logger.error(f"Alert condition check failed: {e}")
            return False

    async def _trigger_alert(self, alert_id: str, alert: LogAlert):
        """アラートトリガー"""
        message = f"Alert '{alert.name}' triggered: {alert.severity.value} severity"
        logger.warning(message, alert_id=alert_id)

        # 通知チャネル
        for channel in alert.notification_channels:
            await self._send_notification(channel, alert, message)

        # クールダウン設定
        await self._set_cooldown(alert_id, alert.cooldown_minutes)

    async def _send_notification(self, channel: str, alert: LogAlert, message: str):
        """通知送信"""
        try:
            if channel == "slack":
                await self._send_slack_notification(alert, message)
            elif channel == "email":
                await self._send_email_notification(alert, message)
            elif channel == "webhook":
                await self._send_webhook_notification(alert, message)
        except Exception as e:
            logger.error(f"Notification failed for {channel}: {e}")

    async def _send_slack_notification(self, alert: LogAlert, message: str):
        """Slack通知"""
        # 実装: Slack Webhook API
        logger.info(f"Slack notification: {message}")

    async def _send_email_notification(self, alert: LogAlert, message: str):
        """Email通知"""
        # 実装: SMTP/SendGrid
        logger.info(f"Email notification: {message}")

    async def _send_webhook_notification(self, alert: LogAlert, message: str):
        """Webhook通知"""
        # 実装: HTTP POST
        logger.info(f"Webhook notification: {message}")

    async def _is_in_cooldown(self, alert_id: str, cooldown_minutes: int) -> bool:
        """クールダウンチェック"""
        if not self.redis_pool:
            return False

        try:
            redis = aioredis.Redis(connection_pool=self.redis_pool)
            cooldown_key = f"alert_cooldown:{alert_id}"
            return await redis.exists(cooldown_key)
        except Exception:
            return False

    async def _set_cooldown(self, alert_id: str, cooldown_minutes: int):
        """クールダウン設定"""
        if not self.redis_pool:
            return

        try:
            redis = aioredis.Redis(connection_pool=self.redis_pool)
            cooldown_key = f"alert_cooldown:{alert_id}"
            await redis.setex(cooldown_key, cooldown_minutes * 60, "1")
        except Exception as e:
            logger.warning(f"Failed to set cooldown: {e}")

    async def _setup_default_alerts(self):
        """デフォルトアラート設定"""
        # エラーレートアラート
        await self.create_alert(
            LogAlert(
                name="high_error_rate",
                condition={"query": {"term": {"level": "ERROR"}}},
                severity=AlertSeverity.HIGH,
                threshold=10,
                time_window_minutes=5,
                notification_channels=["slack"],
            )
        )

        # 認証失敗アラート
        await self.create_alert(
            LogAlert(
                name="auth_failures",
                condition={
                    "query": {"term": {"security_event.event_type": "login_failed"}}
                },
                severity=AlertSeverity.MEDIUM,
                threshold=5,
                time_window_minutes=10,
                notification_channels=["email"],
            )
        )

        # データベースエラーアラート
        await self.create_alert(
            LogAlert(
                name="database_errors",
                condition={
                    "query": {
                        "bool": {
                            "must": [
                                {"term": {"component": "database"}},
                                {"term": {"level": "ERROR"}},
                            ]
                        }
                    }
                },
                severity=AlertSeverity.CRITICAL,
                threshold=3,
                time_window_minutes=2,
                notification_channels=["slack", "email"],
            )
        )

    async def export_logs(
        self, log_filter: LogFilter, format: str = "json", size: int = 10000
    ) -> str:
        """ログエクスポート"""
        results = await self.search_logs(log_filter, size)

        if format == "csv":
            return self._convert_to_csv(results)
        elif format == "json":
            return json.dumps(results, default=str, indent=2)
        else:
            return str(results)

    def _convert_to_csv(self, results: Dict[str, Any]) -> str:
        """CSV変換"""
        import csv
        import io

        hits = results.get("hits", {}).get("hits", [])

        if not hits:
            return "No results found"

        # ヘッダー取得
        headers = set()
        for hit in hits:
            headers.update(hit.get("_source", {}).keys())

        headers = sorted(headers)

        # CSV作成
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=headers)
        writer.writeheader()

        for hit in hits:
            source = hit.get("_source", {})
            writer.writerow({header: source.get(header, "") for header in headers})

        return output.getvalue()

    async def get_kibana_dashboard_config(self) -> Dict[str, Any]:
        """Kibanaダッシュボード設定"""
        return {
            "dashboard": {
                "title": "Trading Platform Logs Dashboard",
                "panels": [
                    {
                        "title": "Log Levels Over Time",
                        "type": "histogram",
                        "query": "*",
                        "aggregation": {
                            "date_histogram": {"field": "timestamp", "interval": "1h"},
                            "terms": {"field": "level.keyword"},
                        },
                    },
                    {
                        "title": "Component Distribution",
                        "type": "pie",
                        "query": "*",
                        "aggregation": {"terms": {"field": "component.keyword"}},
                    },
                    {
                        "title": "Error Rate",
                        "type": "metric",
                        "query": "level:ERROR",
                        "aggregation": {"count": {}},
                    },
                    {
                        "title": "Recent Security Events",
                        "type": "table",
                        "query": "security_event:*",
                        "sort": [{"timestamp": {"order": "desc"}}],
                    },
                ],
            }
        }


class LogAnalyzer:
    """ログ分析クラス"""

    def __init__(self, aggregator: LogAggregator):
        self.aggregator = aggregator

    async def detect_anomalies(
        self, time_range_hours: int = 24, threshold_multiplier: float = 2.0
    ) -> List[Dict[str, Any]]:
        """異常検出"""
        anomalies = []

        # エラーレート異常
        error_rate_anomaly = await self._detect_error_rate_anomaly(
            time_range_hours, threshold_multiplier
        )
        if error_rate_anomaly:
            anomalies.append(error_rate_anomaly)

        # レスポンスタイム異常
        response_time_anomaly = await self._detect_response_time_anomaly(
            time_range_hours, threshold_multiplier
        )
        if response_time_anomaly:
            anomalies.append(response_time_anomaly)

        # ユーザーアクティビティ異常
        activity_anomaly = await self._detect_activity_anomaly(
            time_range_hours, threshold_multiplier
        )
        if activity_anomaly:
            anomalies.append(activity_anomaly)

        return anomalies

    async def _detect_error_rate_anomaly(
        self, time_range_hours: int, threshold_multiplier: float
    ) -> Optional[Dict[str, Any]]:
        """エラーレート異常検出"""
        # 実装: 過去のエラーレートと比較
        return None

    async def _detect_response_time_anomaly(
        self, time_range_hours: int, threshold_multiplier: float
    ) -> Optional[Dict[str, Any]]:
        """レスポンスタイム異常検出"""
        # 実装: performance.duration_msを分析
        return None

    async def _detect_activity_anomaly(
        self, time_range_hours: int, threshold_multiplier: float
    ) -> Optional[Dict[str, Any]]:
        """ユーザーアクティビティ異常検出"""
        # 実装: user_idごとのアクティビティを分析
        return None

    async def generate_report(
        self,
        start_time: datetime,
        end_time: datetime,
        components: List[Component] = None,
    ) -> Dict[str, Any]:
        """レポート生成"""
        report = {
            "period": {"start": start_time.isoformat(), "end": end_time.isoformat()},
            "summary": {},
            "details": {},
            "recommendations": [],
        }

        # 統計情報収集
        for component in components or list(Component):
            stats = await self.aggregator.get_log_statistics(
                time_range_hours=int((end_time - start_time).total_seconds() / 3600),
                group_by="level",
            )
            report["details"][component.value] = stats

        return report


# グローバルインスタンス
_log_aggregator = None


def get_log_aggregator() -> LogAggregator:
    """ログ集約器取得"""
    global _log_aggregator
    if _log_aggregator is None:
        _log_aggregator = LogAggregator()
    return _log_aggregator


# バックグラウンドタスク
async def start_log_monitoring():
    """ログ監視開始"""
    aggregator = get_log_aggregator()

    while True:
        try:
            await aggregator.check_alerts()
            await asyncio.sleep(60)  # 1分ごとにチェック
        except Exception as e:
            logger.error(f"Log monitoring error: {e}")
            await asyncio.sleep(300)  # エラー時は5分待機
