# エラーハンドリングガイド

ULT Trading Platformの統一エラーハンドリングシステムについてのドキュメントです。

## 概要

このドキュメントでは、[`trading-platform/app/lib/errors.ts`](../trading-platform/app/lib/errors.ts)で定義されているエラーハンドリングパターンを説明します。

## エラークラス階層

### 基底クラス

- **`TradingError`** - 全てのカスタムエラーの基底クラス
  - `code`: エラーコード
  - `severity`: エラー深刻度（'low' | 'medium' | 'high' | 'critical'）

### APIエラー

- **`ApiError`** - API関連エラー
- **`NetworkError`** - ネットワークエラー
- **`RateLimitError`** - レート制限エラー
- **`AuthenticationError`** - 認証エラー

### バリデーションエラー

- **`ValidationError`** - バリデーションエラー
- **`InputError`** - 入力値エラー

### データエラー

- **`DataError`** - データ関連エラー
- **`NotFoundError`** - シンボル/リソース未検出エラー
- **`DataNotAvailableError`** - データ利用不可エラー

### トレーディングエラー

- **`TradingOperationError`** - 取引関連エラー
- **`OrderError`** - 注文エラー
- **`RiskManagementError`** - リスク管理エラー

### システムエラー

- **`SystemError`** - システムエラー
- **`TimeoutError`** - タイムアウトエラー
- **`ConfigurationError`** - 設定エラー

## Result型

Rust風のResult型で成功/失敗を表現します。

### 基本的な使用法

```typescript
import { ok, err, isOk, isErr, Result } from '@/app/lib/errors';

// 成功結果の生成
const successResult: Result<number, Error> = ok(42);

// 失敗結果の生成
const errorResult: Result<number, Error> = err(new Error('Something went wrong'));

// 結果のチェック
if (isOk(successResult)) {
  console.log(successResult.value); // 42
}

if (isErr(errorResult)) {
  console.error(errorResult.error); // Error: Something went wrong
}
```

### メソッド

- `map<U>(fn: (value: T) => U)` - 成功値をマップ
- `flatMap<U>(fn: (value: T) => Result<U, E>)` - 連鎖的な処理
- `mapErr<F>(fn: (error: E) => F)` - エラーをマップ
- `unwrap()` - 値を取得（失敗時はthrow）
- `unwrapOr(defaultValue: T)` - デフォルト値を取得
- `unwrapOrThrow()` - 失敗時はthrow

### ユーティリティ関数

```typescript
import { ok, err, isOk, isErr, combineResults, tryCatch, tryCatchAsync } from '@/app/lib/errors';

// 複数Resultsを結合
const results: Result<number, Error>[] = [ok(1), ok(2), ok(3)];
const combined = combineResults(results); // Result<number[], Error>

// try-catchをResultに変換
const result = tryCatch(
  () => JSON.parse(input),
  (e) => new Error(`Parse error: ${e}`)
);

// 非同期版
const asyncResult = await tryCatchAsync(
  async () => await fetchData(),
  (e) => new Error(`Fetch error: ${e}`)
);
```

## エラーハンドリングユーティリティ

### エラーをTradingErrorにラップ

```typescript
import { handleError } from '@/app/lib/errors';

try {
  // 何らかの処理
} catch (error) {
  const tradingError = handleError(error, 'MyOperation');
  // handleError handles different error types:
  // - TradingError: returns as-is
  // - Error: wraps in AppError
  // - string: creates AppError with the string
  // - unknown: creates generic AppError
}
```

### エラーログ出力

```typescript
import { logError } from '@/app/lib/errors';

try {
  // 何らかの処理
} catch (error) {
  logError(error, 'OrderProcessing');
}
```

### ユーザー向けエラーメッセージ

```typescript
import { getUserErrorMessage } from '@/app/lib/errors';

const message = getUserErrorMessage(error);
// Returns user-friendly message in Japanese
```

### エラーハンドリングラッパー

```typescript
import { withErrorHandling, withErrorHandlingSync } from '@/app/lib/errors';

// 非同期関数用
const result = await withErrorHandling(
  async () => await someAsyncOperation(),
  'MyOperation'
);
// Returns: { data: T | null, error: TradingError | null, success: boolean }

// 同期関数用
const syncResult = withErrorHandlingSync(
  () => someSyncOperation(),
  'MyOperation'
);
```

## 型ガード

```typescript
import { 
  isTradingError, 
  isApiError, 
  isNetworkError, 
  isValidationError, 
  isNotFoundError 
} from '@/app/lib/errors';

if (isApiError(error)) {
  console.log('API Error:', error.statusCode, error.endpoint);
}

if (isValidationError(error)) {
  console.log('Validation error on field:', error.field);
}
```

## 後方互換性

レガシーエラークラスは非推奨(`@deprecated`)として引き続きエクスポートされています：

- `APIError` → `ApiError` を使用
- `ConnectionError` → `NetworkError` を使用
- `StrategyError` → `TradingOperationError` を使用
- `ExecutionError` → `TradingOperationError` を使用
- `PositionLimitError` → `RiskManagementError` を使用
- `DrawdownLimitError` → `RiskManagementError` を使用
- `CapitalLimitError` → `RiskManagementError` を使用
- `ResourceLimitError` → `SystemError` を使用
- `SymbolNotFoundError` → `NotFoundError` を使用

## 使用例

### APIサービスでの使用

```typescript
import { ApiError, NetworkError, withErrorHandling } from '@/app/lib/errors';

async function fetchStockData(symbol: string) {
  return withErrorHandling(
    async () => {
      const response = await fetch(`/api/stocks/${symbol}`);
      if (!response.ok) {
        throw new ApiError(
          'Failed to fetch stock data',
          `/api/stocks/${symbol}`,
          response.status
        );
      }
      return response.json();
    },
    'FetchStockData'
  );
}
```

### バリデーションでの使用

```typescript
import { ValidationError } from '@/app/lib/errors';

function validatePrice(price: number) {
  if (price <= 0) {
    throw new ValidationError(
      'price',
      'Price must be positive',
      'medium'
    );
  }
}
```

### リスク管理での使用

```typescript
import { RiskManagementError, ok, err } from '@/app/lib/errors';

function checkRiskLimit(position: Position): Result<void, RiskManagementError> {
  if (position.size > MAX_POSITION_SIZE) {
    return err(new RiskManagementError(
      `Position size ${position.size} exceeds limit ${MAX_POSITION_SIZE}`,
      position.symbol
    ));
  }
  return ok(undefined);
}
```

## ベストプラクティス

1. **新しいエラータイプを追加する場合**: `TradingError`を継承し、適切なメタデータを追加
2. **ユーザー向けメッセージ**: `getUserErrorMessage`を使用して、国際化されたメッセージを取得
3. **ロギング**: `logError`を使用して、统一されたフォーマットでログ出力
4. **Result型の使用**: `try-catch`の代わりにResult型を使用し、型安全なエラー処理を促進
