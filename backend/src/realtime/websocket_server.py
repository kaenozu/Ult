"""
リアルタイムデータストリーミング WebSocketサーバー
"""

import asyncio
import json
import logging
import websockets
from datetime import datetime
from typing import Dict, Set, Any
import threading
import time

logger = logging.getLogger(__name__)


class RealtimeDataStreamer:
    """リアルタイムデータストリーマー"""

    def __init__(self):
        self.clients: Set[websockets.WebSocketServerProtocol] = set()
        self.data_generators = []
        self.is_running = False

    async def register_client(self, websocket: websockets.WebSocketServerProtocol):
        """クライアントを登録"""
        self.clients.add(websocket)
        logger.info(f"クライアントが接続されました。総接続数: {len(self.clients)}")

        try:
            # 初期データを送信
            await self.send_initial_data(websocket)

            # クライアントからのメッセージを待機
            async for message in websocket:
                await self.handle_client_message(websocket, message)
        except websockets.exceptions.ConnectionClosed:
            logger.info("クライアント接続が閉じられました")
        finally:
            self.clients.remove(websocket)
            logger.info(f"クライアントが切断されました。残り接続数: {len(self.clients)}")

    async def send_initial_data(self, websocket: websockets.WebSocketServerProtocol):
        """初期データを送信"""
        initial_data = {
            "type": "initial_data",
            "timestamp": datetime.now().isoformat(),
            "message": "リアルタイムデータストリーミングに接続されました",
        }
        await websocket.send(json.dumps(initial_data, ensure_ascii=False))

    async def handle_client_message(self, websocket: websockets.WebSocketServerProtocol, message: str):
        """クライアントからのメッセージを処理"""
        try:
            data = json.loads(message)
            if data.get("action") == "subscribe":
                # サブスクリプション処理
                await self.handle_subscription(websocket, data)
        except json.JSONDecodeError:
            logger.warning("無効なJSONメッセージを受信しました")

    async def handle_subscription(self, websocket: websockets.WebSocketServerProtocol, data: Dict[str, Any]):
        """サブスクリプションを処理"""
        subscription_type = data.get("type")
        if subscription_type:
            response = {
                "type": "subscription_confirmed",
                "subscription_type": subscription_type,
                "timestamp": datetime.now().isoformat(),
            }
            await websocket.send(json.dumps(response, ensure_ascii=False))

    async def broadcast_data(self, data: Dict[str, Any]):
        """すべてのクライアントにデータをブロードキャスト"""
        if not self.clients:
            return

        message = json.dumps(data, ensure_ascii=False)
        disconnected_clients = set()

        for client in self.clients:
            try:
                await client.send(message)
            except websockets.exceptions.ConnectionClosed:
                disconnected_clients.add(client)

        # 切断されたクライアントを削除
        for client in disconnected_clients:
            self.clients.discard(client)

    async def start_server(self, host: str = "localhost", port: int = 8765):
        """WebSocketサーバーを開始"""
        self.is_running = True
        logger.info(f"WebSocketサーバーを {host}:{port} で開始します")

        async with websockets.serve(self.register_client, host, port):
            await self.run_data_generation()

    async def run_data_generation(self):
        """データ生成ループを実行"""
        while self.is_running:
            # ダミーデータを生成してブロードキャスト
            await self.generate_and_broadcast_dummy_data()
            await asyncio.sleep(1)  # 1秒ごとにデータを送信

    async def generate_and_broadcast_dummy_data(self):
        """ダミーデータを生成してブロードキャスト"""
        dummy_data = {
            "type": "market_data",
            "timestamp": datetime.now().isoformat(),
            "data": {
                "AAPL": {
                    "price": 150.0 + (time.time() % 10),
                    "change": 0.5 + (time.time() % 2),
                    "volume": 1000000 + int(time.time() % 100000),
                },
                "MSFT": {
                    "price": 300.0 + (time.time() % 15),
                    "change": 0.3 + (time.time() % 1.5),
                    "volume": 800000 + int(time.time() % 80000),
                },
            },
        }
        await self.broadcast_data(dummy_data)

    def stop_server(self):
        """サーバーを停止"""
        self.is_running = False
        logger.info("WebSocketサーバーを停止しました")


# グローバルインスタンス
streamer = RealtimeDataStreamer()


async def main():
    """メイン関数"""
    logging.basicConfig(level=logging.INFO)

    try:
        await streamer.start_server()
    except KeyboardInterrupt:
        logger.info("サーバーを停止します...")
        streamer.stop_server()


if __name__ == "__main__":
    asyncio.run(main())
