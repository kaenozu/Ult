---
title: ペーパートレーディングとサンドボックス環境の実装
labels: enhancement, simulation, priority:high
---

## 説明

### 問題
現在のシステムには、実際の資金をリスクせずに戦略をテストできるペーパートレーディング（仮想取引）環境がありません。これにより、新しい戦略の検証や練習が困難で、実際の損失リスクが高まります。

### 影響
- 新戦略の実際の市場での検証が困難
- 初心者の練習環境がない
- バックテストと実際の取引の乖離を確認できない
- システム変更の影響を事前に評価できない

### 推奨される解決策

#### 1. ペーパートレーディングエンジン
```python
# backend/src/simulation/paper_trading.py
from typing import Dict, List, Optional
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import uuid

class OrderStatus(Enum):
    PENDING = "pending"
    FILLED = "filled"
    PARTIALLY_FILLED = "partially_filled"
    CANCELLED = "cancelled"
    REJECTED = "rejected"

@dataclass
class PaperOrder:
    order_id: str
    symbol: str
    side: str  # 'buy' or 'sell'
    order_type: str  # 'market', 'limit', 'stop'
    quantity: float
    filled_quantity: float = 0
    price: Optional[float] = None
    status: OrderStatus = OrderStatus.PENDING
    created_at: datetime = field(default_factory=datetime.now)
    filled_at: Optional[datetime] = None
    commission: float = 0
    slippage: float = 0

@dataclass
class PaperPosition:
    symbol: str
    quantity: float
    average_entry_price: float
    current_price: float
    unrealized_pnl: float = 0
    realized_pnl: float = 0

class PaperTradingEngine:
    def __init__(self, initial_balance: float = 1000000):
        self.initial_balance = initial_balance
        self.cash_balance = initial_balance
        self.positions: Dict[str, PaperPosition] = {}
        self.orders: Dict[str, PaperOrder] = {}
        self.order_history: List[PaperOrder] = []
        self.trade_history: List[Dict] = []
        self.market_data = {}
        
        # シミュレーションパラメータ
        self.commission_rate = 0.001  # 0.1%
        self.slippage_model = 'random'  # 'none', 'fixed', 'random', 'market_impact'
        self.slippage_bps = 5  # 5 basis points
    
    def place_order(self, symbol: str, side: str, order_type: str,
                   quantity: float, price: Optional[float] = None) -> PaperOrder:
        """注文を作成"""
        order_id = str(uuid.uuid4())
        
        order = PaperOrder(
            order_id=order_id,
            symbol=symbol,
            side=side,
            order_type=order_type,
            quantity=quantity,
            price=price
        )
        
        self.orders[order_id] = order
        
        # 即座に実行（シンプルなシミュレーション）
        if order_type == 'market':
            self._execute_market_order(order)
        elif order_type == 'limit':
            self._place_limit_order(order)
        
        return order
    
    def _execute_market_order(self, order: PaperOrder):
        """市場注文を実行"""
        current_price = self._get_market_price(order.symbol)
        
        if current_price is None:
            order.status = OrderStatus.REJECTED
            return
        
        # スリッページを適用
        execution_price = self._apply_slippage(current_price, order.side)
        
        # 手数料を計算
        notional = order.quantity * execution_price
        commission = notional * self.commission_rate
        
        # 残高チェック
        if order.side == 'buy':
            total_cost = notional + commission
            if total_cost > self.cash_balance:
                order.status = OrderStatus.REJECTED
                return
            self.cash_balance -= total_cost
        else:
            # 売り注文の場合、ポジションをチェック
            position = self.positions.get(order.symbol)
            if not position or position.quantity < order.quantity:
                order.status = OrderStatus.REJECTED
                return
            self.cash_balance += notional - commission
        
        # ポジションを更新
        self._update_position(order.symbol, order.side, order.quantity, execution_price)
        
        # 注文を更新
        order.filled_quantity = order.quantity
        order.price = execution_price
        order.commission = commission
        order.status = OrderStatus.FILLED
        order.filled_at = datetime.now()
        
        # 履歴に追加
        self.trade_history.append({
            'timestamp': datetime.now(),
            'symbol': order.symbol,
            'side': order.side,
            'quantity': order.quantity,
            'price': execution_price,
            'commission': commission
        })
    
    def _apply_slippage(self, price: float, side: str) -> float:
        """スリッページを適用"""
        if self.slippage_model == 'none':
            return price
        elif self.slippage_model == 'fixed':
            slippage = price * (self.slippage_bps / 10000)
        elif self.slippage_model == 'random':
            import random
            slippage = price * (random.uniform(-self.slippage_bps, self.slippage_bps) / 10000)
        else:  # market_impact
            # より複雑なマーケットインパクトモデル
            slippage = price * (self.slippage_bps / 10000)
        
        if side == 'buy':
            return price + slippage
        else:
            return price - slippage
    
    def _update_position(self, symbol: str, side: str, quantity: float, price: float):
        """ポジションを更新"""
        if symbol not in self.positions:
            self.positions[symbol] = PaperPosition(
                symbol=symbol,
                quantity=0,
                average_entry_price=0,
                current_price=price
            )
        
        position = self.positions[symbol]
        
        if side == 'buy':
            # 平均取得単価を更新
            total_cost = (position.quantity * position.average_entry_price) + (quantity * price)
            position.quantity += quantity
            position.average_entry_price = total_cost / position.quantity if position.quantity > 0 else 0
        else:
            # 実現損益を計算
            realized_pnl = (price - position.average_entry_price) * quantity
            position.realized_pnl += realized_pnl
            position.quantity -= quantity
            
            if position.quantity == 0:
                position.average_entry_price = 0
    
    def get_portfolio_value(self) -> Dict:
        """ポートフォリオ価値を計算"""
        positions_value = 0
        unrealized_pnl = 0
        
        for symbol, position in self.positions.items():
            current_price = self._get_market_price(symbol)
            if current_price:
                position_value = position.quantity * current_price
                positions_value += position_value
                position.unrealized_pnl = (current_price - position.average_entry_price) * position.quantity
                unrealized_pnl += position.unrealized_pnl
        
        total_value = self.cash_balance + positions_value
        
        return {
            'cash_balance': self.cash_balance,
            'positions_value': positions_value,
            'total_value': total_value,
            'unrealized_pnl': unrealized_pnl,
            'realized_pnl': sum(p.realized_pnl for p in self.positions.values()),
            'total_return': (total_value - self.initial_balance) / self.initial_balance * 100
        }
    
    def _get_market_price(self, symbol: str) -> Optional[float]:
        """市場価格を取得"""
        return self.market_data.get(symbol, {}).get('last_price')
    
    def update_market_data(self, symbol: str, price: float):
        """市場データを更新"""
        self.market_data[symbol] = {'last_price': price}
```

#### 2. サンドボックス環境
```python
class SandboxEnvironment:
    """隔離されたテスト環境"""
    
    def __init__(self):
        self.paper_engines: Dict[str, PaperTradingEngine] = {}
        self.strategies: Dict[str, any] = {}
        self.market_simulator = MarketDataSimulator()
    
    def create_paper_account(self, user_id: str, initial_balance: float = 1000000) -> str:
        """ペーパーアカウントを作成"""
        account_id = f"paper_{user_id}_{uuid.uuid4().hex[:8]}"
        
        self.paper_engines[account_id] = PaperTradingEngine(initial_balance)
        
        return account_id
    
    def run_strategy_backtest(self, strategy: any, start_date: datetime,
                             end_date: datetime, initial_balance: float = 1000000) -> Dict:
        """戦略をバックテスト"""
        engine = PaperTradingEngine(initial_balance)
        
        # 履歴データを取得
        historical_data = self.market_simulator.get_historical_data(
            strategy.symbols, start_date, end_date
        )
        
        # 各タイムステップで戦略を実行
        for timestamp, data in historical_data.iterrows():
            # 市場データを更新
            for symbol in strategy.symbols:
                if symbol in data:
                    engine.update_market_data(symbol, data[symbol]['close'])
            
            # 戦略シグナルを生成
            signals = strategy.generate_signals(data)
            
            # シグナルに基づいて注文
            for signal in signals:
                engine.place_order(
                    symbol=signal['symbol'],
                    side=signal['side'],
                    order_type=signal.get('order_type', 'market'),
                    quantity=signal['quantity'],
                    price=signal.get('price')
                )
        
        # 結果を分析
        portfolio = engine.get_portfolio_value()
        trades = engine.trade_history
        
        return {
            'portfolio': portfolio,
            'trades': trades,
            'total_trades': len(trades),
            'win_rate': self._calculate_win_rate(trades),
            'sharpe_ratio': self._calculate_sharpe_ratio(engine),
            'max_drawdown': self._calculate_max_drawdown(engine)
        }
```

### 実装タスク
- [ ] ペーパートレーディングエンジンの実装
- [ ] 注文実行シミュレーションの実装
- [ ] ポジション管理の実装
- [ ] スリッページモデルの実装
- [ ] サンドボックス環境の実装
- [ ] 戦略バックテスト機能の実装
- [ ] パフォーマンス分析機能の実装
- [ ] トレーニングモードの実装
- [ ] UI/UXの実装
- [ ] ユニットテストの作成
- [ ] ドキュメントの作成

### 関連ファイル
- `backend/src/simulation/paper_trading.py` (新規ファイル)
- `backend/src/simulation/sandbox.py` (新規ファイル)
- `backend/src/simulation/market_simulator.py` (新規ファイル)
- `backend/tests/test_paper_trading.py` (新規ファイル)

### 優先度
高 - リスクフリーな戦略検証に必須

### 複雑度
中

### 見積もり時間
3-4週間
