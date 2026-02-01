---
title: ストリーミングデータ処理とイベント駆動アーキテクチャの実装
labels: enhancement, real-time-data, priority:high
---

## 説明

### 問題
現在のシステムには、リアルタイムのストリーミングデータを効率的に処理するインフラストラクチャがありません。これにより、市場データの遅延、機会損失、およびリアルタイムでの意思決定が困難になっています。

### 影響
- リアルタイムデータの遅延や損失
- スケーラビリティの制限
- システムの応答性の低下
- 高頻度取引戦略の実装が困難

### 推奨される解決策

#### 1. イベント駆動アーキテクチャ
```python
# backend/src/data/streaming/event_engine.py
import asyncio
from typing import Callable, Dict, List, Any
from dataclasses import dataclass
from enum import Enum
import time

class EventType(Enum):
    PRICE_UPDATE = "price_update"
    TRADE = "trade"
    ORDER_BOOK = "order_book"
    ORDER_STATUS = "order_status"
    POSITION_UPDATE = "position_update"
    SYSTEM = "system"

@dataclass
class MarketEvent:
    event_type: EventType
    symbol: str
    timestamp: float
    data: Dict[str, Any]
    priority: int = 0

class EventEngine:
    def __init__(self):
        self.event_queue = asyncio.PriorityQueue()
        self.handlers: Dict[EventType, List[Callable]] = {et: [] for et in EventType}
        self.running = False
        self.processing_stats = {
            'events_processed': 0,
            'avg_latency_ms': 0,
            'max_latency_ms': 0
        }
    
    def register_handler(self, event_type: EventType, handler: Callable):
        """イベントハンドラーを登録"""
        self.handlers[event_type].append(handler)
    
    def emit_event(self, event: MarketEvent):
        """イベントを発行"""
        # 優先度付きキューに追加（優先度が低いほど先に処理）
        self.event_queue.put_nowait((event.priority, time.time(), event))
    
    async def process_events(self):
        """イベントを処理"""
        self.running = True
        
        while self.running:
            try:
                # タイムアウト付きでイベントを取得
                priority, enqueue_time, event = await asyncio.wait_for(
                    self.event_queue.get(), timeout=1.0
                )
                
                # レイテンシーを計算
                latency_ms = (time.time() - enqueue_time) * 1000
                self._update_latency_stats(latency_ms)
                
                # ハンドラーを実行
                handlers = self.handlers.get(event.event_type, [])
                
                if handlers:
                    # 並列実行
                    await asyncio.gather(
                        *[handler(event) for handler in handlers],
                        return_exceptions=True
                    )
                
                self.processing_stats['events_processed'] += 1
                
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                print(f"Error processing event: {e}")
    
    def _update_latency_stats(self, latency_ms: float):
        """レイテンシー統計を更新"""
        n = self.processing_stats['events_processed']
        old_avg = self.processing_stats['avg_latency_ms']
        
        # 移動平均
        self.processing_stats['avg_latency_ms'] = (old_avg * n + latency_ms) / (n + 1)
        self.processing_stats['max_latency_ms'] = max(
            self.processing_stats['max_latency_ms'], latency_ms
        )
```

#### 2. データストリームプロセッサー
```python
# backend/src/data/streaming/stream_processor.py
import json
import websockets
from typing import AsyncIterator

class DataStreamProcessor:
    def __init__(self, event_engine: EventEngine):
        self.event_engine = event_engine
        self.connections = {}
        self.subscriptions = {}
    
    async def connect_exchange(self, exchange_id: str, ws_url: str):
        """取引所のWebSocketに接続"""
        try:
            websocket = await websockets.connect(ws_url)
            self.connections[exchange_id] = websocket
            
            # 接続を維持しながらメッセージを処理
            asyncio.create_task(self._handle_messages(exchange_id, websocket))
            
        except Exception as e:
            print(f"Failed to connect to {exchange_id}: {e}")
            # 再接続ロジック
            await self._schedule_reconnect(exchange_id, ws_url)
    
    async def _handle_messages(self, exchange_id: str, websocket):
        """WebSocketメッセージを処理"""
        try:
            async for message in websocket:
                try:
                    data = json.loads(message)
                    event = self._parse_message(exchange_id, data)
                    
                    if event:
                        self.event_engine.emit_event(event)
                        
                except json.JSONDecodeError:
                    print(f"Invalid JSON from {exchange_id}: {message}")
                except Exception as e:
                    print(f"Error parsing message from {exchange_id}: {e}")
                    
        except websockets.exceptions.ConnectionClosed:
            print(f"Connection closed for {exchange_id}")
            # 再接続
            await self._schedule_reconnect(exchange_id, websocket.url)
    
    def _parse_message(self, exchange_id: str, data: dict) -> MarketEvent:
        """取引所メッセージをMarketEventに変換"""
        # 取引所ごとのフォーマットに対応
        if exchange_id == 'binance':
            return self._parse_binance_message(data)
        elif exchange_id == 'coinbase':
            return self._parse_coinbase_message(data)
        # ... 他の取引所
        
        return None
    
    def _parse_binance_message(self, data: dict) -> MarketEvent:
        """Binanceメッセージをパース"""
        if data.get('e') == 'trade':
            return MarketEvent(
                event_type=EventType.TRADE,
                symbol=data['s'],
                timestamp=data['T'] / 1000,  # ms to s
                data={
                    'price': float(data['p']),
                    'quantity': float(data['q']),
                    'side': 'buy' if not data['m'] else 'sell'
                },
                priority=1
            )
        elif data.get('e') == 'depthUpdate':
            return MarketEvent(
                event_type=EventType.ORDER_BOOK,
                symbol=data['s'],
                timestamp=data['E'] / 1000,
                data={
                    'bids': [[float(p), float(q)] for p, q in data['b']],
                    'asks': [[float(p), float(q)] for p, q in data['a']]
                },
                priority=1
            )
        
        return None
```

#### 3. メッセージキュー統合（Kafka）
```python
# backend/src/data/streaming/kafka_integration.py
from kafka import KafkaProducer, KafkaConsumer
import json

class KafkaEventBus:
    def __init__(self, bootstrap_servers: List[str]):
        self.producer = KafkaProducer(
            bootstrap_servers=bootstrap_servers,
            value_serializer=lambda v: json.dumps(v).encode('utf-8'),
            key_serializer=lambda k: k.encode('utf-8') if k else None,
            acks='all',
            retries=3,
            compression_type='gzip'
        )
        self.consumers = {}
    
    def publish_event(self, topic: str, event: MarketEvent, key: str = None):
        """イベントをKafkaに発行"""
        message = {
            'event_type': event.event_type.value,
            'symbol': event.symbol,
            'timestamp': event.timestamp,
            'data': event.data,
            'priority': event.priority
        }
        
        future = self.producer.send(topic, key=key, value=message)
        return future
    
    def subscribe_to_topic(self, topic: str, handler: Callable):
        """Kafkaトピックを購読"""
        consumer = KafkaConsumer(
            topic,
            bootstrap_servers=self.producer.config['bootstrap_servers'],
            value_deserializer=lambda m: json.loads(m.decode('utf-8')),
            group_id='trading_platform',
            auto_offset_reset='latest',
            enable_auto_commit=True
        )
        
        self.consumers[topic] = consumer
        
        # 別スレッドで消費
        import threading
        def consume():
            for message in consumer:
                event_data = message.value
                event = MarketEvent(
                    event_type=EventType(event_data['event_type']),
                    symbol=event_data['symbol'],
                    timestamp=event_data['timestamp'],
                    data=event_data['data'],
                    priority=event_data.get('priority', 0)
                )
                handler(event)
        
        thread = threading.Thread(target=consume, daemon=True)
        thread.start()
```

### 実装タスク
- [ ] イベント駆動アーキテクチャの実装
- [ ] イベントエンジンの実装
- [ ] WebSocket接続マネージャーの実装
- [ ] データストリームプロセッサーの実装
- [ ] Kafka統合の実装
- [ ] バックプレッシャー制御の実装
- [ ] 障害復旧メカニズムの実装
- [ ] パフォーマンスモニタリングの実装
- [ ] ユニットテストの作成
- [ ] ドキュメントの作成

### 関連ファイル
- `backend/src/data/streaming/event_engine.py` (新規ファイル)
- `backend/src/data/streaming/stream_processor.py` (新規ファイル)
- `backend/src/data/streaming/kafka_integration.py` (新規ファイル)
- `backend/tests/test_streaming.py` (新規ファイル)

### 優先度
高 - リアルタイム取引には不可欠

### 複雑度
高

### 見積もり時間
4-5週間
