---
title: データプロバイダー統合（Bloomberg, Refinitiv, Alpha Vantage等）
labels: enhancement, integration, priority:medium
---

## 説明

### 問題
現在のシステムには、複数の金融データプロバイダー（Bloomberg、Refinitiv、Alpha Vantageなど）に統合するための標準化されたフレームワークがありません。これにより、データの品質、網羅性、リアルタイム性が制限されます。

### 影響
- 高品質な市場データにアクセスできない
- 代替データ（センチメント、ESGなど）を活用できない
- データの冗長性と信頼性が低い
- データコストの最適化が困難

### 推奨される解決策

#### 1. データプロバイダー抽象化レイヤー
```python
# backend/src/data/providers/base_provider.py
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime
from enum import Enum

class DataType(Enum):
    PRICE = "price"
    FUNDAMENTAL = "fundamental"
    NEWS = "news"
    SENTIMENT = "sentiment"
    ESG = "esg"
    ALTERNATIVE = "alternative"

@dataclass
class DataRequest:
    symbol: str
    data_type: DataType
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    frequency: str = "daily"
    fields: Optional[List[str]] = None

@dataclass
class MarketData:
    symbol: str
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float
    adjusted_close: Optional[float] = None
    source: str = ""

class BaseDataProvider(ABC):
    """データプロバイダーの基底クラス"""
    
    def __init__(self, api_key: str, **kwargs):
        self.api_key = api_key
        self.config = kwargs
        self.name = self.__class__.__name__
        self.rate_limit_remaining = None
        self.rate_limit_reset = None
    
    @abstractmethod
    async def connect(self) -> bool:
        """プロバイダーに接続"""
        pass
    
    @abstractmethod
    async def get_price_data(self, request: DataRequest) -> List[MarketData]:
        """価格データを取得"""
        pass
    
    @abstractmethod
    async def get_fundamental_data(self, symbol: str) -> Dict:
        """ファンダメンタルデータを取得"""
        pass
    
    @abstractmethod
    async def get_news(self, symbol: str, limit: int = 10) -> List[Dict]:
        """ニュースを取得"""
        pass
    
    @abstractmethod
    async def get_sentiment(self, symbol: str) -> Dict:
        """センチメントデータを取得"""
        pass
    
    @abstractmethod
    def get_rate_limit_status(self) -> Dict:
        """レート制限状況を取得"""
        pass
    
    def normalize_symbol(self, symbol: str) -> str:
        """シンボルを標準形式に正規化"""
        return symbol.upper().strip()
    
    def handle_rate_limit(self, response_headers: Dict):
        """レート制限ヘッダーを処理"""
        self.rate_limit_remaining = response_headers.get('X-RateLimit-Remaining')
        self.rate_limit_reset = response_headers.get('X-RateLimit-Reset')
```

#### 2. Alpha Vantage統合
```python
# backend/src/data/providers/alpha_vantage.py
import aiohttp
import pandas as pd
from .base_provider import BaseDataProvider, DataRequest, MarketData, DataType

class AlphaVantageProvider(BaseDataProvider):
    """Alpha Vantage API統合"""
    
    def __init__(self, api_key: str, **kwargs):
        super().__init__(api_key, **kwargs)
        self.base_url = "https://www.alphavantage.co/query"
        self.session = None
    
    async def connect(self) -> bool:
        """Alpha Vantageに接続"""
        self.session = aiohttp.ClientSession()
        # APIキーの有効性をテスト
        try:
            test_data = await self.get_price_data(
                DataRequest(symbol="IBM", data_type=DataType.PRICE, frequency="daily")
            )
            return len(test_data) > 0
        except Exception:
            return False
    
    async def get_price_data(self, request: DataRequest) -> List[MarketData]:
        """株価データを取得"""
        symbol = self.normalize_symbol(request.symbol)
        
        params = {
            'function': 'TIME_SERIES_DAILY_ADJUSTED',
            'symbol': symbol,
            'apikey': self.api_key,
            'outputsize': 'full'
        }
        
        async with self.session.get(self.base_url, params=params) as response:
            data = await response.json()
            
            if 'Time Series (Daily)' not in data:
                raise Exception(f"No data returned: {data.get('Note', 'Unknown error')}")
            
            time_series = data['Time Series (Daily)']
            
            market_data = []
            for date_str, values in time_series.items():
                timestamp = datetime.strptime(date_str, '%Y-%m-%d')
                
                # 日付フィルタリング
                if request.start_date and timestamp < request.start_date:
                    continue
                if request.end_date and timestamp > request.end_date:
                    continue
                
                market_data.append(MarketData(
                    symbol=symbol,
                    timestamp=timestamp,
                    open=float(values['1. open']),
                    high=float(values['2. high']),
                    low=float(values['3. low']),
                    close=float(values['4. close']),
                    adjusted_close=float(values['5. adjusted close']),
                    volume=float(values['6. volume']),
                    source=self.name
                ))
            
            return sorted(market_data, key=lambda x: x.timestamp)
    
    async def get_fundamental_data(self, symbol: str) -> Dict:
        """ファンダメンタルデータを取得"""
        symbol = self.normalize_symbol(symbol)
        
        params = {
            'function': 'OVERVIEW',
            'symbol': symbol,
            'apikey': self.api_key
        }
        
        async with self.session.get(self.base_url, params=params) as response:
            data = await response.json()
            
            if 'Symbol' not in data:
                raise Exception(f"No fundamental data: {data}")
            
            return {
                'symbol': data.get('Symbol'),
                'name': data.get('Name'),
                'sector': data.get('Sector'),
                'industry': data.get('Industry'),
                'market_cap': float(data.get('MarketCapitalization', 0)),
                'pe_ratio': float(data.get('PERatio', 0)) if data.get('PERatio') else None,
                'pb_ratio': float(data.get('PriceToBookRatio', 0)) if data.get('PriceToBookRatio') else None,
                'dividend_yield': float(data.get('DividendYield', 0)) if data.get('DividendYield') else None,
                '52_week_high': float(data.get('52WeekHigh', 0)) if data.get('52WeekHigh') else None,
                '52_week_low': float(data.get('52WeekLow', 0)) if data.get('52WeekLow') else None,
                'source': self.name
            }
    
    async def get_news(self, symbol: str, limit: int = 10) -> List[Dict]:
        """ニュースを取得"""
        symbol = self.normalize_symbol(symbol)
        
        params = {
            'function': 'NEWS_SENTIMENT',
            'tickers': symbol,
            'apikey': self.api_key,
            'limit': limit
        }
        
        async with self.session.get(self.base_url, params=params) as response:
            data = await response.json()
            
            feed = data.get('feed', [])
            
            return [{
                'title': item.get('title'),
                'summary': item.get('summary'),
                'url': item.get('url'),
                'published': item.get('time_published'),
                'source': item.get('source'),
                'sentiment_score': item.get('overall_sentiment_score'),
                'sentiment_label': item.get('overall_sentiment_label')
            } for item in feed[:limit]]
    
    async def get_sentiment(self, symbol: str) -> Dict:
        """センチメントデータを取得"""
        news = await self.get_news(symbol, limit=50)
        
        if not news:
            return {'symbol': symbol, 'sentiment_score': 0, 'sentiment_label': 'neutral'}
        
        scores = [n['sentiment_score'] for n in news if n.get('sentiment_score')]
        
        if not scores:
            return {'symbol': symbol, 'sentiment_score': 0, 'sentiment_label': 'neutral'}
        
        avg_score = sum(scores) / len(scores)
        
        if avg_score > 0.25:
            label = 'bullish'
        elif avg_score < -0.25:
            label = 'bearish'
        else:
            label = 'neutral'
        
        return {
            'symbol': symbol,
            'sentiment_score': avg_score,
            'sentiment_label': label,
            'news_count': len(news),
            'source': self.name
        }
```

#### 3. データプロバイダーマネージャー
```python
# backend/src/data/providers/provider_manager.py
from typing import Dict, List, Type, Optional
from .base_provider import BaseDataProvider, DataRequest, DataType

class DataProviderManager:
    """複数データプロバイダーの管理とフォールバック"""
    
    def __init__(self):
        self.providers: Dict[str, BaseDataProvider] = {}
        self.provider_classes: Dict[str, Type[BaseDataProvider]] = {}
        self.priority_order: List[str] = []
    
    def register_provider_class(self, name: str, provider_class: Type[BaseDataProvider]):
        """プロバイダークラスを登録"""
        self.provider_classes[name] = provider_class
    
    async def add_provider(self, name: str, credentials: Dict):
        """プロバイダーを追加"""
        if name not in self.provider_classes:
            raise ValueError(f"Unknown provider: {name}")
        
        provider_class = self.provider_classes[name]
        provider = provider_class(
            api_key=credentials['api_key'],
            **credentials.get('config', {})
        )
        
        connected = await provider.connect()
        if connected:
            self.providers[name] = provider
            if name not in self.priority_order:
                self.priority_order.append(name)
        else:
            raise ConnectionError(f"Failed to connect to {name}")
    
    async def get_data_with_fallback(self, request: DataRequest,
                                     preferred_provider: str = None) -> List:
        """フォールバック付きでデータを取得"""
        providers_to_try = self._get_provider_order(preferred_provider)
        
        last_error = None
        for provider_name in providers_to_try:
            provider = self.providers.get(provider_name)
            if not provider:
                continue
            
            try:
                if request.data_type == DataType.PRICE:
                    return await provider.get_price_data(request)
                elif request.data_type == DataType.FUNDAMENTAL:
                    return await provider.get_fundamental_data(request.symbol)
                elif request.data_type == DataType.NEWS:
                    return await provider.get_news(request.symbol)
                elif request.data_type == DataType.SENTIMENT:
                    return await provider.get_sentiment(request.symbol)
            except Exception as e:
                last_error = e
                continue
        
        raise Exception(f"All providers failed. Last error: {last_error}")
    
    def _get_provider_order(self, preferred: str = None) -> List[str]:
        """プロバイダーの優先順位を取得"""
        if preferred and preferred in self.priority_order:
            order = [preferred]
            order.extend([p for p in self.priority_order if p != preferred])
            return order
        return self.priority_order
    
    async def get_consolidated_data(self, request: DataRequest) -> Dict:
        """複数プロバイダーからデータを統合"""
        results = {}
        
        for provider_name, provider in self.providers.items():
            try:
                if request.data_type == DataType.PRICE:
                    data = await provider.get_price_data(request)
                    results[provider_name] = data
            except Exception as e:
                results[provider_name] = {'error': str(e)}
        
        return results
```

### 実装タスク
- [ ] データプロバイダー基底クラスの実装
- [ ] Alpha Vantage統合の実装
- [ ] Yahoo Finance統合の実装
- [ ] Polygon.io統合の実装
- [ ] Financial Modeling Prep統合の実装
- [ ] データプロバイダーマネージャーの実装
- [ ] フォールバックメカニズムの実装
- [ ] データ品質検証の実装
- [ ] レート制限管理の実装
- [ ] ユニットテストの作成
- [ ] ドキュメントの作成

### 関連ファイル
- `backend/src/data/providers/base_provider.py` (新規ファイル)
- `backend/src/data/providers/alpha_vantage.py` (新規ファイル)
- `backend/src/data/providers/yahoo_finance.py` (新規ファイル)
- `backend/src/data/providers/provider_manager.py` (新規ファイル)
- `backend/tests/test_data_providers.py` (新規ファイル)

### 優先度
中 - 高品質なデータは取引成功の鍵

### 複雑度
中

### 見積もり時間
3-4週間
