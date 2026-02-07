# 型定義ドキュメント

このドキュメントは、ULT Trading Platformの型定義システムについて説明します。

## 概要

型定義システムは、TypeScriptの型安全性を向上させるために設計されています。以下のカテゴリに分類されています：

- **API型**: APIリクエストとレスポンスの型定義
- **ユーザー型**: ユーザー入力とプロファイルの型定義
- **データベース型**: データベース操作とキャッシュの型定義
- **外部API型**: 外部APIプロバイダーとの連携の型定義
- **共通型**: トレードシグナル、マーケットデータ、予測結果、アラートなどの共通型定義

## 型定義ファイル

### API型 (`api.ts`)

APIリクエストとレスポンスの型定義を含みます。

#### 主要な型

- `ApiResponse<T>`: 汎用APIレスポンス型
- `ApiErrorResponse`: APIエラーレスポンス型
- `ApiSuccessResponse<T>`: 成功レスポンス型
- `PaginatedResponse<T>`: ページネーションレスポンス型
- `MarketDataRequest`: マーケットデータAPIリクエスト型
- `TradeSignalRequest`: トレードシグナルAPIリクエスト型
- `BacktestRequest`: バックテストAPIリクエスト型
- `BacktestResponse`: バックテストAPIレスポンス型

#### 使用例

```typescript
import type { ApiResponse, MarketDataRequest } from '@/app/lib/types/api';

async function fetchMarketData(request: MarketDataRequest): Promise<ApiResponse<MarketData>> {
  const response = await fetch('/api/market', {
    method: 'POST',
    body: JSON.stringify(request),
  });
  return response.json();
}
```

### ユーザー型 (`user.ts`)

ユーザー入力とプロファイルの型定義を含みます。

#### 主要な型

- `UserCredentials`: ユーザー認証情報
- `UserProfile`: ユーザープロファイル
- `UserPreferences`: ユーザー設定
- `WatchlistEntry`: ウォッチリストエントリ
- `PositionInput`: ポジション入力
- `OrderInput`: 注文入力
- `BacktestInput`: バックテスト入力
- `AlertConditionInput`: アラート条件入力
- `ScreenerConditionInput`: スクリーニング条件入力
- `ScreenerRequest`: スクリーニングリクエスト
- `PortfolioInput`: ポートフォリオ入力
- `RiskManagementInput`: リスク管理設定入力
- `FeedbackInput`: フィードバック入力
- `SearchQueryInput`: 検索クエリ入力
- `ExportSettingsInput`: エクスポート設定入力

#### 使用例

```typescript
import type { UserCredentials, UserProfile } from '@/app/lib/types/user';

async function login(credentials: UserCredentials): Promise<UserProfile> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
  return response.json();
}
```

### データベース型 (`database.ts`)

データベース操作とキャッシュの型定義を含みます。

#### 主要な型

- `DatabaseEntry`: データベースエントリの基本型
- `StoreName`: IndexedDBストア名の列挙型
- `MarketDataEntry`: マーケットデータストアエントリ
- `TradeEntry`: 取引ストアエントリ
- `PositionEntry`: ポジションストアエントリ
- `WatchlistEntryDB`: ウォッチリストストアエントリ
- `AlertEntry`: アラートストアエントリ
- `BacktestEntry`: バックテストストアエントリ
- `SettingsEntry`: 設定ストアエントリ
- `CacheEntry<T>`: キャッシュストアエントリ
- `QueryOptions`: データベースクエリオプション
- `UpdateOptions`: データベース更新オプション
- `BackupInfo`: データベースバックアップ情報
- `DatabaseStats`: データベース統計情報
- `OHLCV`: OHLCVデータ型
- `BacktestResult`: バックテスト結果型
- `DatabaseOperationResult<T>`: データベース操作の結果型
- `MigrationInfo`: データベースマイグレーション情報
- `SchemaInfo`: データベーススキーマ情報

#### 使用例

```typescript
import type { CacheEntry, QueryOptions } from '@/app/lib/types/database';

const cacheEntry: CacheEntry<MarketData> = {
  key: 'market-data:AAPL',
  value: marketData,
  expiresAt: '2026-02-07T12:00:00.000Z',
  createdAt: '2026-02-07T11:00:00.000Z',
};

const queryOptions: QueryOptions = {
  index: 'symbol',
  range: ['AAPL', 'MSFT'],
  limit: 100,
  direction: 'next',
};
```

### 外部API型 (`external.ts`)

外部APIプロバイダーとの連携の型定義を含みます。

#### 主要な型

- `ExternalApiProvider`: 外部APIプロバイダーの列挙型
- `AlphaVantageResponse`: Alpha Vantage APIレスポンス型
- `AlphaVantageOHLCV`: Alpha Vantage OHLCVデータ型
- `YahooFinanceResponse`: Yahoo Finance APIレスポンス型
- `YahooFinanceMeta`: Yahoo Financeメタデータ型
- `PolygonIOResponse`: Polygon.io APIレスポンス型
- `IEXCloudResponse`: IEX Cloud APIレスポンス型
- `FinnhubResponse`: Finnhub APIレスポンス型
- `BinanceResponse`: Binance APIレスポンス型
- `ExternalApiConfig`: 外部API設定型
- `ExternalApiRequest`: 外部APIリクエスト型
- `ExternalApiError`: 外部APIエラー型
- `RateLimitInfo`: APIレート制限情報型
- `ExternalApiResponse<T>`: 外部APIレスポンスの共通インターフェース
- `StockQuote`: 株価情報型
- `NewsArticle`: ニュース記事型
- `EconomicIndicator`: 経済指標型
- `CompanyFinancials`: 企業財務データ型
- `ExternalApiCacheEntry<T>`: 外部APIキャッシュエントリ型

#### 使用例

```typescript
import type { ExternalApiProvider, ExternalApiConfig, StockQuote } from '@/app/lib/types/external';

const config: ExternalApiConfig = {
  provider: ExternalApiProvider.ALPHA_VANTAGE,
  apiKey: 'your-api-key',
  baseUrl: 'https://www.alphavantage.co/query',
  timeout: 10000,
  rateLimit: {
    requestsPerMinute: 5,
    requestsPerDay: 500,
  },
  retryConfig: {
    maxRetries: 3,
    retryDelay: 1000,
  },
};

async function fetchStockQuote(symbol: string): Promise<StockQuote> {
  const response = await fetch(`/api/external/stock/${symbol}`);
  return response.json();
}
```

### 共通型 (`common.ts`)

トレードシグナル、マーケットデータ、予測結果、アラートなどの共通型定義を含みます。

#### 主要な型

- `TradeSignal`: トレードシグナル型
- `MarketData`: マーケットデータ型
- `PredictionResult`: 予測結果型
- `Alert`: アラート型
- `AlertCondition`: アラート条件型
- `Position`: ポジション型
- `Trade`: 取引型
- `Portfolio`: ポートフォリオ型
- `Stock`: 株式情報型
- `IndicatorValue`: インジケーター値型
- `TechnicalIndicators`: テクニカルインジケーター型
- `MarketContext`: マーケットコンテキスト型
- `RiskMetrics`: リスクメトリクス型
- `PerformanceMetrics`: パフォーマンスメトリクス型
- `ErrorResponse`: エラーレスポンス型
- `SuccessResponse<T>`: 成功レスポンス型
- `Response<T>`: 汎用レスポンス型
- `StockInfo`: ストック情報型（拡張）
- `Signal`: シグナル型
- `WatchlistEntry`: ウォッチリストエントリ型
- `ScreenerResult`: スクリーニング結果型

#### 使用例

```typescript
import type { TradeSignal, MarketData, PredictionResult, Alert } from '@/app/lib/types/common';

const signal: TradeSignal = {
  type: 'BUY',
  confidence: 85,
  symbol: 'AAPL',
  timestamp: '2026-02-07T11:00:00.000Z',
  targetPrice: 175,
  stopLoss: 170,
  timeframe: '1d',
  source: 'ML',
  metadata: {
    model: 'RandomForest',
    features: {
      rsi: 65,
      macd: 0.5,
    },
  },
};

const marketData: MarketData = {
  symbol: 'AAPL',
  name: 'Apple Inc.',
  market: 'us',
  price: 174.50,
  change: 1.25,
  changePercent: 0.72,
  volume: 50000000,
  high: 175.00,
  low: 173.50,
  open: 174.00,
  previousClose: 173.25,
  marketCap: 2800000000000,
  timestamp: '2026-02-07T11:00:00.000Z',
};

const prediction: PredictionResult = {
  symbol: 'AAPL',
  prediction: 'UP',
  confidence: 75,
  targetPrice: 180,
  timeframe: '1d',
  timestamp: '2026-02-07T11:00:00.000Z',
  model: 'RandomForest',
  features: {
    rsi: 65,
    macd: 0.5,
    volume: 50000000,
  },
  metadata: {
    version: '1.0.0',
  },
};

const alert: Alert = {
  id: 'alert-123',
  type: 'price',
  symbol: 'AAPL',
  condition: '>',
  value: 175,
  currentValue: 174.50,
  triggered: false,
  createdAt: '2026-02-07T11:00:00.000Z',
  severity: 'medium',
  acknowledged: false,
  metadata: {
    notes: 'Price above $175',
  },
};
```

## 型ガード関数

型ガード関数は、ランタイムで型をチェックし、TypeScriptの型システムに型情報を提供することで、型安全性を向上させます。

### 型ガード関数一覧

#### 基本型ガード

- `isArray<T>(value: unknown): value is T[]` - 配列チェック
- `isString(value: unknown): value is string` - 文字列チェック
- `isNumber(value: unknown): value is number` - 数値チェック
- `isBoolean(value: unknown): value is boolean` - ブール値チェック
- `isObject(value: unknown): value is Record<string, unknown>` - オブジェクトチェック（null以外）
- `isUndefined(value: unknown): value is undefined` - undefinedチェック
- `isNull(value: unknown): value is null` - nullチェック
- `isFunction(value: unknown): value is Function` - 関数チェック
- `isDate(value: unknown): value is Date` - Dateオブジェクトチェック

#### データ型ガード

- `isOHLCV(value: unknown): value is OHLCV` - OHLCVデータの型チェック
- `isOHLCVArray(value: unknown): value is OHLCV[]` - OHLCV配列の型チェック
- `isSignal(value: unknown): value is Signal` - シグナル型のチェック
- `isTechnicalIndicators(value: unknown): value is TechnicalIndicators` - テクニカル指標の型チェック
- `isAlertCondition(value: unknown): value is AlertCondition` - アラート条件の型チェック
- `isAlertRule(value: unknown): value is { conditions: AlertCondition[]; operator: 'AND' | 'OR' }` - アラートルールの型チェック

#### API型ガード

- `isApiResponse(data: unknown): data is ApiResponse` - APIレスポンスの型ガード
- `isUserCredentials(data: unknown): data is UserCredentials` - ユーザー認証情報の型ガード
- `isUserProfile(data: unknown): data is UserProfile` - ユーザープロファイルの型ガード

#### トレード型ガード

- `isTradeSignal(data: unknown): data is TradeSignal` - トレードシグナルの型ガード
- `isMarketData(data: unknown): data is MarketData` - マーケットデータの型ガード
- `isPredictionResult(data: unknown): data is PredictionResult` - 予測結果の型ガード
- `isAlert(data: unknown): data is Alert` - アラートの型ガード
- `isPosition(data: unknown): data is Position` - ポジションの型ガード
- `isTrade(data: unknown): data is Trade` - 取引の型ガード
- `isStock(data: unknown): data is Stock` - 株式情報の型ガード
- `isOHLCVStrict(data: unknown): data is OHLCV` - OHLCVデータの厳密な型チェック

#### ユーティリティ型ガード

- `isInteger(value: unknown): value is number` - 整数チェック
- `isPositiveNumber(value: unknown): value is number` - 正の数チェック
- `isNonNegativeNumber(value: unknown): value is number` - 非負の数チェック
- `isSymbol(value: unknown): value is string` - シンボル文字列チェック（取引シンボル形式）
- `isTimestamp(value: unknown): value is number` - タイムスタンプ（ミリ秒）チェック

#### 高度な型ガード

- `isError(value: unknown): value is Error` - エラーオブジェクトチェック
- `isPromise<T>(value: unknown): value is Promise<T>` - Promiseチェック
- `isMap<K, V>(value: unknown): value is Map<K, V>` - Mapオブジェクトチェック
- `isSet<T>(value: unknown): value is Set<T>` - Setオブジェクトチェック
- `hasNumericProperties(value: unknown, properties: string[]): value is Record<string, number>` - 数値プロパティのチェック
- `hasRequiredFields<T extends Record<string, unknown>>(value: unknown, requiredFields: (keyof T)[]): value is T` - 必須フィールドのチェック
- `isEnumValue<T extends readonly string[]>(value: unknown, enumValues: T): value is T[number]` - 列挙型の値チェック

#### ユーティリティ関数

- `shallowClone<T extends object>(obj: T): T` - 深度1の浅いコピー（型安全）
- `getObjectKeys<T extends object>(obj: T): (keyof T)[]` - オブジェクトのキーを文字列配列として取得
- `getObjectValues<T extends object>(obj: T): T[keyof T][]` - オブジェクトの値を型安全に取得

#### 使用例

```typescript
import {
  isApiResponse,
  isTradeSignal,
  isMarketData,
  isPredictionResult,
  isAlert,
  isPosition,
  isTrade,
  isStock,
  isOHLCVStrict,
  isNumber,
  isString,
  isObject,
  isArray,
  hasRequiredFields,
} from '@/app/lib/utils/typeGuards';

// APIレスポンスの型チェック
const response = await fetch('/api/data');
const data = await response.json();

if (isApiResponse(data)) {
  console.log('API Response:', data);
  if (data.success) {
    console.log('Data:', data.data);
  } else {
    console.error('Error:', data.error);
  }
}

// トレードシグナルの型チェック
const signal = { type: 'BUY', confidence: 85, symbol: 'AAPL', timestamp: '2026-02-07T11:00:00.000Z' };

if (isTradeSignal(signal)) {
  console.log('Valid trade signal:', signal);
}

// マーケットデータの型チェック
const marketData = { symbol: 'AAPL', market: 'us', price: 174.50, change: 1.25, changePercent: 0.72, volume: 50000000, high: 175.00, low: 173.50, open: 174.00, previousClose: 173.25, marketCap: 2800000000000, timestamp: '2026-02-07T11:00:00.000Z' };

if (isMarketData(marketData)) {
  console.log('Valid market data:', marketData);
}

// 予測結果の型チェック
const prediction = { symbol: 'AAPL', prediction: 'UP', confidence: 75, targetPrice: 180, timeframe: '1d', timestamp: '2026-02-07T11:00:00.000Z', model: 'RandomForest' };

if (isPredictionResult(prediction)) {
  console.log('Valid prediction result:', prediction);
}

// アラートの型チェック
const alert = { id: 'alert-123', type: 'price', symbol: 'AAPL', condition: '>', value: 175, triggered: false, createdAt: '2026-02-07T11:00:00.000Z', severity: 'medium' };

if (isAlert(alert)) {
  console.log('Valid alert:', alert);
}

// ポジションの型チェック
const position = { symbol: 'AAPL', side: 'LONG', quantity: 100, avgPrice: 170, openedAt: '2026-02-07T11:00:00.000Z' };

if (isPosition(position)) {
  console.log('Valid position:', position);
}

// 取引の型チェック
const trade = { symbol: 'AAPL', type: 'BUY', quantity: 100, price: 170, timestamp: '2026-02-07T11:00:00.000Z' };

if (isTrade(trade)) {
  console.log('Valid trade:', trade);
}

// 株式情報の型チェック
const stock = { symbol: 'AAPL', market: 'us' };

if (isStock(stock)) {
  console.log('Valid stock:', stock);
}

// OHLCVデータの厳密な型チェック
const ohlcv = { date: '2026-02-07', open: 174.00, high: 175.00, low: 173.50, close: 174.50, volume: 50000000 };

if (isOHLCVStrict(ohlcv)) {
  console.log('Valid OHLCV data:', ohlcv);
}

// 基本型ガードの使用例
if (isNumber(175.50)) {
  console.log('Valid number:', 175.50);
}

if (isString('AAPL')) {
  console.log('Valid string:', 'AAPL');
}

if (isObject({ symbol: 'AAPL' })) {
  console.log('Valid object:', { symbol: 'AAPL' });
}

if (isArray([1, 2, 3])) {
  console.log('Valid array:', [1, 2, 3]);
}

// 必須フィールドのチェック
const data = { symbol: 'AAPL', price: 174.50 };

if (hasRequiredFields<{ symbol: string; price: number }>(data, ['symbol', 'price'])) {
  console.log('Data has required fields:', data);
}
```

## any型の移行チェックリスト

以下は、any型を使用している箇所を型安全なコードに移行するためのチェックリストです。

### Critical（優先度: 高）

- [x] APIレスポンスの型定義
- [x] ユーザー入力のバリデーション
- [x] データベース操作
- [x] 外部APIとの連携

### Medium（優先度: 中）

- [x] 内部データ構造
- [x] サービス層のインターフェース
- [x] コンポーネントのprops

### Low（優先度: 低）

- [ ] 一時的な変数
- [ ] デバッグ用コード
- [ ] テストコード

## ベストプラクティス

### 型安全性の向上

1. **any型の使用を避ける**: 代わりに具体的な型またはジェネリクスを使用してください
2. **型ガード関数を使用する**: ランタイムで型をチェックする必要がある場合、型ガード関数を使用してください
3. **unknown型を使用する**: 型が不明な場合、any型の代わりにunknown型を使用してください
4. **型アサーションを使用する**: 型キャストが必要な場合、型アサーションを使用してください

### 型定義の作成

1. **再利用可能な型を作成する**: 共通の型定義を作成し、再利用してください
2. **ジェネリクスを使用する**: 汎用的な型定義にはジェネリクスを使用してください
3. **型エイリアスを使用する**: 複雑な型には型エイリアスを使用してください
4. **ユニオン型を使用する**: 複数の型を許可する場合、ユニオン型を使用してください

### ドキュメント

1. **JSDocコメントを追加する**: すべての型定義にJSDocコメントを追加してください
2. **使用例を提供する**: 型定義の使用例を提供してください
3. **変更履歴を記録する**: 型定義の変更履歴を記録してください

## 関連リソース

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript Deep Dive](https://basarat.gitbooks.io/typescript/)
- [TypeScript Type Guards](https://www.typescriptlang.org/docs/handbook/advanced-types.html#type-guards-and-type-predicates)

## 変更履歴

- 2026-02-07: REFACTOR-002の実行により型定義システムを作成
