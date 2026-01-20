"""
ロギングシステムの実装例
APIエンドポイント、トレード実行、承認ワークフローへの統合
"""

from datetime import datetime
from typing import Dict, Any, Optional
import uuid
import asyncio

from src.logging.structured_logger import (
    get_logger,
    log_performance,
    log_security_event,
    SecurityEventType,
    Component,
    LogLevel,
    PerformanceMetrics,
)
from src.logging.log_aggregator import (
    get_log_aggregator,
    LogFilter,
    LogAlert,
    AlertSeverity,
)


class TradingAPILogger:
    """取引APIロギング"""

    def __init__(self):
        self.logger = get_logger("trading.api")
        self.aggregator = get_log_aggregator()

    @log_performance("api_request", logger=get_logger("trading.api"))
    async def log_api_request(
        self,
        endpoint: str,
        method: str,
        user_id: Optional[str] = None,
        request_id: str = None,
        ip_address: str = None,
        user_agent: str = None,
        request_data: Dict[str, Any] = None,
    ):
        """APIリクエストログ"""

        correlation_id = str(uuid.uuid4())

        # コンテキスト設定
        await self.logger.set_context(
            correlation_id=correlation_id,
            request_id=request_id or correlation_id,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            component=Component.API,
        )

        self.logger.info(
            f"API Request: {method} {endpoint}",
            endpoint=endpoint,
            method=method,
            request_data=request_data,
            user_id=user_id,
        )

        return correlation_id

    def log_api_response(
        self,
        correlation_id: str,
        status_code: int,
        response_data: Dict[str, Any] = None,
        duration_ms: float = 0.0,
    ):
        """APIレスポンスログ"""

        metrics = PerformanceMetrics(duration_ms=duration_ms)

        self.logger.log_performance(
            "api_response",
            metrics,
            {
                "correlation_id": correlation_id,
                "status_code": status_code,
                "response_size": len(str(response_data)) if response_data else 0,
            },
        )

        if status_code >= 400:
            self.logger.warning(
                f"API Error Response: {status_code}",
                correlation_id=correlation_id,
                status_code=status_code,
                error_data=response_data,
            )

    @log_security_event(SecurityEventType.TRADE_EXECUTION, "trade_api")
    async def log_trade_execution(
        self,
        symbol: str,
        action: str,
        quantity: float,
        price: float,
        user_id: str,
        success: bool = True,
        error: str = None,
    ):
        """取引実行ログ（セキュリティイベント）"""

        # 構造化ログ
        self.logger.info(
            f"Trade Execution: {action} {quantity} {symbol} at ${price}",
            symbol=symbol,
            action=action,
            quantity=quantity,
            price=price,
            success=success,
            user_id=user_id,
            component=Component.TRADING,
        )

        if not success:
            self.logger.error(
                f"Trade Execution Failed: {error}",
                symbol=symbol,
                action=action,
                error=error,
                user_id=user_id,
            )


class ApprovalWorkflowLogger:
    """承認ワークフローロギング"""

    def __init__(self):
        self.logger = get_logger("trading.approval")
        self.aggregator = get_log_aggregator()

    async def log_approval_request(
        self,
        request_id: str,
        trade_details: Dict[str, Any],
        requestor_id: str,
        approvers: list,
    ):
        """承認リクエストログ"""

        correlation_id = str(uuid.uuid4())

        await self.logger.set_context(
            correlation_id=correlation_id,
            user_id=requestor_id,
            component=Component.APPROVAL,
        )

        self.logger.info(
            f"Approval Request Created: {request_id}",
            request_id=request_id,
            trade_details=trade_details,
            requestor_id=requestor_id,
            approvers=approvers,
        )

        # セキュリティイベントログ
        from src.logging.structured_logger import SecurityEvent

        security_event = SecurityEvent(
            event_type=SecurityEventType.APPROVAL_REQUEST,
            resource=f"trade_request_{request_id}",
            action="create_request",
            success=True,
            user_id=requestor_id,
            details=trade_details,
        )

        await self.logger.log_security_event(security_event)

    async def log_approval_decision(
        self,
        request_id: str,
        approver_id: str,
        decision: str,  # approved, rejected
        comments: str = None,
    ):
        """承認決定ログ"""

        self.logger.info(
            f"Approval Decision: {decision} by {approver_id}",
            request_id=request_id,
            approver_id=approver_id,
            decision=decision,
            comments=comments,
            component=Component.APPROVAL,
        )

        # セキュリティイベント
        from src.logging.structured_logger import SecurityEvent

        security_event = SecurityEvent(
            event_type=SecurityEventType.APPROVAL_DECISION,
            resource=f"trade_request_{request_id}",
            action=f"decision_{decision}",
            success=True,
            user_id=approver_id,
            details={"decision": decision, "comments": comments},
        )

        await self.logger.log_security_event(security_event)

    async def log_approval_timeout(self, request_id: str, timeout_hours: int):
        """承認タイムアウトログ"""

        self.logger.warning(
            f"Approval Request Timeout: {request_id}",
            request_id=request_id,
            timeout_hours=timeout_hours,
            component=Component.APPROVAL,
        )


class DatabasePerformanceLogger:
    """データベースパフォーマンスロギング"""

    def __init__(self):
        self.logger = get_logger("trading.database")

    @log_performance("database_query", logger=get_logger("trading.database"))
    async def log_database_operation(
        self,
        operation: str,
        table: str,
        query_type: str,  # SELECT, INSERT, UPDATE, DELETE
        affected_rows: int = 0,
        duration_ms: float = 0.0,
        error: str = None,
    ):
        """データベース操作ログ"""

        metrics = PerformanceMetrics(duration_ms=duration_ms, db_queries=1)

        log_data = {
            "operation": operation,
            "table": table,
            "query_type": query_type,
            "affected_rows": affected_rows,
            "component": Component.DATABASE,
        }

        if error:
            self.logger.error(
                f"Database Operation Failed: {operation}", error=error, **log_data
            )
        else:
            self.logger.log_performance(operation, metrics, log_data)


class MonitoringDashboardLogger:
    """監視ダッシュボードロギング"""

    def __init__(self):
        self.logger = get_logger("trading.monitoring")
        self.aggregator = get_log_aggregator()

    async def log_system_metrics(
        self,
        cpu_usage: float,
        memory_usage: float,
        disk_usage: float,
        active_connections: int,
    ):
        """システムメトリクスログ"""

        self.logger.info(
            "System Metrics Update",
            component=Component.MONITORING,
            system_metrics={
                "cpu_usage_percent": cpu_usage,
                "memory_usage_percent": memory_usage,
                "disk_usage_percent": disk_usage,
                "active_connections": active_connections,
            },
        )

    async def log_trading_metrics(
        self,
        total_trades: int,
        successful_trades: int,
        failed_trades: int,
        total_volume: float,
        avg_trade_size: float,
    ):
        """取引メトリクスログ"""

        success_rate = (successful_trades / max(total_trades, 1)) * 100

        self.logger.info(
            f"Trading Metrics: {success_rate:.1f}% success rate",
            component=Component.TRADING,
            trading_metrics={
                "total_trades": total_trades,
                "successful_trades": successful_trades,
                "failed_trades": failed_trades,
                "success_rate_percent": success_rate,
                "total_volume": total_volume,
                "avg_trade_size": avg_trade_size,
            },
        )

    async def create_performance_alerts(self):
        """パフォーマンスアラート作成"""

        # 高エラーレートアラート
        await self.aggregator.create_alert(
            LogAlert(
                name="high_error_rate",
                condition={"query": {"term": {"level": "ERROR"}}},
                severity=AlertSeverity.HIGH,
                threshold=10,
                time_window_minutes=5,
                notification_channels=["slack"],
            )
        )

        # 取引失敗率アラート
        await self.aggregator.create_alert(
            LogAlert(
                name="high_trade_failure_rate",
                condition={
                    "query": {
                        "bool": {
                            "must": [
                                {"term": {"component": "trading"}},
                                {"term": {"level": "ERROR"}},
                                {"wildcard": {"message": "*trade*failed*"}},
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


# 統合使用例
class IntegratedTradingSystem:
    """統合取引システム（ロギング例）"""

    def __init__(self):
        self.api_logger = TradingAPILogger()
        self.approval_logger = ApprovalWorkflowLogger()
        self.db_logger = DatabasePerformanceLogger()
        self.monitoring_logger = MonitoringDashboardLogger()

    async def execute_trade_with_logging(
        self,
        symbol: str,
        action: str,
        quantity: float,
        user_id: str,
        require_approval: bool = True,
    ):
        """取引実行（完全ロギング付き）"""

        correlation_id = await self.api_logger.log_api_request(
            endpoint="/api/v1/trades",
            method="POST",
            user_id=user_id,
            request_data={"symbol": symbol, "action": action, "quantity": quantity},
        )

        start_time = datetime.now()

        try:
            # 承認チェック
            if require_approval:
                trade_details = {
                    "symbol": symbol,
                    "action": action,
                    "quantity": quantity,
                    "estimated_value": quantity * 100,  # 簡易計算
                }

                await self.approval_logger.log_approval_request(
                    request_id=correlation_id,
                    trade_details=trade_details,
                    requestor_id=user_id,
                    approvers=["manager1", "manager2"],
                )

                # 承認待ち（シミュレーション）
                await asyncio.sleep(1)

                await self.approval_logger.log_approval_decision(
                    request_id=correlation_id,
                    approver_id="manager1",
                    decision="approved",
                    comments="Trade looks good",
                )

            # データベース操作
            await self.db_logger.log_database_operation(
                operation="insert_trade",
                table="trades",
                query_type="INSERT",
                affected_rows=1,
                duration_ms=50.5,
            )

            # 取引実行
            price = 150.0  # 仮価格
            await self.api_logger.log_trade_execution(
                symbol=symbol,
                action=action,
                quantity=quantity,
                price=price,
                user_id=user_id,
                success=True,
            )

            # 成功レスポンス
            duration_ms = (datetime.now() - start_time).total_seconds() * 1000
            self.api_logger.log_api_response(
                correlation_id=correlation_id,
                status_code=200,
                response_data={
                    "success": True,
                    "trade_id": correlation_id,
                    "symbol": symbol,
                    "executed_price": price,
                },
                duration_ms=duration_ms,
            )

            return {"success": True, "trade_id": correlation_id}

        except Exception as e:
            # エラーロギング
            duration_ms = (datetime.now() - start_time).total_seconds() * 1000

            await self.api_logger.log_trade_execution(
                symbol=symbol,
                action=action,
                quantity=quantity,
                price=0,
                user_id=user_id,
                success=False,
                error=str(e),
            )

            self.api_logger.log_api_response(
                correlation_id=correlation_id,
                status_code=500,
                response_data={"error": str(e)},
                duration_ms=duration_ms,
            )

            raise


# 監視タスク
async def monitoring_task():
    """定期的監視タスク"""

    monitoring_logger = MonitoringDashboardLogger()

    while True:
        try:
            # システムメトリクスログ
            await monitoring_logger.log_system_metrics(
                cpu_usage=45.2,
                memory_usage=67.8,
                disk_usage=34.5,
                active_connections=125,
            )

            # 取引メトリクスログ
            await monitoring_logger.log_trading_metrics(
                total_trades=150,
                successful_trades=142,
                failed_trades=8,
                total_volume=2500000.0,
                avg_trade_size=16666.67,
            )

            await asyncio.sleep(60)  # 1分ごと

        except Exception as e:
            logger.error(f"Monitoring task error: {e}")
            await asyncio.sleep(300)


# ログ検索と分析
async def analyze_trading_logs():
    """取引ログ分析例"""

    aggregator = get_log_aggregator()

    # エラーログ検索
    error_filter = LogFilter(
        component=Component.TRADING,
        level=LogLevel.ERROR,
        time_range=(datetime.now() - timedelta(hours=24), datetime.now()),
    )

    error_logs = await aggregator.search_logs(error_filter, size=100)
    print(f"Found {len(error_logs['hits']['hits'])} trading errors in last 24h")

    # 統計情報取得
    stats = await aggregator.get_log_statistics(
        time_range_hours=24, group_by="component"
    )
    print(f"Component statistics: {stats}")

    # ログエクスポート
    export_data = await aggregator.export_logs(error_filter, format="csv", size=1000)

    # ファイル保存
    with open("trading_errors.csv", "w") as f:
        f.write(export_data)


if __name__ == "__main__":
    # デモ実行
    async def demo():
        system = IntegratedTradingSystem()

        # 取引実行
        result = await system.execute_trade_with_logging(
            symbol="AAPL",
            action="BUY",
            quantity=100,
            user_id="trader123",
            require_approval=True,
        )

        print(f"Trade result: {result}")

        # 監視タスク開始
        # asyncio.create_task(monitoring_task())

        # ログ分析
        # await analyze_trading_logs()

    asyncio.run(demo())
