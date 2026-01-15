"""
WebSocket real-time notification system for AGStock
リアルタイムの市場データと取引通知を配信
"""

import asyncio
import websockets
import json
import logging
from datetime import datetime
from typing import Dict, List, Set, Optional
from dataclasses import dataclass
import pandas as pd

logger = logging.getLogger(__name__)


@dataclass
class NotificationMessage:
    """通知メッセージのデータ構造"""

    message_id: str
    type: str  # 'price_alert', 'trade_execution', 'portfolio_update', 'system_alert'
    priority: str  # 'low', 'medium', 'high', 'critical'
    title: str
    message: str
    data: Dict
    timestamp: datetime
    user_id: Optional[str] = None


class WebSocketManager:
    """
    WebSocket接続管理クラス
    """

    def __init__(self):
        self.active_connections: Dict[str, websockets.WebSocketServerProtocol] = {}
        self.user_subscriptions: Dict[str, Set[str]] = {}
        self.notification_queue = asyncio.Queue()
        self.is_running = False

    async def register_client(self, websocket, user_id: str, subscriptions: List[str] = None):
        """
        クライアントを登録

        Args:
            websocket: WebSocket接続
            user_id: ユーザーID
            subscriptions: 購読する通知タイプ
        """
        self.active_connections[user_id] = websocket
        self.user_subscriptions[user_id] = set(subscriptions or ["all"])

        # 登録完了通知
        registration_msg = NotificationMessage(
            message_id=f"reg_{datetime.now().timestamp()}",
            type="connection",
            priority="low",
            title="接続完了",
            message=f"ユーザー {user_id} が接続しました",
            data={"user_id": user_id, "connected_at": datetime.now().isoformat()},
            timestamp=datetime.now(),
        )

        await self.send_notification_to_user(user_id, registration_msg)
        logger.info(f"User {user_id} connected with subscriptions: {subscriptions}")

    async def unregister_client(self, user_id: str):
        """
        クライアントを登録解除

        Args:
            user_id: ユーザーID
        """
        if user_id in self.active_connections:
            del self.active_connections[user_id]

        if user_id in self.user_subscriptions:
            del self.user_subscriptions[user_id]

        logger.info(f"User {user_id} disconnected")

    async def send_notification_to_user(self, user_id: str, notification: NotificationMessage):
        """
        特定ユーザーに通知を送信

        Args:
            user_id: ユーザーID
            notification: 通知メッセージ
        """
        if user_id in self.active_connections:
            websocket = self.active_connections[user_id]

            # 購読チェック
            user_subscriptions = self.user_subscriptions.get(user_id, set(["all"]))
            if notification.type in user_subscriptions or "all" in user_subscriptions:
                try:
                    await websocket.send(
                        json.dumps(
                            {
                                "type": "notification",
                                "data": {
                                    "id": notification.message_id,
                                    "type": notification.type,
                                    "priority": notification.priority,
                                    "title": notification.title,
                                    "message": notification.message,
                                    "data": notification.data,
                                    "timestamp": notification.timestamp.isoformat(),
                                },
                            }
                        )
                    )
                    logger.debug(f"Notification sent to user {user_id}: {notification.title}")
                except websockets.exceptions.ConnectionClosed:
                    await self.unregister_client(user_id)
                except Exception as e:
                    logger.error(f"Error sending notification to {user_id}: {e}")

    async def broadcast_notification(self, notification: NotificationMessage, target_users: List[str] = None):
        """
        通知をブロードキャスト

        Args:
            notification: 通知メッセージ
            target_users: 送信対象ユーザーリスト（Noneなら全員）
        """
        target_list = target_users or list(self.active_connections.keys())

        for user_id in target_list:
            await self.send_notification_to_user(user_id, notification)

        logger.info(f"Broadcast notification sent to {len(target_list)} users")

    async def add_notification_to_queue(self, notification: NotificationMessage):
        """
        通知をキューに追加

        Args:
            notification: 通知メッセージ
        """
        await self.notification_queue.put(notification)

    async def process_notification_queue(self):
        """
        通知キューを処理
        """
        while self.is_running:
            try:
                # キューから通知を取得
                notification = await asyncio.wait_for(self.notification_queue.get(), timeout=1.0)

                # 即時配信
                await self.broadcast_notification(notification)

            except asyncio.TimeoutError:
                # タイムアウトは正常（キューが空の場合）
                continue
            except Exception as e:
                logger.error(f"Error processing notification queue: {e}")
                await asyncio.sleep(1)

    async def get_connected_users(self) -> List[Dict]:
        """
        接続中ユーザーリストを取得

        Returns:
            接続中ユーザー情報リスト
        """
        users = []
        for user_id, websocket in self.active_connections.items():
            try:
                # Pingで接続確認
                await websocket.ping()
                users.append(
                    {
                        "user_id": user_id,
                        "connected_at": datetime.now().isoformat(),
                        "subscriptions": list(self.user_subscriptions.get(user_id, [])),
                    }
                )
            except Exception:
                # 接続が切れていれば削除
                await self.unregister_client(user_id)

        return users

    def get_connection_stats(self) -> Dict:
        """
        接続統計を取得

        Returns:
            接続統計情報
        """
        return {
            "total_connections": len(self.active_connections),
            "users_by_subscription": {
                sub: len(users) for sub, users in self.user_subscriptions.items() for user in users
            },
            "queue_size": self.notification_queue.qsize(),
            "is_running": self.is_running,
        }


class RealTimeDataFeed:
    """
    リアルタイムデータフィード
    """

    def __init__(self, websocket_manager: WebSocketManager):
        self.ws_manager = websocket_manager
        self.is_running = False
        self.data_sources = {}

    async def start_data_feed(self):
        """
        データフィードを開始
        """
        self.is_running = True

        tasks = [
            self.price_monitor_feed(),
            self.portfolio_update_feed(),
            self.market_news_feed(),
            self.system_status_feed(),
        ]

        await asyncio.gather(*tasks)

    async def price_monitor_feed(self):
        """
        価格監視フィード
        """
        while self.is_running:
            try:
                # サンプル価格データ（実際はAPIから取得）
                price_alerts = [
                    {
                        "ticker": "7203",
                        "name": "トヨタ自動車",
                        "current_price": 2850,
                        "change": +50,
                        "change_pct": +1.79,
                        "alert_type": "price_threshold",
                    },
                    {
                        "ticker": "6758",
                        "name": "ソニーグループ",
                        "current_price": 12100,
                        "change": -100,
                        "change_pct": -0.82,
                        "alert_type": "price_movement",
                    },
                ]

                for alert_data in price_alerts:
                    notification = NotificationMessage(
                        message_id=f"price_{datetime.now().timestamp()}_{alert_data['ticker']}",
                        type="price_alert",
                        priority="medium",
                        title=f"{alert_data['name']} 価格アラート",
                        message=f"{alert_data['current_price']:,}円 ({alert_data['change_pct']:+.2f}%)",
                        data=alert_data,
                        timestamp=datetime.now(),
                    )

                    await self.ws_manager.add_notification_to_queue(notification)

                await asyncio.sleep(30)  # 30秒ごと更新

            except Exception as e:
                logger.error(f"Error in price monitor feed: {e}")
                await asyncio.sleep(60)

    async def portfolio_update_feed(self):
        """
        ポートフォリオ更新フィード
        """
        while self.is_running:
            try:
                # サンプルポートフォリオ更新
                portfolio_update = {
                    "total_value": 1050000,
                    "daily_change": +25000,
                    "daily_change_pct": +2.44,
                    "positions": [
                        {
                            "ticker": "7203",
                            "name": "トヨタ",
                            "current_price": 2850,
                            "quantity": 100,
                            "market_value": 285000,
                            "unrealized_pnl": +15000,
                            "pnl_pct": +5.56,
                        }
                    ],
                }

                notification = NotificationMessage(
                    message_id=f"portfolio_{datetime.now().timestamp()}",
                    type="portfolio_update",
                    priority="medium",
                    title="ポートフォリオ更新",
                    message=f"総資産 ¥{portfolio_update['total_value']:,} ({portfolio_update['daily_change_pct']:+.1f}%)",
                    data=portfolio_update,
                    timestamp=datetime.now(),
                )

                await self.ws_manager.add_notification_to_queue(notification)
                await asyncio.sleep(300)  # 5分ごと更新

            except Exception as e:
                logger.error(f"Error in portfolio update feed: {e}")
                await asyncio.sleep(600)

    async def market_news_feed(self):
        """
        市場ニュースフィード
        """
        while self.is_running:
            try:
                # サンプル市場ニュース
                news_items = [
                    {
                        "headline": "日銀、金融緩和を示唆か",
                        "source": "日経新聞",
                        "time": "09:30",
                        "impact": "high",
                        "summary": "日銀の意見表明から、追加金融緩和の期待が高まる",
                    },
                    {
                        "headline": "半導体セクター、需給改善で反発",
                        "source": "東洋経済",
                        "time": "14:15",
                        "impact": "medium",
                        "summary": "世界的な半導体在庫の改善で関連株が買い戻し",
                    },
                ]

                for news in news_items:
                    notification = NotificationMessage(
                        message_id=f"news_{datetime.now().timestamp()}_{hash(news['headline'])}",
                        type="market_news",
                        priority="medium" if news["impact"] == "high" else "low",
                        title="市場ニュース",
                        message=news["headline"],
                        data=news,
                        timestamp=datetime.now(),
                    )

                    await self.ws_manager.add_notification_to_queue(notification)

                await asyncio.sleep(1800)  # 30分ごと更新

            except Exception as e:
                logger.error(f"Error in market news feed: {e}")
                await asyncio.sleep(3600)

    async def system_status_feed(self):
        """
        システム状態フィード
        """
        while self.is_running:
            try:
                # システム状態チェック
                system_status = {
                    "trading_engine": "normal",
                    "data_connection": "stable",
                    "api_status": "operational",
                    "server_load": "low",
                }

                # 異常検知
                if system_status["data_connection"] != "stable":
                    notification = NotificationMessage(
                        message_id=f"system_{datetime.now().timestamp()}",
                        type="system_alert",
                        priority="high",
                        title="システム警告",
                        message="データ接続に問題があります",
                        data=system_status,
                        timestamp=datetime.now(),
                    )

                    await self.ws_manager.add_notification_to_queue(notification)

                await asyncio.sleep(600)  # 10分ごとチェック

            except Exception as e:
                logger.error(f"Error in system status feed: {e}")
                await asyncio.sleep(1200)

    def stop(self):
        """データフィードを停止"""
        self.is_running = False


class WebSocketServer:
    """
    WebSocketサーバーメイン
    """

    def __init__(self, host: str = "localhost", port: int = 8765):
        self.host = host
        self.port = port
        self.websocket_manager = WebSocketManager()
        self.data_feed = RealTimeDataFeed(self.websocket_manager)
        self.clients = set()

    async def handle_connection(self, websocket, path):
        """
        新規接続の処理

        Args:
            websocket: WebSocket接続
            path: 接続パス
        """
        self.clients.add(websocket)
        logger.info(f"New connection from {websocket.remote_address}")

        try:
            async for message in websocket:
                data = json.loads(message)

                if data["type"] == "register":
                    # ユーザー登録
                    await self.websocket_manager.register_client(websocket, data["user_id"], data.get("subscriptions"))

                elif data["type"] == "subscribe":
                    # 購読更新
                    user_id = data.get("user_id")
                    if user_id and user_id in self.websocket_manager.user_subscriptions:
                        self.websocket_manager.user_subscriptions[user_id].update(data["subscriptions"])

                elif data["type"] == "ping":
                    # Ping応答
                    await websocket.send(json.dumps({"type": "pong"}))

                elif data["type"] == "get_status":
                    # 状態要求
                    status = self.websocket_manager.get_connection_stats()
                    await websocket.send(json.dumps({"type": "status_response", "data": status}))

        except websockets.exceptions.ConnectionClosed:
            logger.info(f"Connection closed: {websocket.remote_address}")
        except Exception as e:
            logger.error(f"Error handling connection: {e}")
        finally:
            self.clients.remove(websocket)

    async def start_server(self):
        """
        サーバーを開始
        """
        self.websocket_manager.is_running = True

        # 接続数表示タスク
        asyncio.create_task(self.log_connection_count())

        # 通知キュー処理タスク
        asyncio.create_task(self.websocket_manager.process_notification_queue())

        # データフィードタスク
        asyncio.create_task(self.data_feed.start_data_feed())

        logger.info(f"WebSocket server starting on {self.host}:{self.port}")

        # WebSocketサーバー起動
        server = await websockets.serve(self.handle_connection, self.host, self.port)

        logger.info(f"WebSocket server started on {self.host}:{self.port}")

        try:
            await server
        except KeyboardInterrupt:
            logger.info("Shutting down server...")
        finally:
            self.websocket_manager.is_running = False
            self.data_feed.stop()

    async def log_connection_count(self):
        """
        接続数を定期的にロギング
        """
        while self.websocket_manager.is_running:
            stats = self.websocket_manager.get_connection_stats()
            logger.info(f"Connections: {stats['total_connections']}, Queue: {stats['queue_size']}")
            await asyncio.sleep(60)

    async def send_custom_notification(self, notification: NotificationMessage, target_users: List[str] = None):
        """
        カスタム通知を送信

        Args:
            notification: 通知メッセージ
            target_users: 送信対象ユーザーリスト
        """
        await self.websocket_manager.broadcast_notification(notification, target_users)


# グローバルインスタンス
websocket_server = WebSocketServer()


async def main():
    """メイン関数"""
    await websocket_server.start_server()


if __name__ == "__main__":
    import sys
    import os

    # サーバー設定を環境変数から取得
    host = os.getenv("WS_HOST", "localhost")
    port = int(os.getenv("WS_PORT", "8765"))

    websocket_server.host = host
    websocket_server.port = port

    print(f"Starting WebSocket server on {host}:{port}")

    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Server stopped by user")
    except Exception as e:
        print(f"Server error: {e}")
