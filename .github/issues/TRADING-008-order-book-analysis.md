---
title: オーダーブック分析モジュールの実装
labels: enhancement, market-microstructure, priority:high
---

## 説明

### 問題
現在のシステムには、オーダーブックの深さ、スプレッド、価格帯ごとのボリューム分布を分析する機能がありません。これにより、市場の流動性、価格感応度、潜在的なサポート/レジスタンスレベルを特定することができません。

### 影響
- 大口注文の実行時に予期せぬスリッページが発生する可能性がある
- 市場の流動性状況を正確に把握できない
- 最適な注文タイミングと価格を特定できない
- マーケットメイカーの動きを検知できない

### 推奨される解決策

#### 1. オーダーブックデータ収集
```python
# backend/src/market_microstructure/order_book.py
class OrderBookAnalyzer:
    def __init__(self):
        self.bids = []
        self.asks = []
        self.snapshot_time = None
    
    def update_snapshot(self, bids: List[Tuple[float, float]], asks: List[Tuple[float, float]]):
        """オーダーブックスナップショットを更新"""
        self.bids = sorted(bids, key=lambda x: x[0], reverse=True)
        self.asks = sorted(asks, key=lambda x: x[0])
        self.snapshot_time = datetime.now()
    
    def calculate_spread(self) -> float:
        """ビッド・アスクスプレッドを計算"""
        if not self.bids or not self.asks:
            return 0.0
        return self.asks[0][0] - self.bids[0][0]
    
    def calculate_spread_percentage(self) -> float:
        """スプレッドのパーセンテージを計算"""
        if not self.bids or not self.asks:
            return 0.0
        mid_price = (self.bids[0][0] + self.asks[0][0]) / 2
        spread = self.calculate_spread()
        return (spread / mid_price) * 100
```

#### 2. 流動性分析
```python
def calculate_liquidity_depth(self, price_levels: int = 10) -> Dict:
    """指定した価格レベルまでの流動性を計算"""
    bid_volume = sum(level[1] for level in self.bids[:price_levels])
    ask_volume = sum(level[1] for level in self.asks[:price_levels])
    
    return {
        'bid_volume': bid_volume,
        'ask_volume': ask_volume,
        'imbalance': (bid_volume - ask_volume) / (bid_volume + ask_volume),
        'total_volume': bid_volume + ask_volume
    }
```

#### 3. 価格感応度分析
```python
def calculate_price_impact(self, order_size: float) -> Dict:
    """注文サイズによる価格インパクトを推定"""
    cumulative_bids = 0
    avg_execution_price = 0
    total_filled = 0
    
    for price, volume in self.bids:
        if cumulative_bids >= order_size:
            break
        fill = min(volume, order_size - cumulative_bids)
        avg_execution_price = (avg_execution_price * total_filled + price * fill) / (total_filled + fill)
        total_filled += fill
        cumulative_bids += fill
    
    return {
        'average_price': avg_execution_price,
        'slippage': (self.bids[0][0] - avg_execution_price) / self.bids[0][0] * 100,
        'fill_percentage': (total_filled / order_size) * 100
    }
```

#### 4. サポート/レジスタンスレベル検出
```python
def detect_support_resistance(self, window_size: int = 5) -> Dict:
    """オーダーブックからサポート/レジスタンスレベルを検出"""
    # 大口注文のクラスタを検出
    bid_clusters = self._find_large_order_clusters(self.bids, window_size)
    ask_clusters = self._find_large_order_clusters(self.asks, window_size)
    
    return {
        'support_levels': [cluster['price'] for cluster in bid_clusters],
        'resistance_levels': [cluster['price'] for cluster in ask_clusters],
        'support_strength': [cluster['volume'] for cluster in bid_clusters],
        'resistance_strength': [cluster['volume'] for cluster in ask_clusters]
    }
```

### 実装タスク
- [ ] オーダーブックデータモデルの定義
- [ ] リアルタイムオーダーブックフィードの統合
- [ ] スプレッド分析機能の実装
- [ ] 流動性深度分析の実装
- [ ] 価格感応度計算の実装
- [ ] サポート/レジスタンスレベル検出の実装
- [ ] オーダーブック不均衡指標の実装
- [ ] ユニットテストの作成
- [ ] ドキュメントの作成

### 関連ファイル
- `backend/src/market_microstructure/` (新規ディレクトリ)
- `backend/src/market_microstructure/order_book.py` (新規ファイル)
- `backend/src/market_microstructure/models.py` (新規ファイル)
- `backend/tests/test_order_book.py` (新規ファイル)

### 優先度
高 - 流動性分析はリスク管理と注文実行の最適化に不可欠

### 複雑度
中

### 見積もり時間
2-3週間
