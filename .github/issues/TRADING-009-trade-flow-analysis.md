---
title: トレードフロー分析モジュールの実装
labels: enhancement, market-microstructure, priority:high
---

## 説明

### 問題
現在のシステムには、トレードフロー（取引の方向性、タイミング、規模）を分析する機能がありません。これにより、機関投資家の動き、市場のセンチメント、潜在的なトレンド転換点を特定することができません。

### 影響
- 大口注文の流入を検知できない
- 市場のセンチメント変化をリアルタイムで把握できない
- 機関投資家のポジション構築・解消を検知できない
- 異常な取引活動（ダンプ、ポンプ）を検知できない

### 推奨される解決策

#### 1. トレードフローデータ収集
```python
# backend/src/market_microstructure/trade_flow.py
class TradeFlowAnalyzer:
    def __init__(self):
        self.trades = []
        self.flow_metrics = {}
    
    def add_trade(self, trade: Dict):
        """トレードを追加"""
        trade['timestamp'] = datetime.now()
        self.trades.append(trade)
        self._cleanup_old_trades()
    
    def calculate_buy_sell_pressure(self, window_seconds: int = 60) -> Dict:
        """売買圧力を計算"""
        cutoff_time = datetime.now() - timedelta(seconds=window_seconds)
        recent_trades = [t for t in self.trades if t['timestamp'] >= cutoff_time]
        
        buy_volume = sum(t['volume'] for t in recent_trades if t['side'] == 'buy')
        sell_volume = sum(t['volume'] for t in recent_trades if t['side'] == 'sell')
        total_volume = buy_volume + sell_volume
        
        return {
            'buy_volume': buy_volume,
            'sell_volume': sell_volume,
            'buy_pressure': buy_volume / total_volume if total_volume > 0 else 0.5,
            'sell_pressure': sell_volume / total_volume if total_volume > 0 else 0.5,
            'imbalance': (buy_volume - sell_volume) / total_volume if total_volume > 0 else 0
        }
```

#### 2. 大口取引検出
```python
def detect_large_trades(self, threshold_std: float = 2.0) -> List[Dict]:
    """統計的に異常な大口取引を検出"""
    if len(self.trades) < 100:
        return []
    
    volumes = [t['volume'] for t in self.trades]
    mean_volume = np.mean(volumes)
    std_volume = np.std(volumes)
    threshold = mean_volume + threshold_std * std_volume
    
    large_trades = [
        t for t in self.trades 
        if t['volume'] >= threshold
    ]
    
    return large_trades
```

#### 3. トレードフローインディケーター
```python
def calculate_flow_indicators(self) -> Dict:
    """複数のフローインディケーターを計算"""
    # 1. Volume Weighted Average Price (VWAP) deviation
    vwap = self._calculate_vwap()
    current_price = self.trades[-1]['price'] if self.trades else 0
    vwap_deviation = (current_price - vwap) / vwap * 100
    
    # 2. Trade intensity
    trade_intensity = self._calculate_trade_intensity()
    
    # 3. Aggressive order ratio
    aggressive_ratio = self._calculate_aggressive_ratio()
    
    # 4. Time-weighted flow
    time_weighted_flow = self._calculate_time_weighted_flow()
    
    return {
        'vwap_deviation': vwap_deviation,
        'trade_intensity': trade_intensity,
        'aggressive_ratio': aggressive_ratio,
        'time_weighted_flow': time_weighted_flow,
        'overall_sentiment': self._calculate_sentiment_score()
    }
```

#### 4. 機関投資家アクティビティ検出
```python
def detect_institutional_activity(self) -> Dict:
    """機関投資家のアクティビティを検出"""
    large_trades = self.detect_large_trades()
    
    # 大口取引のクラスタリング
    clusters = self._cluster_large_trades(large_trades)
    
    # 方向性の分析
    buy_clusters = [c for c in clusters if c['avg_side'] == 'buy']
    sell_clusters = [c for c in clusters if c['avg_side'] == 'sell']
    
    return {
        'buying_institutional': len(buy_clusters),
        'selling_institutional': len(sell_clusters),
        'net_institutional_flow': len(buy_clusters) - len(sell_clusters),
        'total_institutional_volume': sum(c['total_volume'] for c in clusters),
        'activity_level': self._classify_activity_level(clusters)
    }
```

### 実装タスク
- [ ] トレードフローデータモデルの定義
- [ ] リアルタイムトレードフィードの統合
- [ ] 売買圧力分析の実装
- [ ] 大口取引検出アルゴリズムの実装
- [ ] フローインディケーターの実装
- [ ] 機関投資家アクティビティ検出の実装
- [ ] 異常取引検知（ダンプ/ポンプ）の実装
- [ ] ユニットテストの作成
- [ ] ドキュメントの作成

### 関連ファイル
- `backend/src/market_microstructure/trade_flow.py` (新規ファイル)
- `backend/src/market_microstructure/models.py` (新規ファイル)
- `backend/tests/test_trade_flow.py` (新規ファイル)

### 優先度
高 - トレードフロー分析は市場センチメントの早期発見に不可欠

### 複雑度
中

### 見積もり時間
2-3週間
