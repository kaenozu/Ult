---
title: 取引コスト分析と最適化システムの実装
labels: enhancement, cost-optimization, priority:high
---

## 説明

### 問題
現在のシステムには、取引コスト（手数料、スリッページ、マーケットインパクト）を詳細に分析し最適化する機能がありません。これにより、実際の取引コストが予想を上回り、戦略の収益性が低下する可能性があります。

### 影響
- 取引コストの見積もりが不正確
- スリッページによる予期せぬ損失
- 最適な注文戦略の選択が困難
- 戦略の実際の収益性が不明確

### 推奨される解決策

#### 1. 取引コスト分析エンジン
```python
# backend/src/costs/transaction_cost_analyzer.py
from typing import Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime
import numpy as np

@dataclass
class TransactionCost:
    commission: float
    slippage: float
    market_impact: float
    opportunity_cost: float
    total_cost: float
    cost_bps: float  # Basis points

class TransactionCostAnalyzer:
    def __init__(self):
        self.cost_history = []
        self.benchmark_prices = {}
    
    def analyze_trade_cost(self, order: Dict, execution: Dict, 
                          market_data: Dict) -> TransactionCost:
        """個別取引のコストを分析"""
        
        # 1. 手数料の計算
        commission = self._calculate_commission(order, execution)
        
        # 2. スリッページの計算
        slippage = self._calculate_slippage(order, execution, market_data)
        
        # 3. マーケットインパクトの推定
        market_impact = self._estimate_market_impact(order, execution, market_data)
        
        # 4. 機会コストの計算
        opportunity_cost = self._calculate_opportunity_cost(order, execution, market_data)
        
        # 合計コスト
        total_cost = commission + slippage + market_impact + opportunity_cost
        
        # ベーシスポイントで表現
        notional_value = execution['filled_quantity'] * execution['average_price']
        cost_bps = (total_cost / notional_value) * 10000 if notional_value > 0 else 0
        
        cost = TransactionCost(
            commission=commission,
            slippage=slippage,
            market_impact=market_impact,
            opportunity_cost=opportunity_cost,
            total_cost=total_cost,
            cost_bps=cost_bps
        )
        
        # 履歴に保存
        self.cost_history.append({
            'timestamp': datetime.now(),
            'order': order,
            'cost': cost
        })
        
        return cost
    
    def _calculate_commission(self, order: Dict, execution: Dict) -> float:
        """手数料を計算"""
        commission_structure = self._get_commission_structure(order['exchange'])
        
        if commission_structure['type'] == 'percentage':
            notional = execution['filled_quantity'] * execution['average_price']
            return notional * commission_structure['rate']
        elif commission_structure['type'] == 'flat':
            return commission_structure['rate'] * execution['filled_quantity']
        else:  # tiered
            return self._calculate_tiered_commission(execution, commission_structure)
    
    def _calculate_slippage(self, order: Dict, execution: Dict, 
                           market_data: Dict) -> float:
        """スリッページを計算"""
        if order['order_type'] == 'MARKET':
            # 市場注文の場合、直前の価格と実行価格の差
            benchmark_price = market_data.get('mid_price', execution['average_price'])
        else:
            # 指値注文の場合、指値と実行価格の差
            benchmark_price = order.get('limit_price', execution['average_price'])
        
        price_diff = execution['average_price'] - benchmark_price
        
        if order['side'] == 'buy':
            slippage_per_unit = max(0, price_diff)
        else:
            slippage_per_unit = max(0, -price_diff)
        
        return slippage_per_unit * execution['filled_quantity']
    
    def _estimate_market_impact(self, order: Dict, execution: Dict, 
                               market_data: Dict) -> float:
        """マーケットインパクトを推定（Almgrenモデルなど）"""
        # Almgrenモデルの簡易版
        participation_rate = execution['filled_quantity'] / market_data.get('adv', execution['filled_quantity'] * 10)
        volatility = market_data.get('volatility', 0.02)
        
        # 一時的インパクト + 恒久的インパクト
        temporary_impact = 0.5 * volatility * np.sqrt(participation_rate)
        permanent_impact = 0.1 * volatility * participation_rate
        
        total_impact = temporary_impact + permanent_impact
        notional = execution['filled_quantity'] * execution['average_price']
        
        return total_impact * notional
    
    def _calculate_opportunity_cost(self, order: Dict, execution: Dict, 
                                   market_data: Dict) -> float:
        """機会コストを計算（未約分数量）"""
        unfilled_quantity = order['quantity'] - execution['filled_quantity']
        
        if unfilled_quantity <= 0:
            return 0
        
        # 未約分数量の価格変動コスト
        price_change = abs(market_data.get('price_change', 0))
        opportunity_cost = unfilled_quantity * price_change
        
        return opportunity_cost
```

#### 2. コスト最適化エンジン
```python
class CostOptimizer:
    def __init__(self, cost_analyzer: TransactionCostAnalyzer):
        self.cost_analyzer = cost_analyzer
        self.optimization_strategies = {
            'minimize_slippage': self._optimize_for_slippage,
            'minimize_commission': self._optimize_for_commission,
            'minimize_total_cost': self._optimize_for_total_cost,
            'best_execution': self._optimize_for_best_execution
        }
    
    def optimize_order(self, order: Dict, market_conditions: Dict,
                      objective: str = 'minimize_total_cost') -> Dict:
        """注文を最適化"""
        
        strategy = self.optimization_strategies.get(objective, self._optimize_for_total_cost)
        
        optimized_order = strategy(order, market_conditions)
        
        # 予想コストを計算
        estimated_cost = self._estimate_order_cost(optimized_order, market_conditions)
        optimized_order['estimated_cost'] = estimated_cost
        
        return optimized_order
    
    def _optimize_for_slippage(self, order: Dict, market_conditions: Dict) -> Dict:
        """スリッページを最小化"""
        optimized = order.copy()
        
        # 流動性が高い時間帯を選択
        if market_conditions.get('liquidity_score', 0) < 0.7:
            optimized['execution_delay'] = self._find_liquid_window(market_conditions)
        
        # 注文を分割
        if order['quantity'] > market_conditions.get('average_trade_size', order['quantity']) * 5:
            optimized['slices'] = self._calculate_optimal_slices(order, market_conditions)
        
        return optimized
    
    def _optimize_for_total_cost(self, order: Dict, market_conditions: Dict) -> Dict:
        """総コストを最小化"""
        optimized = order.copy()
        
        # 注文タイプの選択
        spread = market_conditions.get('spread', 0)
        if spread < 0.001:  # スプレッドが狭い場合は指値注文
            optimized['order_type'] = 'LIMIT'
            optimized['limit_price'] = self._calculate_aggressive_limit(order, market_conditions)
        else:  # スプレッドが広い場合は市場注文
            optimized['order_type'] = 'MARKET'
        
        # 取引所の選択
        if 'exchanges' in market_conditions:
            best_exchange = self._select_best_exchange(order, market_conditions['exchanges'])
            optimized['exchange'] = best_exchange
        
        return optimized
    
    def _calculate_optimal_slices(self, order: Dict, market_conditions: Dict) -> List[Dict]:
        """最適な注文分割を計算"""
        total_quantity = order['quantity']
        adv = market_conditions.get('adv', total_quantity * 10)  # Average Daily Volume
        
        # 参加率を5-10%に制限
        max_participation_rate = 0.1
        slice_size = adv * max_participation_rate
        
        num_slices = int(np.ceil(total_quantity / slice_size))
        
        slices = []
        remaining = total_quantity
        
        for i in range(num_slices):
            quantity = min(slice_size, remaining)
            slices.append({
                'slice_number': i + 1,
                'quantity': quantity,
                'delay_seconds': i * 60  # 1分間隔
            })
            remaining -= quantity
        
        return slices
```

### 実装タスク
- [ ] 取引コスト分析エンジンの実装
- [ ] 手数料計算システムの実装
- [ ] スリッページ計算の実装
- [ ] マーケットインパクト推定の実装
- [ ] コスト最適化エンジンの実装
- [ ] 注文分割最適化の実装
- [ ] 取引所選択最適化の実装
- [ ] コストレポート機能の実装
- [ ] ユニットテストの作成
- [ ] ドキュメントの作成

### 関連ファイル
- `backend/src/costs/transaction_cost_analyzer.py` (新規ファイル)
- `backend/src/costs/cost_optimizer.py` (新規ファイル)
- `backend/src/costs/models.py` (新規ファイル)
- `backend/tests/test_cost_analysis.py` (新規ファイル)

### 優先度
高 - 取引コストは収益性に直接影響

### 複雑度
中

### 見積もり時間
3週間
