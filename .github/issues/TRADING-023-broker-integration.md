---
title: ブローカーAPI統合フレームワークの実装
labels: enhancement, integration, priority:high
---

## 説明

### 問題
現在のシステムには、複数のブローカーAPI（SBI証券、楽天証券、米国証券会社など）に統合するための標準化されたフレームワークがありません。これにより、複数の取引所で取引する際の開発コストが増大し、一貫性のない取引体験になります。

### 影響
- 新しいブローカーの追加が困難
- 各ブローカーごとに独自の統合コードが必要
- エラーハンドリングが一貫していない
- データフォーマットの違いによる問題

### 推奨される解決策

#### 1. ブローカー統合抽象化レイヤー
```python
# backend/src/brokers/base_broker.py
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
from datetime import datetime

class OrderType(Enum):
    MARKET = "market"
    LIMIT = "limit"
    STOP = "stop"
    STOP_LIMIT = "stop_limit"

class OrderSide(Enum):
    BUY = "buy"
    SELL = "sell"

@dataclass
class Order:
    symbol: str
    side: OrderSide
    order_type: OrderType
    quantity: float
    price: Optional[float] = None
    stop_price: Optional[float] = None
    time_in_force: str = "day"
    order_id: Optional[str] = None

@dataclass
class OrderStatus:
    order_id: str
    status: str  # 'pending', 'filled', 'partially_filled', 'cancelled', 'rejected'
    filled_quantity: float
    remaining_quantity: float
    average_price: Optional[float] = None
    commission: Optional[float] = None
    last_updated: Optional[datetime] = None

@dataclass
class Position:
    symbol: str
    quantity: float
    average_entry_price: float
    current_price: float
    market_value: float
    unrealized_pnl: float
    realized_pnl: float

class BaseBroker(ABC):
    """ブローカー統合の基底クラス"""
    
    def __init__(self, api_key: str, api_secret: str, **kwargs):
        self.api_key = api_key
        self.api_secret = api_secret
        self.config = kwargs
        self.is_connected = False
        self.last_error = None
    
    @abstractmethod
    async def connect(self) -> bool:
        """ブローカーAPIに接続"""
        pass
    
    @abstractmethod
    async def disconnect(self):
        """接続を切断"""
        pass
    
    @abstractmethod
    async def get_account_info(self) -> Dict:
        """アカウント情報を取得"""
        pass
    
    @abstractmethod
    async def place_order(self, order: Order) -> OrderStatus:
        """注文を実行"""
        pass
    
    @abstractmethod
    async def cancel_order(self, order_id: str) -> bool:
        """注文をキャンセル"""
        pass
    
    @abstractmethod
    async def get_order_status(self, order_id: str) -> OrderStatus:
        """注文ステータスを取得"""
        pass
    
    @abstractmethod
    async def get_positions(self) -> List[Position]:
        """ポジション一覧を取得"""
        pass
    
    @abstractmethod
    async def get_market_data(self, symbol: str) -> Dict:
        """市場データを取得"""
        pass
    
    @abstractmethod
    async def subscribe_market_data(self, symbols: List[str], callback: callable):
        """リアルタイム市場データを購読"""
        pass
    
    def handle_error(self, error: Exception) -> Dict:
        """エラーを標準化された形式で処理"""
        self.last_error = error
        
        return {
            'error_type': type(error).__name__,
            'message': str(error),
            'timestamp': datetime.now().isoformat(),
            'recoverable': self._is_recoverable_error(error)
        }
    
    def _is_recoverable_error(self, error: Exception) -> bool:
        """エラーが回復可能かどうかを判断"""
        recoverable_errors = [
            'ConnectionError',
            'TimeoutError',
            'RateLimitError'
        ]
        return type(error).__name__ in recoverable_errors
```

#### 2. 具体的なブローカー実装例
```python
# backend/src/brokers/sbi_broker.py
import aiohttp
from .base_broker import BaseBroker, Order, OrderStatus, Position

class SBIBroker(BaseBroker):
    """SBI証券API統合"""
    
    def __init__(self, api_key: str, api_secret: str, **kwargs):
        super().__init__(api_key, api_secret, **kwargs)
        self.base_url = "https://api.sbisec.co.jp/v1"
        self.session = None
    
    async def connect(self) -> bool:
        """SBI証券APIに接続"""
        try:
            self.session = aiohttp.ClientSession()
            
            # 認証
            headers = {
                'X-API-KEY': self.api_key,
                'X-API-SECRET': self.api_secret
            }
            
            async with self.session.get(
                f"{self.base_url}/account",
                headers=headers
            ) as response:
                if response.status == 200:
                    self.is_connected = True
                    return True
                else:
                    error_data = await response.json()
                    raise ConnectionError(f"Failed to connect: {error_data}")
                    
        except Exception as e:
            self.handle_error(e)
            return False
    
    async def place_order(self, order: Order) -> OrderStatus:
        """注文を実行"""
        try:
            # SBI証券の注文フォーマットに変換
            sbi_order = self._convert_to_sbi_format(order)
            
            headers = {
                'X-API-KEY': self.api_key,
                'Content-Type': 'application/json'
            }
            
            async with self.session.post(
                f"{self.base_url}/orders",
                headers=headers,
                json=sbi_order
            ) as response:
                data = await response.json()
                
                if response.status == 200:
                    return self._convert_order_status(data)
                else:
                    raise Exception(f"Order failed: {data}")
                    
        except Exception as e:
            self.handle_error(e)
            raise
    
    def _convert_to_sbi_format(self, order: Order) -> Dict:
        """標準注文をSBI証券フォーマットに変換"""
        order_type_map = {
            'market': '0',  # 成行
            'limit': '1',   # 指値
            'stop': '2',    # 停止
        }
        
        return {
            'sSymbolCode': order.symbol,
            'sOrderType': order_type_map.get(order.order_type.value, '0'),
            'sOrderQuantity': str(int(order.quantity)),
            'sOrderPrice': str(order.price) if order.price else '0',
            'sOrderSide': '1' if order.side == OrderSide.BUY else '2',
        }
    
    def _convert_order_status(self, sbi_response: Dict) -> OrderStatus:
        """SBI証券のレスポンスを標準形式に変換"""
        status_map = {
            '1': 'pending',
            '2': 'filled',
            '3': 'partially_filled',
            '4': 'cancelled',
            '5': 'rejected'
        }
        
        return OrderStatus(
            order_id=sbi_response.get('sOrderId'),
            status=status_map.get(sbi_response.get('sOrderStatus'), 'unknown'),
            filled_quantity=float(sbi_response.get('sFilledQuantity', 0)),
            remaining_quantity=float(sbi_response.get('sRemainingQuantity', 0)),
            average_price=float(sbi_response.get('sAveragePrice')) if sbi_response.get('sAveragePrice') else None,
            commission=float(sbi_response.get('sCommission', 0))
        )
```

#### 3. ブローカーマネージャー
```python
# backend/src/brokers/broker_manager.py
from typing import Dict, Type
from .base_broker import BaseBroker

class BrokerManager:
    """複数ブローカーの管理"""
    
    def __init__(self):
        self.brokers: Dict[str, BaseBroker] = {}
        self.broker_classes: Dict[str, Type[BaseBroker]] = {}
    
    def register_broker_class(self, name: str, broker_class: Type[BaseBroker]):
        """ブローカークラスを登録"""
        self.broker_classes[name] = broker_class
    
    async def create_broker(self, name: str, credentials: Dict) -> BaseBroker:
        """ブローカーインスタンスを作成"""
        if name not in self.broker_classes:
            raise ValueError(f"Unknown broker: {name}")
        
        broker_class = self.broker_classes[name]
        broker = broker_class(
            api_key=credentials['api_key'],
            api_secret=credentials['api_secret'],
            **credentials.get('config', {})
        )
        
        # 接続
        connected = await broker.connect()
        if not connected:
            raise ConnectionError(f"Failed to connect to {name}")
        
        self.brokers[name] = broker
        return broker
    
    async def route_order(self, order: Order, strategy: str = 'best_price') -> OrderStatus:
        """最適なブローカーに注文をルーティング"""
        if strategy == 'best_price':
            broker = await self._select_best_price_broker(order)
        elif strategy == 'lowest_fee':
            broker = await self._select_lowest_fee_broker(order)
        else:
            broker = list(self.brokers.values())[0]
        
        return await broker.place_order(order)
    
    async def get_consolidated_positions(self) -> List[Position]:
        """全ブローカーのポジションを統合"""
        all_positions = []
        
        for broker_name, broker in self.brokers.items():
            positions = await broker.get_positions()
            for position in positions:
                position.broker = broker_name
                all_positions.append(position)
        
        return all_positions
```

### 実装タスク
- [ ] ブローカー基底クラスの実装
- [ ] SBI証券API統合の実装
- [ ] 楽天証券API統合の実装
- [ ] 米国証券会社（Alpaca, Interactive Brokers）統合の実装
- [ ] 暗号資産取引所（Binance, Coinbase）統合の実装
- [ ] ブローカーマネージャーの実装
- [ ] 統一エラーハンドリングの実装
- [ ] 注文ルーティングの実装
- [ ] ポジション統合の実装
- [ ] ユニットテストの作成
- [ ] ドキュメントの作成

### 関連ファイル
- `backend/src/brokers/base_broker.py` (新規ファイル)
- `backend/src/brokers/sbi_broker.py` (新規ファイル)
- `backend/src/brokers/rakuten_broker.py` (新規ファイル)
- `backend/src/brokers/alpaca_broker.py` (新規ファイル)
- `backend/src/brokers/broker_manager.py` (新規ファイル)
- `backend/tests/test_broker_integration.py` (新規ファイル)

### 優先度
高 - 実際の取引には必須

### 複雑度
高

### 見積もり時間
5-6週間
