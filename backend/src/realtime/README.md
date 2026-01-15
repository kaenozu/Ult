# リアルタイムデータストリーミング

このモジュールは、AGStockプロジェクトのリアルタイムデータストリーミング機能を提供します。

## 機能

- WebSocketを使用した双方向通信
- リアルタイム市場データの配信
- クライアントサブスクリプション管理
- 自動再接続機能

## インストール

```bash
pip install websockets
```

## 使用方法

### サーバーの起動

```python
from src.realtime import streamer
import asyncio

# サーバーを別スレッドで起動
def start_server():
    asyncio.run(streamer.start_server())

import threading
server_thread = threading.Thread(target=start_server)
server_thread.daemon = True
server_thread.start()
```

### クライアントの使用

```python
from src.realtime import RealtimeDataClient
import asyncio

async def main():
    client = RealtimeDataClient()
    
    # データハンドラーを登録
    async def handle_market_data(data):
        print(f"市場データ: {data}")
    
    client.register_data_handler("market_data", handle_market_data)
    
    # 接続
    await client.connect()
    
    # 10秒間データを受信
    await asyncio.sleep(10)
    
    # 切断
    await client.disconnect()

asyncio.run(main())
```

## API

### RealtimeDataStreamer

- `start_server(host, port)`: WebSocketサーバーを開始
- `broadcast_data(data)`: すべてのクライアントにデータをブロードキャスト
- `stop_server()`: サーバーを停止

### RealtimeDataClient

- `connect()`: サーバーに接続
- `disconnect()`: サーバーから切断
- `register_data_handler(type, handler)`: データハンドラーを登録
- `send_message(message)`: メッセージを送信

## データ形式

### 初期データ

```json
{
  "type": "initial_data",
  "timestamp": "2023-01-01T00:00:00",
  "message": "リアルタイムデータストリーミングに接続されました"
}
```

### 市場データ

```json
{
  "type": "market_data",
  "timestamp": "2023-01-01T00:00:00",
  "data": {
    "AAPL": {
      "price": 150.0,
      "change": 0.5,
      "volume": 1000000
    }
  }
}
```

### サブスクリプション確認

```json
{
  "type": "subscription_confirmed",
  "subscription_type": "market_data",
  "timestamp": "2023-01-01T00:00:00"
}
```
