---
title: リアルタイムデータ品質向上とWebSocket統合
labels: enhancement, data-quality, priority:critical, winning-edge
---

## 説明

### 問題
現在のデータフィードシステムに以下の問題があります：

1. WebSocket統合が不完全でリアルタイム性が不十分
2. データギャップや欠損値が発生している
3. 複数データソースの整合性が取れていない
4. レイテンシが高く、スキャルピングやデイトレードに不向き
5. 異常値検出が不十分で、誤ったシグナルが生成される

### 影響
- エントリー/イグジットのタイミングが遅れる
- 損切りが間に合わず大きな損失になる
- バックテスト結果と実際の取引結果に乖離が生じる
- データ品質問題による誤った売買判断

### 推奨される解決策

#### 1. 高信頼性WebSocketマネージャー
```python
# backend/src/data/websocket_manager.py
import asyncio
import websockets
import json
from typing import Dict, Callable, Optional
from dataclasses import dataclass
from datetime import datetime
import logging

@dataclass
class WebSocketConfig:
    """WebSocket設定"""
    url: str
    api_key: Optional[str] = None
    ping_interval: int = 20  # 秒
    ping_timeout: int = 10
    max_reconnect_attempts: int = 5
    reconnect_delay: int = 5
    subscription_symbols: list = None

class WebSocketManager:
    """高信頼性WebSocket接続マネージャー"""

    def __init__(self, config: WebSocketConfig):
        self.config = config
        self.ws = None
        self.is_connected = False
        self.message_handlers: Dict[str, Callable] = {}
        self.reconnect_count = 0
        self.last_ping_time = None
        self.data_buffer = []
        self.logger = logging.getLogger(__name__)

    async def connect(self):
        """WebSocket接続の確立"""
        headers = {}
        if self.config.api_key:
            headers['Authorization'] = f'Bearer {self.config.api_key}'

        while self.reconnect_count < self.config.max_reconnect_attempts:
            try:
                self.ws = await websockets.connect(
                    self.config.url,
                    extra_headers=headers,
                    ping_interval=self.config.ping_interval,
                    ping_timeout=self.config.ping_timeout
                )

                self.is_connected = True
                self.reconnect_count = 0
                self.logger.info(f"WebSocket接続確立: {datetime.now()}")

                # 購読開始
                await self._subscribe()

                # メッセージ受信ループ
                asyncio.create_task(self._message_loop())

                return True

            except Exception as e:
                self.logger.error(f"WebSocket接続エラー: {e}")
                self.reconnect_count += 1
                await asyncio.sleep(self.config.reconnect_delay)

        return False

    async def _subscribe(self):
        """シンボルを購読"""
        subscribe_msg = {
            "action": "subscribe",
            "symbols": self.config.subscription_symbols
        }
        await self.ws.send(json.dumps(subscribe_msg))

    async def _message_loop(self):
        """メッセージ受信ループ"""
        try:
            async for message in self.ws:
                await self._handle_message(message)
        except websockets.exceptions.ConnectionClosed:
            self.is_connected = False
            self.logger.warning("WebSocket接続が閉じられました")
            await self.connect()

    async def _handle_message(self, message: str):
        """メッセージ処理"""
        try:
            data = json.loads(message)

            # メッセージタイプに応じたハンドラーを呼び出し
            msg_type = data.get('type')
            if msg_type in self.message_handlers:
                await self.message_handlers[msg_type](data)

            # データバッファに追加
            self.data_buffer.append({
                'timestamp': datetime.now(),
                'data': data
            })

            # バッファサイズを制限
            if len(self.data_buffer) > 1000:
                self.data_buffer = self.data_buffer[-1000:]

        except Exception as e:
            self.logger.error(f"メッセージ処理エラー: {e}")

    def register_handler(self, msg_type: str, handler: Callable):
        """メッセージハンドラーを登録"""
        self.message_handlers[msg_type] = handler

    async def get_latest_data(self, symbol: str) -> Optional[Dict]:
        """最新データを取得"""
        for item in reversed(self.data_buffer):
            if item['data'].get('symbol') == symbol:
                return item['data']
        return None
```

#### 2. データ品質検証システム
```python
# backend/src/data/quality/data_validator.py
class DataQualityValidator:
    """データ品質検証システム"""

    def __init__(self):
        self.validation_rules = {
            'price_range': self._validate_price_range,
            'volume': self._validate_volume,
            'timestamp': self._validate_timestamp,
            'missing_values': self._check_missing_values,
            'outliers': self._detect_outliers,
            'cross_symbol_consistency': self._check_cross_consistency
        }
        self.quality_metrics = {}

    def validate_tick_data(self, tick_data: Dict) -> Dict:
        """ティックデータの検証"""
        results = {
            'is_valid': True,
            'errors': [],
            'warnings': [],
            'quality_score': 100
        }

        for rule_name, rule_func in self.validation_rules.items():
            rule_result = rule_func(tick_data)

            if not rule_result['passed']:
                results['is_valid'] = False
                results['errors'].append(rule_result['message'])
                results['quality_score'] -= rule_result['penalty']
            elif rule_result.get('warning'):
                results['warnings'].append(rule_result['warning'])
                results['quality_score'] -= rule_result.get('warning_penalty', 5)

        return results

    def _validate_price_range(self, data: Dict) -> Dict:
        """価格範囲検証"""
        price = data.get('price')
        if price is None:
            return {'passed': False, 'message': '価格データが存在しません', 'penalty': 100}

        if price <= 0:
            return {'passed': False, 'message': f'価格が0以下: {price}', 'penalty': 100}

        # 前回価格から大幅な変動がないか確認（50%以上の変動は異常）
        prev_price = self._get_previous_price(data['symbol'])
        if prev_price:
            change_pct = abs((price - prev_price) / prev_price)
            if change_pct > 0.5:
                return {
                    'passed': False,
                    'message': f'価格異常変動: {change_pct*100:.1f}%',
                    'penalty': 50
                }

        return {'passed': True}

    def _detect_outliers(self, data: Dict) -> Dict:
        """外れ値検出（Isolation Forest）"""
        from sklearn.ensemble import IsolationForest

        # 最近のデータを取得
        recent_data = self._get_recent_data(data['symbol'], window=100)

        if len(recent_data) < 20:
            return {'passed': True}

        # 特徴量を作成
        features = self._create_features(recent_data + [data])

        # Isolation Forestで異常検知
        iso_forest = IsolationForest(contamination=0.1, random_state=42)
        predictions = iso_forest.fit_predict(features)

        # 最新データが異常か判定
        if predictions[-1] == -1:
            return {
                'passed': False,
                'message': '異常値を検出',
                'penalty': 30
            }

        return {'passed': True}

    def calculate_data_latency(self, data: Dict) -> Dict:
        """データレイテンシ計算"""
        exchange_time = data.get('timestamp')
        local_time = datetime.now()

        if exchange_time:
            latency = (local_time - exchange_time).total_seconds()

            return {
                'latency_ms': latency * 1000,
                'is_acceptable': latency < 1.0,  # 1秒以下
                'latency_level': self._classify_latency(latency)
            }

        return {'latency_ms': None, 'is_acceptable': False}
```

#### 3. マルチソースデータ融合
```python
# backend/src/data/fusion/data_fusion.py
class MultiSourceDataFusion:
    """マルチソースデータ融合"""

    def __init__(self):
        self.sources = {
            'yahoo_finance': YahooFinanceSource(),
            'alpha_vantage': AlphaVantageSource(),
            'websocket': WebSocketSource()
        }
        self.source_reliability = {source: 1.0 for source in self.sources}

    def get_fused_data(self, symbol: str) -> Dict:
        """複数ソースからデータを取得して融合"""
        data_points = []

        for source_name, source in self.sources.items():
            try:
                data = source.get_quote(symbol)
                if data:
                    data_points.append({
                        'source': source_name,
                        'data': data,
                        'reliability': self.source_reliability[source_name],
                        'timestamp': datetime.now()
                    })
            except Exception as e:
                # 信頼性を低下
                self.source_reliability[source_name] *= 0.95
                continue

        if not data_points:
            return None

        # データ品質スコアリング
        for dp in data_points:
            dp['quality_score'] = self._score_data_quality(dp['data'])

        # 最も信頼性の高いデータソースを選択
        best_dp = max(data_points, key=lambda x: x['quality_score'] * x['reliability'])

        # 複数ソースがある場合は交差検証
        if len(data_points) > 1:
            cross_validation_result = self._cross_validate(data_points)
            if not cross_validation_result['is_consistent']:
                # 不整合がある場合の処理
                return self._handle_inconsistency(data_points)

        return best_dp['data']

    def _cross_validate(self, data_points: List[Dict]) -> Dict:
        """データポイント間の交差検証"""
        prices = [dp['data']['price'] for dp in data_points]

        # 標準偏差を計算
        price_std = np.std(prices)
        price_mean = np.mean(prices)

        # 変動係数（CV）を計算
        cv = (price_std / price_mean) * 100 if price_mean != 0 else 0

        # CVが1%以下なら整合していると判定
        is_consistent = cv <= 1.0

        return {
            'is_consistent': is_consistent,
            'cv': cv,
            'price_range': max(prices) - min(prices)
        }
```

#### 4. データキャッシュとパフォーマンス最適化
```python
# backend/src/data/cache/data_cache.py
from functools import lru_cache
import redis
import pickle

class DataCache:
    """高パフォーマンスデータキャッシュ"""

    def __init__(self, redis_url: str = None):
        self.redis_client = redis.from_url(redis_url) if redis_url else None
        self.memory_cache = {}
        self.cache_stats = {
            'hits': 0,
            'misses': 0
        }

    def get(self, key: str, source: str = 'memory') -> Optional[any]:
        """キャッシュからデータを取得"""
        # LRUキャッシュ（メモリ）
        if source == 'memory' and key in self.memory_cache:
            self.cache_stats['hits'] += 1
            return self.memory_cache[key]

        # Redisキャッシュ
        if source == 'redis' and self.redis_client:
            data = self.redis_client.get(key)
            if data:
                self.cache_stats['hits'] += 1
                return pickle.loads(data)

        self.cache_stats['misses'] += 1
        return None

    def set(self, key: str, value: any, ttl: int = 60, source: str = 'memory'):
        """キャッシュにデータを保存"""
        if source == 'memory':
            self.memory_cache[key] = {
                'value': value,
                'expires_at': datetime.now() + timedelta(seconds=ttl)
            }
        elif source == 'redis' and self.redis_client:
            self.redis_client.setex(
                key,
                ttl,
                pickle.dumps(value)
            )

    def invalidate(self, pattern: str = None):
        """キャッシュ無効化"""
        if pattern:
            # パターンマッチで削除
            keys_to_delete = [k for k in self.memory_cache.keys() if pattern in k]
            for key in keys_to_delete:
                del self.memory_cache[key]
        else:
            self.memory_cache.clear()

    def get_cache_stats(self) -> Dict:
        """キャッシュ統計"""
        total_requests = self.cache_stats['hits'] + self.cache_stats['misses']
        hit_rate = (self.cache_stats['hits'] / total_requests * 100) if total_requests > 0 else 0

        return {
            'hit_rate': hit_rate,
            'total_requests': total_requests,
            'memory_cache_size': len(self.memory_cache)
        }
```

### 実装タスク
- [ ] 高信頼性WebSocketマネージャーの実装
- [ ] データ品質検証システムの実装
- [ ] マルチソースデータ融合の実装
- [ ] データキャッシュシステムの実装
- [ ] 異常値検出アルゴリズムの実装
- [ ] レイテンシ監視ダッシュボードの実装
- [ ] データパイプラインの最適化
- [ ] ユニットテストの作成
- [ ] 統合テストの作成
- [ ] ドキュメントの作成

### 関連ファイル
- `backend/src/data/websocket_manager.py` (新規ファイル)
- `backend/src/data/quality/data_validator.py` (新規ファイル)
- `backend/src/data/fusion/data_fusion.py` (新規ファイル)
- `backend/src/data/cache/data_cache.py` (新規ファイル)
- `trading-platform/components/DataQualityPanel.tsx` (新規ファイル)

### 優先度
**最重要（Critical）** - 良いデータがなければ良い予測は不可能

### 複雑度
中〜高

### 見積もり時間
3-4週間

### 成功指標
- データレイテンシが100ms以下
- データ欠損率が0.1%以下
- 異常値検出率が95%以上
- キャッシュヒット率が90%以上
