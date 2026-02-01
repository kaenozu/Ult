---
title: 時系列データベース最適化とパフォーマンス改善
labels: enhancement, database, priority:medium
---

## 説明

### 問題
現在のデータベース設計は、大量の時系列データ（ティックデータ、分足、日足など）を効率的に保存・クエリするようには最適化されていません。これにより、クエリパフォーマンスの低下、ストレージコストの増大、およびリアルタイム分析の遅延が発生しています。

### 影響
- 履歴データのクエリが遅い
- ディスク容量の過剰消費
- バックアップ・リストアに時間がかかる
- リアルタイム集計が困難

### 推奨される解決策

#### 1. 時系列データベース設計
```python
# backend/src/data/database/timeseries_schema.py
from sqlalchemy import Column, BigInteger, Float, String, DateTime, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.dialects.postgresql import DOUBLE_PRECISION

Base = declarative_base()

class TickData(Base):
    """ティックデータテーブル"""
    __tablename__ = 'tick_data'
    
    # パーティションキー
    symbol = Column(String(20), primary_key=True)
    timestamp = Column(BigInteger, primary_key=True)  # Unix timestamp in milliseconds
    
    # データカラム
    price = Column(DOUBLE_PRECISION, nullable=False)
    volume = Column(DOUBLE_PRECISION, nullable=False)
    side = Column(String(4))  # 'buy' or 'sell'
    
    # インデックス
    __table_args__ = (
        Index('idx_tick_symbol_time', 'symbol', 'timestamp'),
        {'postgresql_partition_by': 'LIST (symbol)'}
    )

class OHLCVData(Base):
    """OHLCVデータテーブル（複数時間枠）"""
    __tablename__ = 'ohlcv_data'
    
    symbol = Column(String(20), primary_key=True)
    timeframe = Column(String(10), primary_key=True)  # '1m', '5m', '1h', '1d'
    timestamp = Column(BigInteger, primary_key=True)
    
    open = Column(DOUBLE_PRECISION, nullable=False)
    high = Column(DOUBLE_PRECISION, nullable=False)
    low = Column(DOUBLE_PRECISION, nullable=False)
    close = Column(DOUBLE_PRECISION, nullable=False)
    volume = Column(DOUBLE_PRECISION, nullable=False)
    
    # 追加メトリクス
    vwap = Column(DOUBLE_PRECISION)
    trades_count = Column(BigInteger)
    
    __table_args__ = (
        Index('idx_ohlcv_symbol_timeframe_time', 'symbol', 'timeframe', 'timestamp'),
        {'postgresql_partition_by': 'LIST (symbol)'}
    )

class AggregatedMetrics(Base):
    """事前計算された集計メトリクス"""
    __tablename__ = 'aggregated_metrics'
    
    symbol = Column(String(20), primary_key=True)
    date = Column(DateTime, primary_key=True)
    
    # 日次集計
    daily_volume = Column(DOUBLE_PRECISION)
    daily_high = Column(DOUBLE_PRECISION)
    daily_low = Column(DOUBLE_PRECISION)
    daily_return = Column(DOUBLE_PRECISION)
    volatility = Column(DOUBLE_PRECISION)
    
    # テクニカル指標
    sma_20 = Column(DOUBLE_PRECISION)
    sma_50 = Column(DOUBLE_PRECISION)
    rsi_14 = Column(DOUBLE_PRECISION)
    
    __table_args__ = (
        Index('idx_metrics_symbol_date', 'symbol', 'date'),
    )
```

#### 2. データ圧縮と集約
```python
# backend/src/data/database/data_aggregation.py
import pandas as pd
from sqlalchemy import create_engine
from typing import List, Tuple

class DataAggregator:
    def __init__(self, db_url: str):
        self.engine = create_engine(db_url)
    
    def aggregate_ticks_to_ohlcv(self, symbol: str, 
                                  timeframe: str,
                                  start_time: int,
                                  end_time: int) -> pd.DataFrame:
        """ティックデータをOHLCVに集約"""
        
        # ティックデータを取得
        query = f"""
        SELECT timestamp, price, volume, side
        FROM tick_data
        WHERE symbol = '{symbol}'
        AND timestamp BETWEEN {start_time} AND {end_time}
        ORDER BY timestamp
        """
        
        df = pd.read_sql(query, self.engine)
        
        if df.empty:
            return pd.DataFrame()
        
        # タイムスタンプをdatetimeに変換
        df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
        df.set_index('timestamp', inplace=True)
        
        # 時間枠に応じてリサンプリング
        freq_map = {
            '1m': '1T',
            '5m': '5T',
            '15m': '15T',
            '1h': '1H',
            '4h': '4H',
            '1d': '1D'
        }
        
        freq = freq_map.get(timeframe, '1T')
        
        # OHLCVを計算
        ohlcv = df['price'].resample(freq).ohlc()
        ohlcv['volume'] = df['volume'].resample(freq).sum()
        
        # VWAPを計算
        ohlcv['vwap'] = (df['price'] * df['volume']).resample(freq).sum() / ohlcv['volume']
        
        # 取引回数
        ohlcv['trades_count'] = df.resample(freq).size()
        
        # インデックスをタイムスタンプに戻す
        ohlcv.reset_index(inplace=True)
        ohlcv['timestamp'] = ohlcv['timestamp'].astype(int) // 10**6  # back to ms
        ohlcv['symbol'] = symbol
        ohlcv['timeframe'] = timeframe
        
        return ohlcv
    
    def compress_old_data(self, symbol: str, 
                         older_than_days: int = 30):
        """古いデータを圧縮"""
        cutoff_time = int((pd.Timestamp.now() - pd.Timedelta(days=older_than_days)).timestamp() * 1000)
        
        # 1. 古いティックデータを集約して削除
        self._aggregate_and_delete_ticks(symbol, cutoff_time)
        
        # 2. 古いOHLCVデータを下位時間枠に圧縮
        self._compress_timeframes(symbol, cutoff_time)
    
    def _aggregate_and_delete_ticks(self, symbol: str, cutoff_time: int):
        """ティックデータを集約して削除"""
        # 古いデータを1時間足に集約
        ohlcv = self.aggregate_ticks_to_ohlcv(
            symbol, '1h', 
            0, cutoff_time
        )
        
        if not ohlcv.empty:
            # OHLCVテーブルに保存
            ohlcv.to_sql('ohlcv_data', self.engine, if_exists='append', index=False)
            
            # ティックデータを削除
            delete_query = f"""
            DELETE FROM tick_data
            WHERE symbol = '{symbol}'
            AND timestamp < {cutoff_time}
            """
            self.engine.execute(delete_query)
```

#### 3. クエリ最適化
```python
# backend/src/data/database/query_optimizer.py
from functools import lru_cache
import redis
import json

class QueryOptimizer:
    def __init__(self, db_url: str, redis_url: str = None):
        self.engine = create_engine(db_url)
        self.cache = redis.Redis.from_url(redis_url) if redis_url else None
        self.cache_ttl = 300  # 5 minutes
    
    def get_ohlcv(self, symbol: str, timeframe: str,
                  start_time: int, end_time: int,
                  use_cache: bool = True) -> pd.DataFrame:
        """最適化されたOHLCVクエリ"""
        
        # キャッシュキーを生成
        cache_key = f"ohlcv:{symbol}:{timeframe}:{start_time}:{end_time}"
        
        # キャッシュをチェック
        if use_cache and self.cache:
            cached = self.cache.get(cache_key)
            if cached:
                return pd.read_json(cached)
        
        # クエリを最適化（カラム選択、インデックス活用）
        query = f"""
        SELECT timestamp, open, high, low, close, volume
        FROM ohlcv_data
        WHERE symbol = :symbol
        AND timeframe = :timeframe
        AND timestamp BETWEEN :start_time AND :end_time
        ORDER BY timestamp
        """
        
        df = pd.read_sql(
            query, 
            self.engine,
            params={
                'symbol': symbol,
                'timeframe': timeframe,
                'start_time': start_time,
                'end_time': end_time
            }
        )
        
        # 結果をキャッシュ
        if use_cache and self.cache and not df.empty:
            self.cache.setex(
                cache_key,
                self.cache_ttl,
                df.to_json()
            )
        
        return df
    
    @lru_cache(maxsize=128)
    def get_latest_price(self, symbol: str) -> float:
        """最新価格を取得（メモリキャッシュ付き）"""
        query = f"""
        SELECT close
        FROM ohlcv_data
        WHERE symbol = '{symbol}'
        AND timeframe = '1m'
        ORDER BY timestamp DESC
        LIMIT 1
        """
        
        result = self.engine.execute(query).fetchone()
        return result[0] if result else None
```

### 実装タスク
- [ ] 時系列データベーススキーマの設計
- [ ] パーティショニング戦略の実装
- [ ] データ集約パイプラインの実装
- [ ] 自動圧縮システムの実装
- [ ] クエリ最適化の実装
- [ ] キャッシングレイヤーの実装
- [ ] パフォーマンスモニタリングの実装
- [ ] バックアップ・リストア戦略の実装
- [ ] ユニットテストの作成
- [ ] ドキュメントの作成

### 関連ファイル
- `backend/src/data/database/timeseries_schema.py` (新規ファイル)
- `backend/src/data/database/data_aggregation.py` (新規ファイル)
- `backend/src/data/database/query_optimizer.py` (新規ファイル)
- `backend/tests/test_database_optimization.py` (新規ファイル)

### 優先度
中 - スケーラビリティとパフォーマンスに重要

### 複雑度
高

### 見積もり時間
3-4週間
