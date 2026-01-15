"""
リアルタイムデータストリーミング WebSocketクライアント
"""

import asyncio
import json
import websockets
from datetime import datetime
from typing import Callable, Dict, Any
import logging

logger = logging.getLogger(__name__)


class RealtimeDataClient:
    """リアルタイムデータクライアント"""

    def __init__(self, server_uri: str = "ws://localhost:8765"):
        self.server_uri = server_uri
        self.websocket = None
        self.is_connected = False
        self.data_handlers: Dict[str, Callable] = {}
        self.reconnect_attempts = 0
        self.max_reconnect_attempts = 5

    async def connect(self):
        """WebSocketサーバーに接続"""
        try:
            self.websocket = await websockets.connect(self.server_uri)
            self.is_connected = True
            self.reconnect_attempts = 0
            logger.info(f"WebSocketサーバーに接続しました: {self.server_uri}")

            # データ受信タスクを開始
            asyncio.create_task(self.receive_data())

            # サブスクリプションを送信
            await self.subscribe_to_data()

        except Exception as e:
            logger.error(f"WebSocket接続エラー: {e}")
            await self.handle_reconnection()

    async def disconnect(self):
        """WebSocketサーバーから切断"""
        if self.websocket:
            await self.websocket.close()
            self.is_connected = False
            logger.info("WebSocketサーバーから切断しました")

    async def receive_data(self):
        """データを受信"""
        try:
            async for message in self.websocket:
                await self.process_message(message)
        except websockets.exceptions.ConnectionClosed:
            logger.info("サーバー接続が閉じられました")
            await self.handle_reconnection()
        except Exception as e:
            logger.error(f"データ受信エラー: {e}")
            await self.handle_reconnection()

    async def process_message(self, message: str):
        """メッセージを処理"""
        try:
            data = json.loads(message)
            message_type = data.get("type")

            if message_type in self.data_handlers:
                # 登録されたハンドラーを呼び出す
                await self.data_handlers[message_type](data)
            else:
                # デフォルトの処理
                logger.info(f"受信データ: {data}")

        except json.JSONDecodeError:
            logger.warning("無効なJSONメッセージを受信しました")
        except Exception as e:
            logger.error(f"メッセージ処理エラー: {e}")

    async def subscribe_to_data(self):
        """データにサブスクライブ"""
        if not self.is_connected:
            return

        subscription_message = {"action": "subscribe", "type": "market_data"}

        try:
            await self.websocket.send(json.dumps(subscription_message, ensure_ascii=False))
            logger.info("データサブスクリプションを送信しました")
        except Exception as e:
            logger.error(f"サブスクリプション送信エラー: {e}")

    def register_data_handler(self, message_type: str, handler: Callable):
        """データハンドラーを登録"""
        self.data_handlers[message_type] = handler
        logger.info(f"データハンドラーを登録しました: {message_type}")

    async def handle_reconnection(self):
        """再接続を処理"""
        if self.reconnect_attempts >= self.max_reconnect_attempts:
            logger.error("最大再接続試行回数に達しました")
            return

        self.is_connected = False
        self.reconnect_attempts += 1

        logger.info(f"{self.reconnect_attempts}回目の再接続を試みます...")
        await asyncio.sleep(2**self.reconnect_attempts)  # 指数バックオフ

        await self.connect()

    async def send_message(self, message: Dict[str, Any]):
        """メッセージを送信"""
        if not self.is_connected:
            logger.warning("サーバーに接続されていません")
            return

        try:
            await self.websocket.send(json.dumps(message, ensure_ascii=False))
        except Exception as e:
            logger.error(f"メッセージ送信エラー: {e}")


# 使用例
async def example_usage():
    """使用例"""
    logging.basicConfig(level=logging.INFO)

    client = RealtimeDataClient()

    # データハンドラーを登録
    async def handle_market_data(data):
        print(f"市場データ受信: {data['data']}")

    client.register_data_handler("market_data", handle_market_data)

    # サーバーに接続
    await client.connect()

    # 10秒間データを受信
    await asyncio.sleep(10)

    # 切断
    await client.disconnect()


if __name__ == "__main__":
    asyncio.run(example_usage())
