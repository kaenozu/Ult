# TypeScript型安全性向上スキル

## 概要

TypeScript型エラーの解消と型安全性の向上に関する知見とパターン。

## よくある型エラーと解決策

### 1. unknown型の扱い

**問題**:
```typescript
try {
  await operation();
} catch (err) {
  // Error: 'err' is of type 'unknown'
  logger.error('Failed', err);
}
```

**解決策パターン**:

```typescript
// パターン1: 型ガード関数
function isError(value: unknown): value is Error {
  return value instanceof Error;
}

try {
  await operation();
} catch (err) {
  const error = isError(err) ? err : new Error(String(err));
  logger.error('Failed', error);
}

// パターン2: インライン型ガード
try {
  await operation();
} catch (err) {
  const error = err instanceof Error ? err : new Error(String(err));
  logger.error('Failed', error);
}

// パターン3: カスタムエラー型
try {
  await operation();
} catch (err) {
  const error = err instanceof Error ? err : new Error(String(err));
  throw new AppError('OPERATION_FAILED', error.message, error);
}
```

### 2. DOMException | nullの処理

**問題**:
```typescript
request.onerror = () => {
  // Error: Type 'DOMException | null' is not assignable to parameter of type 'Error | undefined'
  logger.error('Failed', request.error);
  reject(request.error);
};
```

**解決策**:
```typescript
request.onerror = () => {
  // Null合体演算子でデフォルト値を提供
  const error = request.error ?? new Error('IndexedDB operation failed');
  logger.error('Failed', error);
  reject(error);
};
```

### 3. 型の不一致

**問題**:
```typescript
// Type 'Position[]' is not assignable to type 'StoredPosition[]'
async getPositions(): Promise<Position[]> {
  return store.getAll(); // Position[]を返すが、StoredPosition[]が期待される
}
```

**解決策**:
```typescript
// 戻り値の型を修正
async getPositions(): Promise<StoredPosition[]> {
  return store.getAll();
}
```

### 4. any型の削減

**段階的な移行アプローチ**:

```typescript
// ステップ1: anyをunknownに変更
function processData(data: unknown) {
  // 型チェック必須
  if (typeof data === 'string') {
    return data.toUpperCase();
  }
}

// ステップ2: 具体的な型を定義
interface DataPayload {
  value: string;
  timestamp: number;
}

function processData(data: DataPayload) {
  return data.value.toUpperCase();
}

// ステップ3: ジェネリクスの活用
function processData<T extends { value: string }>(data: T) {
  return data.value.toUpperCase();
}
```

## 型安全性チェックリスト

### コードレビュー時の確認項目

- [ ] `any`型が妥当か、より具体的な型にできるか
- [ ] `unknown`型が適切に型ガードされているか
- [ ] エラーハンドリングで`unknown`が`Error`に変換されているか
- [ ] Null/undefinedの可能性を考慮しているか
- [ ] 配列の型が正しいか（T[] vs ReadonlyArray<T>）
- [ ] 関数の戻り値の型が明示されているか

### ビルド前の確認

```bash
# 型チェック
npx tsc --noEmit

# ESLintの型関連ルール
npx eslint --rule '@typescript-eslint/no-explicit-any: error' .
npx eslint --rule '@typescript-eslint/no-unsafe-assignment: error' .
```

## 高度な型テクニック

### ブランド型（Branded Types）

```typescript
// プリミティブ型の混乱を防ぐ
type UserId = string & { __brand: 'UserId' };
type OrderId = string & { __brand: 'OrderId' };

function getUser(id: UserId) { }
function getOrder(id: OrderId) { }

// 誤った使用はコンパイルエラー
getUser(orderId); // Error
```

### タグ付きユニオン（Tagged Unions）

```typescript
interface BuySignal {
  type: 'BUY';
  targetPrice: number;
}

interface SellSignal {
  type: 'SELL';
  stopLoss: number;
}

type Signal = BuySignal | SellSignal;

function processSignal(signal: Signal) {
  switch (signal.type) {
    case 'BUY':
      return signal.targetPrice; // TypeScriptがnarrowing
    case 'SELL':
      return signal.stopLoss;
  }
}
```

### 条件付き型

```typescript
type NonNullable<T> = T extends null | undefined ? never : T;

type StringOrNumber<T> = T extends string ? string : number;
```

## 実装パターン

### 安全なAPIクライアント

```typescript
interface ApiResponse<T> {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
}

async function apiCall<T>(url: string): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { success: false, error: response.statusText };
    }
    const data = await response.json();
    return { success: true, data };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return { success: false, error: error.message };
  }
}
```

### 型安全なストア

```typescript
interface State {
  user: User | null;
  isLoading: boolean;
}

type Action =
  | { type: 'SET_USER'; payload: User }
  | { type: 'CLEAR_USER' }
  | { type: 'SET_LOADING'; payload: boolean };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'CLEAR_USER':
      return { ...state, user: null };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state; // Exhaustiveness checking
  }
}
```

## ツールと設定

### tsconfig.json推奨設定

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### ESLint設定

```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unsafe-assignment": "error",
    "@typescript-eslint/no-unsafe-member-access": "error",
    "@typescript-eslint/no-unsafe-call": "error",
    "@typescript-eslint/no-unsafe-return": "error"
  }
}
```

## 実績

| 指標 | 改善前 | 改善後 | 変化 |
|------|--------|--------|------|
| TypeScriptスコア | 6.5/10 | 6.8/10 | +0.3 |
| any型使用箇所 | 140件 | 120件 | -20件 |
| 型エラー | 15件 | 0件 | -15件 |

## 関連リソース

- [TypeScript Handbook - Advanced Types](https://www.typescriptlang.org/docs/handbook/advanced-types.html)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [Total TypeScript](https://www.totaltypescript.com/)
