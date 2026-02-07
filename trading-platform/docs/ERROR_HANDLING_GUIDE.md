# エラーハンドリング統一ガイド

## 概要

> **補足**: 2026年2月に WebSocket ベースの接続は撤去され、本ドキュメントに含まれる WebSocket に関する言及は過去の設計参考となっています。以降は HTTP/REST API を前提にしたエラー処理を中心にしています。

このドキュメントでは、ULT Trading Platformにおける統一されたエラーハンドリング戦略について説明します。

## Result型パターン

### 基本概念

Result型は、関数の成功または失敗を明示的に表現する型安全なパターンです。例外のthrow/catchの代わりにResult型を使用することで、以下の利点があります：

1. **型安全性**: コンパイル時にエラーハンドリングの漏れを検出
2. **明示的**: エラーが発生する可能性があることがシグネチャで明確
3. **合成可能**: map/flatMapでエラーハンドリングをチェーン可能
4. **予測可能**: 例外による予期しない処理の中断がない

### 型定義

```typescript
type Result<T, E = TradingError> = Ok<T, E> | Err<T, E>;

class Ok<T, E> {
  readonly isOk = true;
  readonly isErr = false;
  readonly value: T;
}

class Err<T, E> {
  readonly isOk = false;
  readonly isErr = true;
  readonly error: E;
}
```

### 基本的な使用方法

#### 1. Result型を返す関数の作成

```typescript
import { Result, ok, err, AppError } from '@/app/lib/errors';

function divide(a: number, b: number): Result<number, AppError> {
  if (b === 0) {
    return err(new AppError('Division by zero', 'DIVISION_ERROR'));
  }
  return ok(a / b);
}
```

#### 2. Result型の処理

```typescript
const result = divide(10, 2);

// パターン1: isOk/isErrで分岐
if (result.isOk) {
  console.log('Result:', result.value);
} else {
  console.error('Error:', result.error.message);
}

// パターン2: mapで変換
const doubled = result.map(x => x * 2);

// パターン3: flatMapでチェーン
const chained = result
  .flatMap(x => divide(x, 2))
  .flatMap(x => divide(x, 3));

// パターン4: unwrapOrでデフォルト値
const value = result.unwrapOr(0);
```

### 非同期処理での使用

```typescript
import { tryCatchAsync } from '@/app/lib/errors';

async function fetchData(url: string): Promise<Result<Data, AppError>> {
  return tryCatchAsync(
    async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    },
    (error) => new AppError(
      `Failed to fetch data: ${error}`,
      'FETCH_ERROR',
      'high'
    )
  );
}
```

## 実装済みサービス

### 1. MLModelService

**変更箇所:**
- `predictAsync()`: Result<ModelPrediction, AppError>を返す
- `loadModels()`: Result<void, AppError>を返す

**使用例:**
```typescript
const result = await mlModelService.predictAsync(features);

if (result.isOk) {
  const prediction = result.value;
  console.log('Prediction:', prediction.ensemblePrediction);
} else {
  // エラーハンドリング
  console.error('Prediction failed:', result.error.message);
  // フォールバック処理
  const fallback = mlModelService.predict(features);
}
```

### 2. AccuracyService

**変更箇所:**
- `calculateRealTimeAccuracy()`: Result<AccuracyMetrics, DataError>を返す

**Before (null返却):**
```typescript
const accuracy = accuracyService.calculateRealTimeAccuracy(symbol, data);
if (!accuracy) {
  // nullチェック
  console.error('Insufficient data');
  return;
}
```

**After (Result型):**
```typescript
const result = accuracyService.calculateRealTimeAccuracy(symbol, data);
if (result.isErr) {
  // エラーの詳細情報が利用可能
  console.error('Error:', result.error.message);
  console.error('Symbol:', result.error.symbol);
  return;
}
const accuracy = result.value;
```

## エラーの種類

### TradingError階層

```
TradingError (基底クラス)
├── AppError (アプリケーション汎用エラー)
├── ApiError (API関連エラー)
├── NetworkError (ネットワークエラー)
├── DataError (データ関連エラー)
│   ├── NotFoundError (未検出エラー)
│   └── DataNotAvailableError (データ利用不可)
├── ValidationError (バリデーションエラー)
├── TradingOperationError (取引関連エラー)
├── SystemError (システムエラー)
└── TimeoutError (タイムアウトエラー)
```

### エラーコード

各エラーには一意のコードが付与されます：

- `API_ERROR`: API呼び出し失敗
- `NETWORK_ERROR`: ネットワーク接続エラー
- `DATA_ERROR`: データ処理エラー
- `VALIDATION_ERROR`: 入力検証エラー
- `ML_PREDICTION_ERROR`: ML予測エラー
- `MODEL_LOAD_ERROR`: モデル読み込みエラー

## 移行ガイド

### パターン1: try-catchからの移行

**Before:**
```typescript
try {
  const result = calculateSomething();
  return result;
} catch (error) {
  console.error(error);
  return null; // または throw
}
```

**After:**
```typescript
import { tryCatch, AppError } from '@/app/lib/errors';

function calculateSomething(): Result<number, AppError> {
  return tryCatch(
    () => {
      // 計算処理
      return result;
    },
    (error) => new AppError(
      `Calculation failed: ${error}`,
      'CALCULATION_ERROR'
    )
  );
}
```

### パターン2: null返却からの移行

**Before:**
```typescript
function process(data: Data): Result | null {
  if (!isValid(data)) {
    return null;
  }
  return processData(data);
}
```

**After:**
```typescript
import { Result, ok, err, ValidationError } from '@/app/lib/errors';

function process(data: Data): Result<ProcessedData, ValidationError> {
  if (!isValid(data)) {
    return err(new ValidationError('data', 'Invalid data format'));
  }
  return ok(processData(data));
}
```

### パターン3: エラー再スローからの移行

**Before:**
```typescript
async function fetchAndProcess(): Promise<Data> {
  try {
    const data = await fetchData();
    return processData(data);
  } catch (error) {
    throw new Error('Failed to fetch and process');
  }
}
```

**After:**
```typescript
async function fetchAndProcess(): Promise<Result<Data, AppError>> {
  const fetchResult = await fetchData();
  if (fetchResult.isErr) {
    return fetchResult;
  }
  
  return tryCatch(
    () => processData(fetchResult.value),
    (error) => new AppError(`Processing failed: ${error}`, 'PROCESS_ERROR')
  );
}
```

## ベストプラクティス

### 1. 常にエラーの可能性を明示する

```typescript
// Good: 戻り値の型でエラーの可能性を示す
function parse(input: string): Result<ParsedData, ValidationError>

// Bad: 例外をthrowする（呼び出し側がエラーに気づきにくい）
function parse(input: string): ParsedData
```

### 2. 適切なエラー型を使用する

```typescript
// Good: 具体的なエラー型
function loadModel(): Result<Model, AppError>
function fetchData(): Result<Data, NetworkError>

// Bad: 汎用的すぎる
function loadModel(): Result<Model, Error>
```

### 3. エラーメッセージは詳細に

```typescript
// Good: コンテキストを含む
return err(new AppError(
  `Failed to load model from ${path}: ${originalError.message}`,
  'MODEL_LOAD_ERROR',
  'high'
));

// Bad: 詳細がない
return err(new AppError('Error'));
```

### 4. mapとflatMapを活用する

```typescript
// Good: チェーン可能
const result = fetchData()
  .map(data => transform(data))
  .flatMap(transformed => validate(transformed))
  .map(valid => process(valid));

// Bad: ネストした分岐
const fetchResult = await fetchData();
if (fetchResult.isErr) return fetchResult;
const transformResult = transform(fetchResult.value);
// ...
```

### 5. 適切なフォールバック戦略

```typescript
// Good: エラー時の代替処理を用意
const result = await predictWithML();
if (result.isErr) {
  logError(result.error, 'ML prediction');
  return ok(predictWithRuleBased()); // フォールバック
}

// Bad: エラーを無視
const result = await predictWithML();
// エラーチェックなし
```

## テストでの使用

### Result型のテスト

```typescript
describe('divide', () => {
  it('should return Ok for valid division', () => {
    const result = divide(10, 2);
    
    expect(result.isOk).toBe(true);
    if (result.isOk) {
      expect(result.value).toBe(5);
    }
  });
  
  it('should return Err for division by zero', () => {
    const result = divide(10, 0);
    
    expect(result.isErr).toBe(true);
    if (result.isErr) {
      expect(result.error.code).toBe('DIVISION_ERROR');
      expect(result.error.message).toContain('Division by zero');
    }
  });
});
```

## 今後の展開

### Phase 3: 追加のサービスへの適用

以下のサービスへのResult型適用を検討：

1. **MarketDataService**: API呼び出しのエラーハンドリング
2. **TechnicalIndicatorService**: 計算エラーのハンドリング

### Phase 4: React統合

Reactコンポーネントでの使用パターン：

```typescript
function Component() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    fetchData().then(result => {
      if (result.isOk) {
        setData(result.value);
        setError(null);
      } else {
        setData(null);
        setError(result.error.message);
      }
    });
  }, []);
  
  // ...
}
```

## まとめ

Result型パターンの導入により、以下が実現されました：

1. ✅ **型安全性の向上**: コンパイル時にエラーハンドリングの漏れを検出
2. ✅ **エラーの明示化**: 関数シグネチャでエラーの可能性が明確
3. ✅ **統一されたエラー処理**: console.log、throw、nullの混在を解消
4. ✅ **豊富なエラー情報**: エラーコード、重要度、コンテキスト情報
5. ✅ **合成可能**: map/flatMapによる関数型プログラミング

このパターンを継続的に適用し、より堅牢で保守しやすいコードベースを構築していきます。
