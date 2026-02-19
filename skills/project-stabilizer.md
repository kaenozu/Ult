---
name: project-stabilizer
description: Post-merge recovery and test stabilization specialist. Resolves inconsistencies after large merges and migrates to modern tech stack (TanStack Query, Zod, React 19).
version: 1.2.0
priority: high
auto_activate: true
---

# Project Stabilizer (プロジェクト安定化マスター)

大規模なマージや技術スタックの刷新後に、プロジェクトの健全性を迅速に回復し、最高水準のエンジニアリング品質を維持するための専門スキル。

Post-merge recovery and modernization specialist. Rapidly restores project health after large merges or tech stack updates, maintaining the highest engineering quality standards.

## 🎯 目的
- マージ後のテスト失敗や型エラーの迅速な解消。
- レガシーな状態管理からモダンな非同期状態管理（TanStack Query）への移行。
- React 19 および Next.js App Router に最適化されたコンポーネント設計の徹底。
- 実行時の型安全性（Zod）と環境変数の保護。

## 🛠 専門知識 (Expertise)

### 1. マージ後の不整合解決 (Post-Merge Recovery)
- **インメモリDBの統合**: 複数のAPIルートで独立していたインメモリ状態を `AuthStore` 等のシングルトンまたは共有ストアに統合し、テストの整合性を保つ。
- **テストデータの最適化**: 予測ロジック等の閾値判定が厳しい場合、現実的なエッジケース（V字回復等）をシグミュレートしたテストデータに調整する。
- **パッケージマネージャーの統一**: `pnpm` と `npm` の混在を検知し、プロジェクト標準（現在は `npm`）にロックファイルを強制的に一本化する。

### 2. モダン・データフェッチ (Modern Data Fetching)
- **useEffect から useQuery への移行**: 手動の `fetch` + `useState` を `TanStack Query` に置き換え、競合状態、二重発火、キャッシュ管理を一元化する。
- **Zod バリデーション**: APIレスポンスに対し、TypeScript の型定義だけでなく実行時のスキーマ検証を行い、不正なデータによるサイレントなクラッシュを防ぐ。

### 3. React 19 最適化
- **Side Effect のクリーンアップ**: Effect 内での同期的な `setState`（Cascading Renders）を排除し、`useTransition` や `useMemo`、または `useQuery` の状態移行を活用する。
- **Ref アクセスの適正化**: レンダリング中の `ref.current` へのアクセスを禁止し、Effect またはイベントハンドラ内でのみ処理する。

### 4. アーキテクチャの進化 (DDD)
- **ドメイン分離**: `app/lib` の肥大化を防ぐため、`app/features/[domain]` 構造を導入し、サービス、ストア、フックをドメインごとにカプセル化する。

## 📝 ワークフロー (Workflow)

### Step 1: 診断 (Diagnosis)
`npm test` と `npm run lint` を実行し、マージ後の「真の失敗数」を把握する。

**必須コマンド実行順序:**
```bash
cd trading-platform

# 1. 依存関係の状態確認
npm list --depth=0 2>&1 | grep -E "UNMET|missing" || echo "✓ Dependencies OK"

# 2. TypeScript 型チェック (最優先)
npx tsc --noEmit

# 3. ESLint 静的解析
npm run lint

# 4. ユニットテスト実行
npm test -- --passWithNoTests --coverage

# 5. ビルド検証
npm run build
```

**Expected Output - 健全な状態:**
```
✓ Dependencies OK
✓ TypeScript: 0 errors
✓ ESLint: 0 errors, 0 warnings
✓ Tests: 247 passed, 0 failed
✓ Coverage: 82.5% (above threshold)
✓ Build: completed in 45s
```

**Expected Output - 問題がある場合:**
```
✗ TypeScript: 15 errors found
  - app/lib/auth/AuthStore.ts(42,15): Property 'userId' does not exist
  - app/components/Login.tsx(28,3): Type 'string | undefined' is not assignable
  
✗ ESLint: 23 errors, 47 warnings
  - @typescript-eslint/no-explicit-any: 12 occurrences
  - react-hooks/exhaustive-deps: 11 warnings
  
✗ Tests: 198 passed, 49 failed
  - FAIL app/lib/__tests__/AuthService.test.ts
    ● AuthService › authenticates user
      expect(received).toBe(expected)
      Expected: true
      Received: undefined
      
✗ Coverage: 67.3% (below 80% threshold)
```

**診断チェックリスト:**
- [ ] 依存関係の競合がないか確認
- [ ] TypeScript エラーの箇所と種類を記録
- [ ] ESLint エラーのパターンを分類
- [ ] 失敗したテストの共通原因を特定
- [ ] ビルドエラーがあれば最優先で対処

#### 診断フローチャート (Diagnostic Decision Tree)

**エラーの種類ごとに具体的な対処手順を示します:**

##### TypeScript エラーのトラブルシューティング

```
TypeScript Error を検出したら、エラーメッセージのパターンで分類:

1. "Property 'X' does not exist on type 'Y'"
   ├─ Step 1: 該当プロパティの定義を確認
   │  $ grep -r "interface Y" app/ --include="*.ts"
   ├─ Step 2: プロパティが実際にエクスポートされているか確認
   │  $ grep -A 10 "interface Y" app/lib/types/index.ts
   └─ Step 3: インポートパスが正しいか確認
      $ grep "import.*Y" <error-file>.ts

2. "Type 'X' is not assignable to type 'Y'"
   ├─ Step 1: 両方の型定義を表示
   │  $ npx tsc --noEmit --explainFiles | grep -A 5 "type X\|type Y"
   ├─ Step 2: 型の互換性を確認
   │  - Xが部分型かどうかチェック (extends, implements)
   └─ Step 3: 型アサーションまたは型ガード追加
      // Option A: Type assertion (危険)
      const value = unknownValue as ExpectedType;
      
      // Option B: Type guard (安全)
      if (isExpectedType(unknownValue)) {
        // ここでは unknownValue は ExpectedType として扱われる
      }

3. "Cannot find module 'X' or its corresponding type declarations"
   ├─ Step 1: モジュールが実際に存在するか確認
   │  $ ls -la node_modules/X
   ├─ Step 2: package.json に記載されているか確認
   │  $ grep "\"X\"" package.json
   ├─ Step 3: パスエイリアスの設定を確認
   │  $ cat tsconfig.json | grep -A 5 "paths"
   └─ Step 4: 型定義ファイルのインストール
      $ npm install --save-dev @types/X

4. "Object is possibly 'undefined'"
   ├─ Step 1: Optional chaining を使用
   │  // Before: data.user.name
   │  // After: data?.user?.name
   ├─ Step 2: Non-null assertion (確実な場合のみ)
   │  // data!.user.name  // 危険: undefinedなら実行時エラー
   └─ Step 3: 型ガードで確認 (推奨)
      if (data && data.user) {
        console.log(data.user.name);
      }
```

**実行例: エラーメッセージから修正まで**
```bash
# エラー発生
$ npx tsc --noEmit
app/components/Dashboard.tsx(42,15): error TS2339: Property 'userId' does not exist on type 'User'

# Step 1: User型の定義を確認
$ grep -A 10 "interface User" app/lib/types/user.ts
interface User {
  id: string;        # ← 'userId' ではなく 'id'
  email: string;
  name: string;
}

# Step 2: Dashboard.tsx を修正
# Before: const id = user.userId;
# After:  const id = user.id;

# Step 3: 再チェック
$ npx tsc --noEmit
# ✓ No errors found
```

##### ESLint エラーのトラブルシューティング

```
ESLint Error を検出したら、ルール名で分類:

1. "@typescript-eslint/no-explicit-any"
   ├─ Step 1: any の使用箇所を特定
   │  $ grep -n "any" <file>.ts
   ├─ Step 2: 適切な型に置き換え
   │  // Before: data: any
   │  // After:  data: unknown (さらに型ガードで絞り込み)
   └─ Step 3: どうしても型が不明な場合
      // 理由をコメントで明記
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = unknownSource; // API仕様が不明なため暫定的にany使用

2. "react-hooks/exhaustive-deps"
   ├─ Step 1: 依存配列を確認
   │  $ grep -A 3 "useEffect" <file>.tsx
   ├─ Step 2: 不足している依存を追加
   │  useEffect(() => {
   │    fetchData(userId); // ← userId を依存配列に追加
   │  }, [userId]);
   └─ Step 3: 意図的に依存を省略する場合
      useEffect(() => {
        // マウント時のみ実行したい
        initializeApp();
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []); // 空配列は意図的

3. "no-unused-vars"
   ├─ Step 1: 実際に使われていない変数を削除
   │  // Before: const [data, setData] = useState(null);
   │  // After:  const [data] = useState(null); // setData は未使用
   └─ Step 2: 一時的に保持したい場合
      // 将来の実装のために保持
      // eslint-disable-next-line no-unused-vars
      const _reservedForFuture = data;
```

**実行例: 自動修正 + 手動修正**
```bash
# 現在のエラー数を確認
$ npm run lint
✖ 47 problems (23 errors, 24 warnings)
  12 errors and 5 warnings potentially fixable with the `--fix` option.

# 自動修正可能なものを修正
$ npm run lint:fix
✔ Fixed 17 problems

# 残りのエラーを確認
$ npm run lint
✖ 30 problems (6 errors, 24 warnings)

# 特定ファイルのエラーを詳細表示
$ npx eslint app/components/Dashboard.tsx
app/components/Dashboard.tsx
  42:15  error  Unexpected any  @typescript-eslint/no-explicit-any
  58:3   warn   Missing dependency: 'userId'  react-hooks/exhaustive-deps

# 修正後に再チェック
$ npm run lint
✔ No problems found!
```

##### テスト失敗のトラブルシューティング

```
Test Failure を検出したら、エラーメッセージで分類:

1. "expect(received).toBe(expected)"
   ├─ Step 1: 実際の値と期待値を比較
   │  Expected: true
   │  Received: undefined
   ├─ Step 2: undefined が返る原因を特定
   │  - 関数が値を返していない?
   │  - 非同期処理を待っていない?
   └─ Step 3: 修正方法を選択
      // Option A: await で非同期処理を待つ
      const result = await asyncFunction();
      
      // Option B: 関数が値を返すように修正
      function myFunction() {
        // Before: console.log(value);
        return value; // After: 値を返す
      }

2. "Timeout - Async callback was not invoked within the 5000ms"
   ├─ Step 1: 非同期処理に時間がかかりすぎていないか確認
   ├─ Step 2: waitFor を使用して待機
   │  await waitFor(() => {
   │    expect(screen.getByText('Success')).toBeInTheDocument();
   │  }, { timeout: 10000 });
   └─ Step 3: jest.config.js でタイムアウトを延長
      module.exports = {
        testTimeout: 10000, // デフォルト5000から10000に
      };

3. "Unable to find an element with the text: X"
   ├─ Step 1: 要素が実際にレンダリングされているか確認
   │  screen.debug(); // DOM全体を表示
   ├─ Step 2: テキストが非同期で表示される場合
   │  // Before: screen.getByText('X')
   │  // After:  await screen.findByText('X') // 要素が表示されるまで待機
   └─ Step 3: 部分一致やRole検索を試す
      screen.getByText(/X/i); // 大文字小文字を無視
      screen.getByRole('button', { name: /X/ });
```

**実行例: 失敗したテストの修正**
```bash
# テスト実行
$ npm test -- AuthService.test.ts
FAIL app/lib/__tests__/AuthService.test.ts
  ● AuthService › authenticates user
    expect(received).toBe(expected)
    Expected: true
    Received: undefined
    at Object.<anonymous> (AuthService.test.ts:42:23)

# Step 1: テストコードを確認
$ cat app/lib/__tests__/AuthService.test.ts | grep -A 5 "authenticates user"
test('authenticates user', () => {
  const result = authService.authenticate('test@example.com', 'password');
  expect(result).toBe(true); // ← undefined を受け取っている
});

# Step 2: AuthService の実装を確認
$ cat app/lib/AuthService.ts | grep -A 10 "authenticate"
authenticate(email: string, password: string) {
  const user = this.users.get(email);
  if (user && user.password === password) {
    this.currentUser = user;
    // ← return 文がない！
  }
}

# Step 3: 修正
# After: return user; を追加
authenticate(email: string, password: string): User | null {
  const user = this.users.get(email);
  if (user && user.password === password) {
    this.currentUser = user;
    return user; // ← 追加
  }
  return null;
}

# Step 4: 再テスト
$ npm test -- AuthService.test.ts
PASS app/lib/__tests__/AuthService.test.ts
  ✓ authenticates user (5 ms)
```

### Step 2: 基盤修復 (Base Fix)
認証や環境変数など、システムの根幹に関わる不整合を `AuthStore` や `env.ts` の導入により最優先で修正する。

**シナリオ 1: 分散した認証状態の統合**

**Before: Scattered authentication state**
```typescript
// ❌ Problem: 3箇所で独立した状態管理
// app/api/auth/route.ts
let currentUser: User | null = null; // API用の状態

// app/components/Login.tsx
const [user, setUser] = useState<User | null>(null); // UI用の状態

// app/lib/websocket/WebSocketService.ts
private authenticatedUser?: User; // WebSocket用の状態
```

**Issue:** テストで認証すると、APIは認証済みだがUIは未認証のまま。不整合によりテストが失敗する。

**After: Centralized AuthStore**
```typescript
// ✅ Solution: シングルトンで状態を一元管理
// app/lib/auth/AuthStore.ts
export class AuthStore {
  private static instance: AuthStore;
  private users = new Map<string, User>();
  private currentUser: User | null = null;
  
  static getInstance(): AuthStore {
    if (!AuthStore.instance) {
      AuthStore.instance = new AuthStore();
    }
    return AuthStore.instance;
  }
  
  register(user: User): void {
    this.users.set(user.email, user);
  }
  
  authenticate(email: string, password: string): User | null {
    const user = this.users.get(email);
    if (user && user.password === password) {
      this.currentUser = user;
      return user;
    }
    return null;
  }
  
  getCurrentUser(): User | null {
    return this.currentUser;
  }
  
  logout(): void {
    this.currentUser = null;
  }
  
  // テスト用: 完全リセット
  reset(): void {
    this.users.clear();
    this.currentUser = null;
  }
}

// app/lib/auth/index.ts
export const authStore = AuthStore.getInstance();
```

**Migration Steps:**
```bash
# 1. AuthStore を作成
touch app/lib/auth/AuthStore.ts

# 2. 既存のAPIルートを更新
# app/api/auth/route.ts を authStore を使うように書き換え

# 3. UIコンポーネントを更新
# useAuthStore() フックを作成してZustandで購読

# 4. テストでリセット処理を追加
# beforeEach(() => authStore.reset())

# 5. 検証
npm test -- AuthStore.test.ts
npm test -- Login.test.tsx
npm test -- auth
```

**シナリオ 2: 環境変数の実行時検証**

**Before: Runtime errors from missing env vars**
```typescript
// ❌ Problem: 実行時まで環境変数の不足に気づかない
// app/lib/api/AlphaVantageClient.ts
const API_KEY = process.env.ALPHA_VANTAGE_API_KEY; // undefined でも続行
const response = await fetch(`https://api.alphavantage.co/query?apikey=${API_KEY}`);
// 本番で "undefined" が送信されて失敗
```

**After: Type-safe environment validation**
```typescript
// ✅ Solution: 起動時に Zod で検証
// app/lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  ALPHA_VANTAGE_API_KEY: z.string().min(1, 'Alpha Vantage API key is required'),
  NEXT_PUBLIC_WS_URL: z.string().url('WebSocket URL must be valid'),
  NODE_ENV: z.enum(['development', 'test', 'production']),
});

export const env = envSchema.parse({
  ALPHA_VANTAGE_API_KEY: process.env.ALPHA_VANTAGE_API_KEY,
  NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  NODE_ENV: process.env.NODE_ENV,
});

// app/lib/api/AlphaVantageClient.ts
import { env } from '@/lib/env';

const response = await fetch(
  `https://api.alphavantage.co/query?apikey=${env.ALPHA_VANTAGE_API_KEY}`
);
// 型安全 + 起動時検証。undefined は絶対に来ない
```

**Verification:**
```bash
# 環境変数なしで起動すると即座にエラー
$ npm run dev

ZodError: [
  {
    "code": "too_small",
    "minimum": 1,
    "path": ["ALPHA_VANTAGE_API_KEY"],
    "message": "Alpha Vantage API key is required"
  }
]

# .env.local を設定後
$ npm run dev
✓ Ready on http://localhost:3000
```

### Step 3: UI/ロジックの安定化
壊れたコンポーネントのテストを、最新のライブラリ（RTL等）のパスに合わせて修正する。

**シナリオ 1: React 19 互換テストパターン**

**Before: Using old testing patterns**
```typescript
// ❌ Problem: React 18 のパターンが React 19 で警告
import { render } from '@testing-library/react';

test('renders component', () => {
  const { getByText } = render(<MyComponent />);
  expect(getByText('Hello')).toBeInTheDocument();
  // Warning: ReactDOM.render is no longer supported in React 19
});
```

**After: React 19 compatible patterns**
```typescript
// ✅ Solution: screen を使い、async/await で安定化
import { render, screen, waitFor } from '@testing-library/react';
import { expect, test } from '@jest/globals';

test('renders component with modern patterns', async () => {
  render(<MyComponent />);
  
  // findBy* は要素が表示されるまで待機
  const element = await screen.findByText('Hello');
  expect(element).toBeDefined();
  expect(element).toBeVisible();
});

test('handles async state updates', async () => {
  render(<MyComponent />);
  
  const button = screen.getByRole('button', { name: /click me/i });
  await userEvent.click(button);
  
  // 状態更新を待機
  await waitFor(() => {
    expect(screen.getByText('Clicked!')).toBeInTheDocument();
  });
});
```

**シナリオ 2: モックの最小化**

**Before: Over-mocked tests**
```typescript
// ❌ Problem: 実装の詳細をモック。リファクタリングで壊れる
jest.mock('@/lib/MarketDataService', () => ({
  MarketDataService: {
    getInstance: jest.fn(() => ({
      fetchStockData: jest.fn(() => Promise.resolve(mockData)),
      getCachedData: jest.fn(() => mockData),
      invalidateCache: jest.fn(),
    })),
  },
}));

test('displays stock price', async () => {
  render(<StockCard symbol="AAPL" />);
  await screen.findByText('$150.00');
  // テストはパスするが、実際のサービスの統合をテストしていない
});
```

**After: Integration-focused tests**
```typescript
// ✅ Solution: モックは外部依存のみ。内部ロジックは実際に実行
import { MarketDataService } from '@/lib/MarketDataService';

// 外部API呼び出しのみモック
jest.mock('@/lib/api/AlphaVantageClient', () => ({
  fetchFromAPI: jest.fn(() => Promise.resolve({
    '01. symbol': 'AAPL',
    '05. price': 150.00,
  })),
}));

test('displays stock price from real service', async () => {
  // 実際のサービスインスタンスを使用
  const service = MarketDataService.getInstance();
  
  render(<StockCard symbol="AAPL" />);
  
  // サービスの全ロジック（キャッシュ、変換等）を実行
  await waitFor(() => {
    expect(screen.getByText('$150.00')).toBeInTheDocument();
  });
  
  // キャッシュも実際に機能することを確認
  render(<StockCard symbol="AAPL" />);
  await screen.findByText('$150.00'); // キャッシュからのレンダリング
});
```

**シナリオ 3: useEffect の依存配列問題**

**Before: Infinite render loops**
```typescript
// ❌ Problem: オブジェクトを依存配列に入れると無限ループ
function useStockData(config: StockConfig) {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetchData(config).then(setData);
  }, [config]); // config は毎回新しいオブジェクト → 無限ループ
  
  return data;
}

// 呼び出し側
<StockChart config={{ symbol: 'AAPL', interval: '1D' }} />
```

**After: Stable dependencies or TanStack Query**
```typescript
// ✅ Solution 1: 依存配列を安定化
function useStockData(symbol: string, interval: string) {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetchData({ symbol, interval }).then(setData);
  }, [symbol, interval]); // プリミティブ値のみ
  
  return data;
}

// 呼び出し側
<StockChart symbol="AAPL" interval="1D" />

// ✅ Solution 2: TanStack Query で useEffect 不要
function useStockData(symbol: string, interval: string) {
  return useQuery({
    queryKey: ['stock', symbol, interval],
    queryFn: () => fetchData({ symbol, interval }),
    staleTime: 60000, // 1分間キャッシュ
  });
}

// 自動的にキャッシュ、再取得、エラー処理
const { data, isLoading, error } = useStockData('AAPL', '1D');
```

**Verification Steps:**
```bash
# 1. 個別コンポーネントテスト
npm test -- StockCard.test.tsx

# 2. 統合テスト
npm test -- integration/

# 3. カバレッジ確認
npm test -- --coverage --collectCoverageFrom="app/components/**/*.tsx"

# 4. ビジュアル確認（オプション）
npm run dev
# ブラウザで http://localhost:3000/test-components
```

### Step 4: モダン化 (Modernization)
修正した箇所を順次 TanStack Query や Zod を用いたベストプラクティスコードに昇華させる。

**Complete Migration Example: Manual fetch → TanStack Query + Zod**

**Before: Manual fetch with useEffect (問題が多い)**
```typescript
// ❌ Problems:
// 1. 競合状態: 連続クリックで古いレスポンスが上書き
// 2. キャッシュなし: 同じデータを何度も取得
// 3. エラー処理が不完全
// 4. ローディング状態の管理が複雑
// 5. 型安全性なし: API変更に気づかない

// app/components/StockDashboard.tsx
const [data, setData] = useState<any>(null); // any 型
const [loading, setLoading] = useState(true);
const [error, setError] = useState<Error | null>(null);

useEffect(() => {
  let cancelled = false;
  
  setLoading(true);
  setError(null);
  
  fetch('/api/stocks?symbol=AAPL')
    .then(res => res.json())
    .then(json => {
      if (!cancelled) {
        setData(json); // 型チェックなし
        setLoading(false);
      }
    })
    .catch(err => {
      if (!cancelled) {
        setError(err);
        setLoading(false);
      }
    });
  
  return () => { cancelled = true; };
}, []);

if (loading) return <div>Loading...</div>;
if (error) return <div>Error: {error.message}</div>;
if (!data) return null;

return <div>{data.price}</div>; // data.price が undefined でもエラーなし
```

**After: TanStack Query with Zod validation (ベストプラクティス)**

**Step 1: Define Zod schema**
```typescript
// app/lib/schemas/stock.ts
import { z } from 'zod';

export const StockDataSchema = z.object({
  symbol: z.string().min(1).max(10),
  price: z.number().positive(),
  change: z.number(),
  changePercent: z.number(),
  volume: z.number().int().nonnegative(),
  lastUpdated: z.string().datetime(),
});

export type StockData = z.infer<typeof StockDataSchema>;
```

**Step 2: Create type-safe API client**
```typescript
// app/lib/api/stockClient.ts
import { StockDataSchema, type StockData } from '@/lib/schemas/stock';

export async function fetchStockData(symbol: string): Promise<StockData> {
  const response = await fetch(`/api/stocks?symbol=${encodeURIComponent(symbol)}`);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const json = await response.json();
  
  // 実行時に型を検証。API変更があればここで即座にエラー
  try {
    return StockDataSchema.parse(json);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('API response validation failed:', error.errors);
      console.error('Received data:', json);
      throw new Error(`Invalid API response: ${error.errors[0].message}`);
    }
    throw error;
  }
}
```

**Step 3: Create custom hook with TanStack Query**
```typescript
// app/hooks/useStockData.ts
import { useQuery } from '@tanstack/react-query';
import { fetchStockData } from '@/lib/api/stockClient';
import type { StockData } from '@/lib/schemas/stock';

interface UseStockDataOptions {
  symbol: string;
  refetchInterval?: number;
  enabled?: boolean;
}

export function useStockData({ 
  symbol, 
  refetchInterval = 60000, // デフォルト1分
  enabled = true 
}: UseStockDataOptions) {
  return useQuery({
    queryKey: ['stock', symbol],
    queryFn: () => fetchStockData(symbol),
    staleTime: 30000, // 30秒間は新鮮
    refetchInterval,
    enabled,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
```

**Step 4: Use in component**
```typescript
// app/components/StockDashboard.tsx
import { useStockData } from '@/hooks/useStockData';

export function StockDashboard({ symbol }: { symbol: string }) {
  const { data, isLoading, error, refetch } = useStockData({ 
    symbol,
    refetchInterval: 60000 
  });
  
  // ✅ Benefits:
  // - 自動キャッシュ: 同じシンボルは再利用
  // - 自動再試行: ネットワークエラーで3回リトライ
  // - 競合状態なし: 最新のリクエストのみ適用
  // - 完全な型安全性: data は StockData 型
  // - 自動リフレッシュ: 1分ごとに更新
  
  if (isLoading) {
    return <div className="animate-pulse">Loading {symbol}...</div>;
  }
  
  if (error) {
    return (
      <div className="error">
        <p>Failed to load {symbol}: {error.message}</p>
        <button onClick={() => refetch()}>Retry</button>
      </div>
    );
  }
  
  // data は必ず StockData 型。undefined チェック不要
  return (
    <div>
      <h2>{data.symbol}</h2>
      <p className="price">${data.price.toFixed(2)}</p>
      <p className={data.change >= 0 ? 'positive' : 'negative'}>
        {data.change >= 0 ? '+' : ''}{data.changePercent.toFixed(2)}%
      </p>
      <p className="volume">Volume: {data.volume.toLocaleString()}</p>
      <p className="updated">Updated: {new Date(data.lastUpdated).toLocaleString()}</p>
    </div>
  );
}
```

**Step 5: Setup QueryClient provider**
```typescript
// app/layout.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60000,
        retry: 2,
      },
    },
  }));
  
  return (
    <html lang="ja">
      <body>
        <QueryClientProvider client={queryClient}>
          {children}
          {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
        </QueryClientProvider>
      </body>
    </html>
  );
}
```

**Testing the modernized code:**
```typescript
// app/hooks/__tests__/useStockData.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStockData } from '../useStockData';
import * as stockClient from '@/lib/api/stockClient';

jest.mock('@/lib/api/stockClient');

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

test('fetches and caches stock data', async () => {
  const mockData = {
    symbol: 'AAPL',
    price: 150.00,
    change: 2.50,
    changePercent: 1.69,
    volume: 50000000,
    lastUpdated: '2024-01-01T12:00:00Z',
  };
  
  jest.spyOn(stockClient, 'fetchStockData').mockResolvedValue(mockData);
  
  const { result } = renderHook(() => useStockData({ symbol: 'AAPL' }), {
    wrapper: createWrapper(),
  });
  
  expect(result.current.isLoading).toBe(true);
  
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  
  expect(result.current.data).toEqual(mockData);
  expect(stockClient.fetchStockData).toHaveBeenCalledTimes(1);
});
```

#### 実際のコンポーネント移行ガイド (Step-by-Step Component Migration)

このセクションでは、実際のコンポーネントを useEffect+fetch から TanStack Query に移行する具体的な手順を示します。

**対象コンポーネント: StockDashboard.tsx**

**Step 1: 現在の実装を分析**

```typescript
// app/components/StockDashboard.tsx (Before)
'use client';

import { useState, useEffect } from 'react';

interface StockData {
  symbol: string;
  price: number;
  change: number;
  volume: number;
}

export function StockDashboard({ symbol }: { symbol: string }) {
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    let cancelled = false;
    
    setLoading(true);
    setError(null);
    
    fetch(`/api/stocks?symbol=${symbol}`)
      .then(res => res.json())
      .then(json => {
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      });
    
    return () => { cancelled = true; };
  }, [symbol]);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return null;
  
  return (
    <div className="stock-card">
      <h2>{data.symbol}</h2>
      <p className="price">${data.price}</p>
      <p className={data.change >= 0 ? 'positive' : 'negative'}>
        {data.change >= 0 ? '+' : ''}{data.change}
      </p>
      <p className="volume">Vol: {data.volume.toLocaleString()}</p>
    </div>
  );
}
```

**問題点:**
- ❌ 競合状態: symbol が変わると古いリクエストの結果で上書きされる可能性
- ❌ キャッシュなし: 同じシンボルを何度も取得
- ❌ エラー再試行なし: ネットワークエラーで即座に失敗
- ❌ 型安全性なし: API変更に気づかない

---

**Step 2: Zodスキーマを作成**

```bash
# スキーマディレクトリを作成
$ mkdir -p app/lib/schemas
$ touch app/lib/schemas/stock.ts
```

```typescript
// app/lib/schemas/stock.ts
import { z } from 'zod';

export const StockDataSchema = z.object({
  symbol: z.string().min(1).max(10),
  price: z.number().positive(),
  change: z.number(),
  changePercent: z.number(),
  volume: z.number().int().nonnegative(),
  lastUpdated: z.string().datetime(),
});

export type StockData = z.infer<typeof StockDataSchema>;
```

**テストを追加:**
```typescript
// app/lib/schemas/__tests__/stock.test.ts
import { StockDataSchema } from '../stock';

describe('StockDataSchema', () => {
  test('validates correct stock data', () => {
    const validData = {
      symbol: 'AAPL',
      price: 150.00,
      change: 2.50,
      changePercent: 1.69,
      volume: 50000000,
      lastUpdated: '2024-01-01T12:00:00Z',
    };
    
    expect(() => StockDataSchema.parse(validData)).not.toThrow();
  });
  
  test('rejects negative price', () => {
    const invalidData = {
      symbol: 'AAPL',
      price: -150.00, // ❌ 負の価格
      change: 0,
      changePercent: 0,
      volume: 0,
      lastUpdated: '2024-01-01T12:00:00Z',
    };
    
    expect(() => StockDataSchema.parse(invalidData)).toThrow();
  });
});
```

```bash
# スキーマのテストを実行
$ npm test -- stock.test.ts
PASS app/lib/schemas/__tests__/stock.test.ts
```

---

**Step 3: 型安全なAPIクライアントを作成**

```bash
$ mkdir -p app/lib/api
$ touch app/lib/api/stockClient.ts
```

```typescript
// app/lib/api/stockClient.ts
import { StockDataSchema, type StockData } from '@/lib/schemas/stock';

export async function fetchStockData(symbol: string): Promise<StockData> {
  const response = await fetch(`/api/stocks?symbol=${encodeURIComponent(symbol)}`);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const json = await response.json();
  
  // 実行時バリデーション
  try {
    return StockDataSchema.parse(json);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('API validation failed:', error.errors);
      console.error('Received:', json);
      throw new Error(`Invalid API response: ${error.errors[0].message}`);
    }
    throw error;
  }
}
```

**APIクライアントのテスト:**
```typescript
// app/lib/api/__tests__/stockClient.test.ts
import { fetchStockData } from '../stockClient';

global.fetch = jest.fn();

describe('fetchStockData', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });
  
  test('fetches and validates stock data', async () => {
    const mockData = {
      symbol: 'AAPL',
      price: 150.00,
      change: 2.50,
      changePercent: 1.69,
      volume: 50000000,
      lastUpdated: '2024-01-01T12:00:00Z',
    };
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });
    
    const result = await fetchStockData('AAPL');
    expect(result).toEqual(mockData);
  });
  
  test('throws on invalid API response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ price: 'not-a-number' }), // ❌ 不正なデータ
    });
    
    await expect(fetchStockData('AAPL')).rejects.toThrow('Invalid API response');
  });
});
```

```bash
$ npm test -- stockClient.test.ts
PASS app/lib/api/__tests__/stockClient.test.ts
```

---

**Step 4: カスタムフックを作成**

```bash
$ mkdir -p app/hooks
$ touch app/hooks/useStockData.ts
```

```typescript
// app/hooks/useStockData.ts
import { useQuery } from '@tanstack/react-query';
import { fetchStockData } from '@/lib/api/stockClient';
import type { StockData } from '@/lib/schemas/stock';

interface UseStockDataOptions {
  symbol: string;
  refetchInterval?: number;
  enabled?: boolean;
}

export function useStockData({ 
  symbol, 
  refetchInterval = 60000, // デフォルト1分
  enabled = true 
}: UseStockDataOptions) {
  return useQuery<StockData, Error>({
    queryKey: ['stock', symbol],
    queryFn: () => fetchStockData(symbol),
    staleTime: 30000, // 30秒間キャッシュ
    refetchInterval,
    enabled,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
```

**カスタムフックのテスト:**
```typescript
// app/hooks/__tests__/useStockData.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStockData } from '../useStockData';
import * as stockClient from '@/lib/api/stockClient';

jest.mock('@/lib/api/stockClient');

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

test('fetches stock data successfully', async () => {
  const mockData = {
    symbol: 'AAPL',
    price: 150.00,
    change: 2.50,
    changePercent: 1.69,
    volume: 50000000,
    lastUpdated: '2024-01-01T12:00:00Z',
  };
  
  jest.spyOn(stockClient, 'fetchStockData').mockResolvedValue(mockData);
  
  const { result } = renderHook(() => useStockData({ symbol: 'AAPL' }), {
    wrapper: createWrapper(),
  });
  
  expect(result.current.isLoading).toBe(true);
  
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  
  expect(result.current.data).toEqual(mockData);
});
```

```bash
$ npm test -- useStockData.test.tsx
PASS app/hooks/__tests__/useStockData.test.tsx
```

---

**Step 5: コンポーネントをリファクタリング**

```typescript
// app/components/StockDashboard.tsx (After)
'use client';

import { useStockData } from '@/hooks/useStockData';

export function StockDashboard({ symbol }: { symbol: string }) {
  const { data, isLoading, error, refetch } = useStockData({ 
    symbol,
    refetchInterval: 60000 
  });
  
  if (isLoading) {
    return (
      <div className="stock-card">
        <div className="animate-pulse">Loading {symbol}...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="stock-card error">
        <p>Failed to load {symbol}</p>
        <p className="error-message">{error.message}</p>
        <button onClick={() => refetch()} className="retry-button">
          Retry
        </button>
      </div>
    );
  }
  
  // data は必ず StockData 型（undefined チェック不要）
  return (
    <div className="stock-card">
      <h2>{data.symbol}</h2>
      <p className="price">${data.price.toFixed(2)}</p>
      <p className={data.change >= 0 ? 'positive' : 'negative'}>
        {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)}
      </p>
      <p className="volume">Vol: {data.volume.toLocaleString()}</p>
      <p className="timestamp">
        {new Date(data.lastUpdated).toLocaleTimeString()}
      </p>
    </div>
  );
}
```

**変更点の比較:**
```diff
- import { useState, useEffect } from 'react';
+ import { useStockData } from '@/hooks/useStockData';

- const [data, setData] = useState<StockData | null>(null);
- const [loading, setLoading] = useState(true);
- const [error, setError] = useState<Error | null>(null);
+ const { data, isLoading, error, refetch } = useStockData({ symbol });

- useEffect(() => { /* 20行の複雑なコード */ }, [symbol]);
+ // useEffect 不要！

- if (loading) return <div>Loading...</div>;
+ if (isLoading) return <div>Loading...</div>;

- if (!data) return null;
+ // data は undefined チェック不要（isLoading が false なら必ず存在）
```

---

**Step 6: コンポーネントのテストを更新**

```typescript
// app/components/__tests__/StockDashboard.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StockDashboard } from '../StockDashboard';
import * as stockClient from '@/lib/api/stockClient';

jest.mock('@/lib/api/stockClient');

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

test('displays stock data after loading', async () => {
  const mockData = {
    symbol: 'AAPL',
    price: 150.00,
    change: 2.50,
    changePercent: 1.69,
    volume: 50000000,
    lastUpdated: '2024-01-01T12:00:00Z',
  };
  
  jest.spyOn(stockClient, 'fetchStockData').mockResolvedValue(mockData);
  
  renderWithQuery(<StockDashboard symbol="AAPL" />);
  
  // ローディング状態を確認
  expect(screen.getByText(/Loading AAPL/i)).toBeInTheDocument();
  
  // データ表示を待機
  await waitFor(() => {
    expect(screen.getByText('AAPL')).toBeInTheDocument();
  });
  
  expect(screen.getByText('$150.00')).toBeInTheDocument();
  expect(screen.getByText('+2.50')).toBeInTheDocument();
});

test('shows error state with retry button', async () => {
  jest.spyOn(stockClient, 'fetchStockData').mockRejectedValue(
    new Error('Network error')
  );
  
  renderWithQuery(<StockDashboard symbol="AAPL" />);
  
  await waitFor(() => {
    expect(screen.getByText(/Failed to load AAPL/i)).toBeInTheDocument();
  });
  
  expect(screen.getByText('Network error')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
});
```

```bash
$ npm test -- StockDashboard.test.tsx
PASS app/components/__tests__/StockDashboard.test.tsx
```

---

**Step 7: QueryClient プロバイダーをセットアップ**

```typescript
// app/layout.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60000, // 1分間キャッシュ
        retry: 2,
      },
    },
  }));
  
  return (
    <html lang="ja">
      <body>
        <QueryClientProvider client={queryClient}>
          {children}
          {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
        </QueryClientProvider>
      </body>
    </html>
  );
}
```

---

**Step 8: 検証とクリーンアップ**

```bash
# 1. すべてのテストを実行
$ npm test
PASS app/lib/schemas/__tests__/stock.test.ts
PASS app/lib/api/__tests__/stockClient.test.ts
PASS app/hooks/__tests__/useStockData.test.tsx
PASS app/components/__tests__/StockDashboard.test.tsx

Test Suites: 4 passed, 4 total
Tests:       12 passed, 12 total

# 2. 型チェック
$ npx tsc --noEmit
✓ No errors found

# 3. Lint
$ npm run lint
✓ No problems

# 4. ビルド
$ npm run build
✓ Compiled successfully

# 5. 不要なコードを削除
$ git rm app/components/StockDashboard.old.tsx

# 6. コミット
$ git add .
$ git commit -m "refactor: migrate StockDashboard to TanStack Query + Zod"
```

---

**移行後の改善点:**

| 項目 | Before | After | 改善 |
|------|--------|-------|------|
| コード行数 | 45行 | 28行 | -38% |
| useState/useEffect | 3 + 1 | 0 | 完全削除 |
| エラーハンドリング | 手動 | 自動 | 自動再試行 |
| キャッシュ | なし | あり | 重複リクエスト削減 |
| 型安全性 | any型 | Zod検証 | 実行時保証 |
| テストの複雑さ | 高 | 低 | モック簡単 |

**Migration Checklist:**
```bash
# 1. Install dependencies
npm install @tanstack/react-query @tanstack/react-query-devtools zod

# 2. Create schemas
mkdir -p app/lib/schemas
touch app/lib/schemas/stock.ts

# 3. Update API clients
# Add Zod validation to all API clients

# 4. Create custom hooks
mkdir -p app/hooks
touch app/hooks/useStockData.ts

# 5. Setup QueryClient
# Update app/layout.tsx

# 6. Migrate components one by one
# Start with leaf components, work up to parents

# 7. Run tests
npm test -- useStockData.test.tsx
npm test -- StockDashboard.test.tsx

# 8. Verify no regressions
npm test
npm run build
```

**Performance Impact:**
```
Before (manual fetch):
- Initial load: 850ms
- Re-renders: 12
- Network requests: 8 (no cache)
- Bundle size: +0KB

After (TanStack Query + Zod):
- Initial load: 720ms (-15%)
- Re-renders: 3 (-75%)
- Network requests: 1 (cached)
- Bundle size: +45KB (query: 38KB, zod: 7KB)

ROI: Improved UX, better DX, fewer bugs
```

### Step 5: 一括統合 (Orchestration)
複数のPRや競合ブランチを、依存関係を考慮しながら順次 `main` へ統合し、最終的な健全性を全件テストで証明する。

**Complete Integration Workflow**

**Phase 1: Pre-Integration Preparation**
```bash
# 1. 現在のブランチの状態確認
git checkout feature/my-branch
git status

# 2. 最新の main を取得
git fetch origin main

# 3. ローカルでマージテスト（コミットしない）
git merge --no-commit --no-ff origin/main

# 4. 競合があれば解決
git diff --name-only --diff-filter=U
# 各ファイルを編集して競合解決

# 5. 統合後のテスト
npm install  # 依存関係を更新
npm test
npm run lint
npm run build

# 6. 問題なければマージをコミット
git commit -m "chore: merge main into feature/my-branch"
```

#### 具体的なマージコンフリクト解決例 (Concrete Merge Conflict Resolution)

**シナリオ 1: 同じファイルの異なる箇所を編集（簡単）**

```bash
# マージ実行
$ git merge origin/main
Auto-merging app/lib/MarketDataService.ts
CONFLICT (content): Merge conflict in app/lib/MarketDataService.ts
Automatic merge failed; fix conflicts and then commit the result.

# 競合箇所を確認
$ cat app/lib/MarketDataService.ts
```

```typescript
// app/lib/MarketDataService.ts
export class MarketDataService {
  private cache = new Map<string, StockData>();
  
<<<<<<< HEAD (feature/my-branch)
  async fetchStockData(symbol: string): Promise<StockData> {
    // 自分のブランチ: キャッシュチェックを追加
    const cached = this.cache.get(symbol);
    if (cached && Date.now() - cached.timestamp < 60000) {
      return cached;
    }
=======
  async fetchStockData(symbol: string): Promise<StockData> {
    // main ブランチ: エラーハンドリングを追加
    try {
      const response = await fetch(`/api/stocks?symbol=${symbol}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error('Failed to fetch stock data:', error);
      throw error;
    }
>>>>>>> origin/main
  }
}
```

**解決手順:**
```bash
# Step 1: 両方の変更を統合（マニュアル編集）
# 編集後の app/lib/MarketDataService.ts:
```

```typescript
export class MarketDataService {
  private cache = new Map<string, StockData>();
  
  async fetchStockData(symbol: string): Promise<StockData> {
    // 両方の機能を統合
    const cached = this.cache.get(symbol);
    if (cached && Date.now() - cached.timestamp < 60000) {
      return cached; // キャッシュヒット
    }
    
    // エラーハンドリング付きでフェッチ
    try {
      const response = await fetch(`/api/stocks?symbol=${symbol}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      this.cache.set(symbol, { ...data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error('Failed to fetch stock data:', error);
      throw error;
    }
  }
}
```

```bash
# Step 2: 競合解決をマーク
$ git add app/lib/MarketDataService.ts

# Step 3: テストで検証
$ npm test -- MarketDataService.test.ts
PASS app/lib/__tests__/MarketDataService.test.ts
  ✓ fetchStockData returns cached data (12 ms)
  ✓ fetchStockData handles errors (8 ms)

# Step 4: マージコミット
$ git commit -m "chore: merge main - integrate cache and error handling"
```

---

**シナリオ 2: 同じ関数を異なる方法でリファクタリング（複雑）**

```bash
$ git merge origin/main
CONFLICT (content): Merge conflict in app/lib/technicalAnalysis/RSICalculator.ts
```

```typescript
// app/lib/technicalAnalysis/RSICalculator.ts
<<<<<<< HEAD (feature/optimize-rsi)
// 自分のブランチ: パフォーマンス最適化
export function calculateRSI(prices: number[], period = 14): number[] {
  // O(n) 実装: 移動平均を効率的に計算
  const gains: number[] = [];
  const losses: number[] = [];
  
  for (let i = 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }
  
  // 移動平均を1パスで計算
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b) / period;
  
  // ... 続き
}
=======
// main ブランチ: 型安全性を向上
export function calculateRSI(
  prices: readonly number[], 
  period: number = 14
): { values: number[]; period: number; error?: string } {
  // バリデーション追加
  if (prices.length < period + 1) {
    return { values: [], period, error: 'Insufficient data' };
  }
  
  if (prices.some(p => p < 0)) {
    return { values: [], period, error: 'Negative prices not allowed' };
  }
  
  // 既存の実装（O(n^2) だが安全）
  const rsi: number[] = [];
  for (let i = period; i < prices.length; i++) {
    const gains = [];
    const losses = [];
    for (let j = i - period; j < i; j++) {
      const change = prices[j + 1] - prices[j];
      if (change > 0) gains.push(change);
      else losses.push(-change);
    }
    // ... 続き
  }
  
  return { values: rsi, period };
}
>>>>>>> origin/main
```

**解決手順:**
```bash
# Step 1: 両方のブランチの完全な実装を確認
$ git show HEAD:app/lib/technicalAnalysis/RSICalculator.ts > /tmp/my-version.ts
$ git show origin/main:app/lib/technicalAnalysis/RSICalculator.ts > /tmp/main-version.ts

# Step 2: 差分を比較
$ diff -u /tmp/my-version.ts /tmp/main-version.ts
# - 自分のブランチ: パフォーマンス改善（O(n)）
# - main: 型安全性とバリデーション

# Step 3: 両方の利点を統合（ベストオブボス）
# 編集後の app/lib/technicalAnalysis/RSICalculator.ts:
```

```typescript
/**
 * RSIを計算（パフォーマンス最適化 + 型安全）
 * @param prices - 価格配列（読み取り専用）
 * @param period - RSI期間（デフォルト14）
 * @returns RSI値、期間、エラー情報
 */
export function calculateRSI(
  prices: readonly number[],
  period: number = 14
): { values: number[]; period: number; error?: string } {
  // バリデーション（main ブランチから）
  if (prices.length < period + 1) {
    return { values: [], period, error: 'Insufficient data' };
  }
  
  if (prices.some(p => p < 0)) {
    return { values: [], period, error: 'Negative prices not allowed' };
  }
  
  // O(n) 実装（feature/optimize-rsi から）
  const gains: number[] = [];
  const losses: number[] = [];
  
  for (let i = 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }
  
  const rsiValues: number[] = [];
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b) / period;
  
  for (let i = period; i < prices.length; i++) {
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    rsiValues.push(rsi);
    
    // Wilder's smoothing
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
  }
  
  return { values: rsiValues, period };
}
```

```bash
# Step 4: テストで両方の要件を検証
$ npm test -- RSICalculator.test.ts

# ✓ 型安全性のテスト
test('rejects negative prices', () => {
  const result = calculateRSI([-10, 20, 30], 2);
  expect(result.error).toBe('Negative prices not allowed');
});

# ✓ パフォーマンステスト
test('calculates 1000 data points efficiently', () => {
  const prices = Array.from({ length: 1000 }, (_, i) => 100 + Math.random() * 10);
  const start = performance.now();
  calculateRSI(prices, 14);
  const duration = performance.now() - start;
  expect(duration).toBeLessThan(10); // 10ms 以内
});

# Step 5: 競合解決を完了
$ git add app/lib/technicalAnalysis/RSICalculator.ts
$ git commit -m "chore: merge main - combine O(n) optimization with type safety"
```

---

**シナリオ 3: ファイル削除と編集の競合（デリケート）**

```bash
$ git merge origin/main
CONFLICT (modify/delete): app/lib/LegacyService.ts deleted in origin/main and modified in HEAD.
```

**状況分析:**
- **main ブランチ**: `LegacyService.ts` を削除（新しい `ModernService.ts` に移行済み）
- **自分のブランチ**: `LegacyService.ts` にバグ修正を追加

**解決手順:**
```bash
# Step 1: 削除の理由を確認
$ git log origin/main --oneline --all -- app/lib/LegacyService.ts
a1b2c3d refactor: replace LegacyService with ModernService

$ git show a1b2c3d
# コミットメッセージから ModernService への移行であることを確認

# Step 2: 自分の変更を ModernService に移植
$ git show HEAD:app/lib/LegacyService.ts > /tmp/my-changes.ts
$ vimdiff /tmp/my-changes.ts app/lib/ModernService.ts

# 自分のバグ修正を ModernService に適用
# 例: null チェックの追加
# Before (LegacyService.ts):
#   if (data) { return data.value; }
# After (ModernService.ts に適用):
#   if (data && data.value !== undefined) { return data.value; }

# Step 3: 削除を受け入れる
$ git rm app/lib/LegacyService.ts

# Step 4: ModernService に変更を追加
$ git add app/lib/ModernService.ts

# Step 5: テストで検証
$ npm test -- ModernService.test.ts
PASS app/lib/__tests__/ModernService.test.ts
  ✓ handles null data gracefully (5 ms)

# Step 6: マージコミット
$ git commit -m "chore: merge main - migrate bug fix from LegacyService to ModernService"
```

---

**ロールバック計画 (Rollback Strategy)**

マージ後に問題が発覚した場合の復旧手順:

```bash
# オプション 1: マージコミットを取り消し（ローカルのみ）
$ git reset --hard HEAD~1  # 直前のコミットに戻る
# 注意: push 前のみ使用可能

# オプション 2: マージを打ち消す新しいコミット（push 後）
$ git revert -m 1 HEAD
# -m 1: 最初の親（main）に戻る
# 新しいコミットが作成され、履歴は残る

# オプション 3: 特定のファイルだけを戻す
$ git checkout HEAD~1 -- app/lib/ProblematicFile.ts
$ git commit -m "revert: rollback ProblematicFile.ts to previous version"

# オプション 4: 緊急ホットフィックス
# 問題のあるコミットをスキップして main を進める
$ git checkout -b hotfix/emergency-fix main~1  # 問題の前のコミットから分岐
$ # 修正を適用
$ git checkout main
$ git reset --hard hotfix/emergency-fix
$ git push --force-with-lease origin main  # 慎重に！
```

**Phase 2: Dependency-Ordered Integration**

**Scenario: 3つのブランチを統合**
- `feature/auth-store` - 認証システムのリファクタリング
- `feature/data-fetching` - TanStack Query への移行（auth-store に依存）
- `feature/ui-improvements` - UI改善（data-fetching に依存）

**Step-by-Step Integration:**
```bash
# 1. 最も基盤となる auth-store から開始
git checkout main
git pull origin main

git checkout feature/auth-store
git rebase main  # 最新の main 上にリベース

# ローカル検証
npm install
npm test && npm run lint && npm run build

# 問題なければ main にマージ
git checkout main
git merge --no-ff feature/auth-store -m "feat: implement centralized AuthStore"

# CI が通ることを確認してから push
git push origin main

# 2. 次の依存ブランチ data-fetching
git checkout feature/data-fetching
git rebase main  # auth-store を含む最新 main を取得

# 統合テスト: auth + data-fetching
npm install
npm test -- --coverage
npm run test:e2e  # E2Eテストで統合を検証

# 問題なければ main にマージ
git checkout main
git merge --no-ff feature/data-fetching -m "feat: migrate to TanStack Query"
git push origin main

# 3. 最終ブランチ ui-improvements
git checkout feature/ui-improvements
git rebase main

# 全体統合テスト
npm install
npm test
npm run test:e2e
npm run build

# Performance regression check
npm run test:performance  # カスタムスクリプト

git checkout main
git merge --no-ff feature/ui-improvements -m "feat: enhance UI with modern patterns"
git push origin main
```

**Phase 3: Post-Integration Validation**

**Complete System Check:**
```bash
# 1. Clean environment
rm -rf node_modules package-lock.json
npm install

# 2. Type safety
npx tsc --noEmit
# Expected: 0 errors

# 3. Linting
npm run lint
# Expected: 0 errors, 0 warnings

# 4. Unit tests
npm test -- --coverage
# Expected: All pass, coverage ≥ 80%

# 5. Integration tests
npm run test:integration
# Expected: All pass

# 6. E2E tests
npm run test:e2e
# Expected: All pass

# 7. Build verification
npm run build
# Expected: Build successful

# 8. Visual regression (optional)
npm run test:visual
# Expected: No unexpected UI changes

# 9. Performance check
npm run test:performance
# Expected: No significant regressions
```

**Rollback Plan:**
```bash
# If integration fails and can't be fixed quickly:

# 1. Identify the problematic merge
git log --oneline --graph --all | head -20

# 2. Revert the merge commit (preserves history)
git revert -m 1 <merge-commit-hash>

# 3. Push revert
git push origin main

# 4. Create hotfix branch to address issues
git checkout -b hotfix/integration-issues
# Fix the problems
# Re-test thoroughly
# Create new PR for review
```

**Integration Health Dashboard:**
```bash
# Create a script to check integration health
# scripts/integration-health.sh

#!/bin/bash
set -e  # エラーで停止

echo "=== Integration Health Check ==="
echo "Started: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

FAILED=0

# 1. Dependencies
echo "📦 Dependencies"
if npm list --depth=0 2>&1 | grep -E "UNMET|missing" > /dev/null; then
  echo "❌ FAIL - Missing dependencies detected"
  npm list --depth=0 2>&1 | grep -E "UNMET|missing"
  FAILED=$((FAILED + 1))
else
  TOTAL=$(npm list --depth=0 2>&1 | grep -c "├──\|└──" || echo "0")
  echo "✅ PASS - All $TOTAL dependencies resolved"
fi
echo ""

# 2. TypeScript
echo "🔍 TypeScript"
TS_OUTPUT=$(npx tsc --noEmit 2>&1)
if [ $? -eq 0 ]; then
  echo "✅ PASS - 0 errors found"
else
  ERROR_COUNT=$(echo "$TS_OUTPUT" | grep -c "error TS" || echo "0")
  echo "❌ FAIL - $ERROR_COUNT errors found"
  echo "$TS_OUTPUT" | head -20  # 最初の20行を表示
  FAILED=$((FAILED + 1))
fi
echo ""

# 3. ESLint
echo "📏 ESLint"
LINT_OUTPUT=$(npm run lint 2>&1)
if [ $? -eq 0 ]; then
  echo "✅ PASS - No linting errors"
else
  ERROR_COUNT=$(echo "$LINT_OUTPUT" | grep -oP "\d+ error" | grep -oP "\d+" || echo "0")
  WARN_COUNT=$(echo "$LINT_OUTPUT" | grep -oP "\d+ warning" | grep -oP "\d+" || echo "0")
  echo "❌ FAIL - $ERROR_COUNT errors, $WARN_COUNT warnings"
  echo "$LINT_OUTPUT" | grep "error\|warning" | head -10
  FAILED=$((FAILED + 1))
fi
echo ""

# 4. Unit Tests
echo "🧪 Unit Tests"
TEST_OUTPUT=$(npm test -- --passWithNoTests --silent --coverage 2>&1)
if [ $? -eq 0 ]; then
  PASSED=$(echo "$TEST_OUTPUT" | grep -oP "\d+ passed" | grep -oP "\d+" || echo "0")
  COVERAGE=$(echo "$TEST_OUTPUT" | grep "All files" | awk '{print $10}' || echo "N/A")
  echo "✅ PASS - $PASSED tests passed, Coverage: $COVERAGE"
else
  FAILED_TESTS=$(echo "$TEST_OUTPUT" | grep -oP "\d+ failed" | grep -oP "\d+" || echo "0")
  echo "❌ FAIL - $FAILED_TESTS tests failed"
  echo "$TEST_OUTPUT" | grep "FAIL" | head -5
  FAILED=$((FAILED + 1))
fi
echo ""

# 5. Build
echo "🏗️ Build"
BUILD_START=$(date +%s)
if npm run build > /dev/null 2>&1; then
  BUILD_END=$(date +%s)
  BUILD_TIME=$((BUILD_END - BUILD_START))
  BUILD_SIZE=$(du -sh .next 2>/dev/null | cut -f1 || echo "N/A")
  echo "✅ PASS - Built in ${BUILD_TIME}s, Size: $BUILD_SIZE"
else
  echo "❌ FAIL - Build failed"
  npm run build 2>&1 | tail -20
  FAILED=$((FAILED + 1))
fi
echo ""

# 6. E2E Tests (optional)
if command -v playwright &> /dev/null; then
  echo "🎯 E2E Tests"
  if npm run test:e2e > /dev/null 2>&1; then
    E2E_PASSED=$(npm run test:e2e 2>&1 | grep -oP "\d+ passed" | grep -oP "\d+" || echo "0")
    echo "✅ PASS - $E2E_PASSED E2E tests passed"
  else
    echo "❌ FAIL - E2E tests failed"
    FAILED=$((FAILED + 1))
  fi
  echo ""
fi

# Summary
echo "==================================="
echo "Completed: $(date '+%Y-%m-%d %H:%M:%S')"
if [ $FAILED -eq 0 ]; then
  echo "🎉 All checks passed!"
  exit 0
else
  echo "⚠️  $FAILED check(s) failed"
  exit 1
fi
```

**期待される出力 (成功時):**
```
=== Integration Health Check ===
Started: 2024-01-15 14:30:00

📦 Dependencies
✅ PASS - All 127 dependencies resolved

🔍 TypeScript
✅ PASS - 0 errors found

📏 ESLint
✅ PASS - No linting errors

🧪 Unit Tests
✅ PASS - 247 tests passed, Coverage: 82.5%

🏗️ Build
✅ PASS - Built in 45s, Size: 192M

🎯 E2E Tests
✅ PASS - 18 E2E tests passed

===================================
Completed: 2024-01-15 14:32:15
🎉 All checks passed!
```

**期待される出力 (失敗時):**
```
=== Integration Health Check ===
Started: 2024-01-15 14:30:00

📦 Dependencies
✅ PASS - All 127 dependencies resolved

🔍 TypeScript
❌ FAIL - 15 errors found
app/lib/MarketDataService.ts(42,15): error TS2339: Property 'userId' does not exist
app/components/Dashboard.tsx(28,3): error TS2322: Type 'string | undefined' is not assignable
app/lib/auth/AuthStore.ts(55,10): error TS2304: Cannot find name 'UserData'
...

📏 ESLint
❌ FAIL - 23 errors, 47 warnings
app/components/StockCard.tsx:12:5 - error - Unexpected any @typescript-eslint/no-explicit-any
app/lib/utils.ts:45:3 - warning - React Hook useEffect has a missing dependency
...

🧪 Unit Tests
❌ FAIL - 49 tests failed
FAIL app/lib/__tests__/AuthService.test.ts
FAIL app/components/__tests__/Login.test.tsx
FAIL app/lib/__tests__/MarketData.test.ts
...

🏗️ Build
❌ FAIL - Build failed
Error: app/lib/MarketDataService.ts(42,15): error TS2339
Build failed. Fix errors and try again.

===================================
Completed: 2024-01-15 14:31:45
⚠️  4 check(s) failed
```

**使用方法:**
```bash
# スクリプトを実行可能にする
$ chmod +x scripts/integration-health.sh

# 実行
$ ./scripts/integration-health.sh

# CI/CDパイプラインに組み込む
# .github/workflows/integration.yml:
# - name: Run Integration Health Check
#   run: ./scripts/integration-health.sh
```

**Integration Checklist:**
- [ ] すべてのブランチが最新の main をベースにしている
- [ ] 依存関係の順序で統合している
- [ ] 各マージ後に完全なテストスイートを実行
- [ ] CI/CD パイプラインがすべてパスしている
- [ ] パフォーマンス回帰がない
- [ ] ドキュメントが更新されている
- [ ] ロールバック計画が準備されている
- [ ] チームメンバーに統合完了を通知済み

## ⚠️ 禁止事項
- `any` 型の放置。
- 警告（Warning）を無視したマージ。
- サーバー/クライアント境界を意識しない `'use client'` の濫用。

## ✅ Verification Checklist (検証チェックリスト)

プロジェクト安定化作業を完了する前に、以下を**順番に**確認してください。

### Phase 1: 基本検証 (Basic Validation)
これらはすべて **MUST PASS** です。1つでも失敗したら次に進まないでください。

```bash
# 実行コマンド
cd trading-platform
./scripts/basic-validation.sh
```

- [ ] **依存関係の整合性**
  ```bash
  npm install
  npm list --depth=0 2>&1 | grep -E "UNMET|missing"
  ```
  **Expected:** 出力なし（すべての依存関係が解決済み）
  
  **If fails:**
  ```bash
  # Step 1: 再インストールを試行
  $ npm install
  
  # Step 2: それでも失敗する場合、キャッシュをクリア
  $ rm -rf node_modules package-lock.json
  $ npm cache clean --force
  $ npm install
  
  # Step 3: 特定のパッケージが見つからない場合
  $ npm install <missing-package> --save
  # または
  $ npm install <missing-package> --save-dev
  
  # Step 4: バージョン競合がある場合
  $ npm ls <package-name>  # 依存関係ツリーを確認
  $ npm update <package-name>  # 最新の互換バージョンに更新
  
  # Step 5: それでも解決しない場合、package.json を確認
  $ cat package.json | jq '.dependencies, .devDependencies'
  # 不要なパッケージを削除して再インストール
  ```

- [ ] **TypeScript 型チェック**
  ```bash
  npx tsc --noEmit
  ```
  **Expected:** `Found 0 errors.`
  
  **If fails:**
  ```bash
  # Step 1: エラーの数と箇所を確認
  $ npx tsc --noEmit | grep "error TS" | wc -l
  # 例: 15 errors found
  
  # Step 2: エラーをファイルごとにグループ化
  $ npx tsc --noEmit 2>&1 | grep "error TS" | cut -d':' -f1 | sort | uniq -c
  # 例:
  #   8 app/lib/MarketDataService.ts
  #   5 app/components/Dashboard.tsx
  #   2 app/types/index.ts
  
  # Step 3: 最も多くのエラーがあるファイルから修正
  $ npx tsc --noEmit | grep "MarketDataService.ts"
  
  # Step 4: 一般的なエラーパターンと修正方法
  # - "Property 'X' does not exist" → 型定義を確認
  # - "Type 'X' is not assignable" → 型アサーションまたは型ガード
  # - "Cannot find module" → パスエイリアス設定を確認
  
  # Step 5: 段階的に検証
  $ npx tsc --noEmit --incremental  # インクリメンタルビルド
  
  # Step 6: tsconfig.json の設定を一時的に緩和（最終手段）
  # "skipLibCheck": true を追加（推奨しない）
  ```

- [ ] **ESLint チェック**
  ```bash
  npm run lint
  ```
  **Expected:** `✓ No ESLint errors or warnings`
  
  **If fails:**
  ```bash
  # Step 1: 自動修正を試行
  $ npm run lint:fix
  ✔ Fixed 17 problems
  
  # Step 2: 残りのエラーを確認
  $ npm run lint
  ✖ 30 problems (6 errors, 24 warnings)
  
  # Step 3: エラーをルール別に集計
  $ npm run lint -- --format json | jq '.[].messages[].ruleId' | sort | uniq -c
  # 例:
  #  12 @typescript-eslint/no-explicit-any
  #   8 react-hooks/exhaustive-deps
  #   6 no-unused-vars
  #   4 @typescript-eslint/no-non-null-assertion
  
  # Step 4: 最も多いルール違反から修正
  # a) no-explicit-any の修正
  $ grep -rn ": any" app/ --include="*.ts" --include="*.tsx"
  # 各箇所で any → unknown または具体的な型に変更
  
  # b) react-hooks/exhaustive-deps の修正
  $ grep -A 3 "useEffect" app/components/ --include="*.tsx" | grep "\[\]"
  # 依存配列に必要な変数を追加
  
  # c) no-unused-vars の修正
  $ npm run lint -- --format compact | grep "no-unused-vars"
  # 未使用の変数を削除
  
  # Step 5: 特定のファイルのみをチェック
  $ npx eslint app/components/Dashboard.tsx
  
  # Step 6: 一時的に特定のルールを無効化（非推奨）
  # /* eslint-disable-next-line rule-name */ をコメントで追加
  ```

- [ ] **ユニットテストの実行**
  ```bash
  npm test -- --passWithNoTests --coverage
  ```
  **Expected:** 
  - `Tests: X passed, 0 failed`
  - `Coverage: ≥ 80% statements, branches, functions, lines`
  
  **If fails:**
  ```bash
  # Step 1: 失敗したテストを特定
  $ npm test 2>&1 | grep "FAIL"
  # 例: FAIL app/lib/__tests__/AuthService.test.ts
  
  # Step 2: 特定のテストファイルを実行
  $ npm test -- AuthService.test.ts
  
  # Step 3: デバッグモードで実行
  $ npm test -- --verbose --no-coverage AuthService.test.ts
  
  # Step 4: 失敗の種類別の対処
  # a) "Timeout" エラー
  $ npm test -- --testTimeout=10000 AuthService.test.ts
  
  # b) "Cannot find element" エラー
  # テストコードに screen.debug() を追加してDOMを確認
  
  # c) "expect(received).toBe(expected)" エラー
  # 実際の値をログ出力
  console.log('Received:', received);
  
  # Step 5: カバレッジが不足している場合
  $ npm test -- --coverage --collectCoverageFrom="app/lib/**/*.ts"
  $ open coverage/lcov-report/index.html  # カバレッジレポートを開く
  
  # カバレッジが低いファイルを特定
  $ grep -A 1 "Lines.*:" coverage/lcov-report/index.html | grep -E "[0-9]+\.[0-9]+%" | sort -n
  
  # 80%未満のファイルにテストを追加
  $ touch app/lib/__tests__/UncoveredService.test.ts
  
  # Step 6: スナップショットの更新が必要な場合
  $ npm test -- -u  # スナップショットを更新
  ```

- [ ] **ビルドの成功**
  ```bash
  npm run build
  ```
  **Expected:** `Build completed successfully`
  
  **If fails:**
  ```bash
  # Step 1: エラーメッセージを確認
  $ npm run build 2>&1 | tee build-error.log
  
  # Step 2: 一般的なビルドエラーと対処
  # a) "Module not found" エラー
  $ grep "Module not found" build-error.log
  # → インポートパスを修正（大文字小文字の区別に注意）
  
  # b) "Type error" エラー
  $ npm run build 2>&1 | grep "Type error"
  # → npx tsc --noEmit で型エラーを先に修正
  
  # c) "Out of memory" エラー
  $ NODE_OPTIONS="--max-old-space-size=4096" npm run build
  
  # d) "ENOSPC: System limit for number of file watchers reached"
  $ echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
  $ sudo sysctl -p
  
  # Step 3: クリーンビルドを試行
  $ rm -rf .next
  $ npm run build
  
  # Step 4: 段階的にビルド
  $ npm run build -- --profile  # プロファイル情報を出力
  $ npm run build -- --debug     # デバッグモード
  
  # Step 5: 特定のページのみをビルド（Next.js）
  # next.config.js に experimental.outputFileTracingIncludes を設定
  ```

### Phase 2: マージ後の品質チェック (Post-Merge Quality)

- [ ] **機能のデグレードがない**
  ```bash
  # 主要機能の手動テスト
  npm run dev
  # ブラウザで以下を確認:
  # 1. ログイン/ログアウト
  # 2. 株価データの取得と表示
  # 3. チャートの描画
  # 4. リアルタイム更新
  ```
  **Checklist:**
  - [ ] 既存の画面がすべて表示される
  - [ ] 既存の機能がすべて動作する
  - [ ] コンソールに新しいエラーがない
  - [ ] ネットワークリクエストが正常

- [ ] **新しい警告が追加されていない**
  ```bash
  # マージ前の警告数を記録
  git checkout main
  npm run lint 2>&1 | grep "warning" | wc -l
  
  # マージ後の警告数を確認
  git checkout feature/my-branch
  npm run lint 2>&1 | grep "warning" | wc -l
  ```
  **Expected:** 警告数が増加していない（減少は歓迎）

- [ ] **テストカバレッジが維持または改善**
  ```bash
  npm test -- --coverage --silent
  grep "Statements" coverage/coverage-summary.json
  ```
  **Expected:** カバレッジが前回より低下していない

- [ ] **パッケージマネージャーの統一**
  ```bash
  # npm のみを使用（pnpm-lock.yaml や yarn.lock があってはいけない）
  ls -la | grep -E "pnpm-lock|yarn.lock"
  ```
  **Expected:** 何も見つからない
  **If fails:** `rm pnpm-lock.yaml yarn.lock && npm install`

### Phase 3: モダン化の確認 (Modernization Validation)

- [ ] **TanStack Query が適切に使用されている**（該当する場合）
  ```bash
  # useQuery/useMutation の使用箇所を確認
  grep -r "useQuery\|useMutation" app/ --include="*.tsx" --include="*.ts"
  
  # 古いパターン（useEffect + fetch）が残っていないか
  grep -r "useEffect.*fetch" app/components/ --include="*.tsx"
  ```
  **Expected:** 
  - データ取得に `useQuery` を使用
  - データ更新に `useMutation` を使用
  - `useEffect` での手動 fetch が存在しない

- [ ] **Zod バリデーションが適用されている**（該当する場合）
  ```bash
  # Zod スキーマの定義を確認
  find app/lib/schemas -name "*.ts" -type f
  
  # API クライアントでの使用を確認
  grep -r "\.parse\|\.safeParse" app/lib/api/ --include="*.ts"
  ```
  **Expected:**
  - すべての外部データに Zod スキーマが定義されている
  - API レスポンスで `.parse()` が呼ばれている

- [ ] **React 19 ベストプラクティスに準拠**
  ```bash
  # use client の使用箇所を確認
  grep -r "'use client'" app/ --include="*.tsx" --include="*.ts"
  
  # useEffect の依存配列を確認
  grep -A 2 "useEffect" app/components/ --include="*.tsx" | grep -E "\[\]|\.current"
  ```
  **Expected:**
  - `'use client'` はクライアント機能を使うコンポーネントのみ
  - useEffect の依存配列に `ref.current` がない
  - 不要な useEffect が存在しない

- [ ] **サーバー/クライアント境界が適切**
  ```bash
  # サーバーコンポーネントでクライアント専用機能を使っていないか
  grep -r "useState\|useEffect\|useContext" app/ --include="*.tsx" | grep -v "use client"
  ```
  **Expected:** 出力なし（すべてのフックが 'use client' コンポーネント内）

### Phase 4: ドキュメント (Documentation)

- [ ] **重要な変更にコメントがある**
  ```bash
  # 複雑なロジックにコメントがあるか確認
  git diff main -- app/lib/ | grep -E "^\+.*\/\/"
  ```
  **Checklist:**
  - [ ] 複雑なアルゴリズムに説明コメント
  - [ ] 回避策（workaround）に理由のコメント
  - [ ] パブリックAPIに JSDoc コメント

- [ ] **破壊的変更のドキュメント更新**
  ```bash
  # 環境変数の変更を確認
  git diff main -- .env.example
  
  # README の更新を確認
  git diff main -- README.md
  ```
  **Required updates if:**
  - API の破壊的変更 → `docs/API.md` 更新
  - 環境変数の追加/削除 → `.env.example` 更新
  - セットアップ手順の変更 → `README.md` 更新

- [ ] **環境変数の同期**
  ```bash
  # .env.example に必要な変数がすべてあるか
  grep -o "process\.env\.[A-Z_]*" app/ -r --include="*.ts" --include="*.tsx" | \
    sed 's/process\.env\.//' | sort -u
  
  # .env.example の内容と比較
  grep "^[A-Z_]*=" .env.example | cut -d= -f1 | sort
  ```
  **Expected:** 両方のリストが一致（テスト用の変数を除く）

### Phase 5: 最終検証 (Final Verification)

- [ ] **E2E テストの実行**
  ```bash
  npm run test:e2e
  ```
  **Expected:** すべての E2E テストがパス
  **If fails:** テストが環境依存の場合、CI ログで確認

- [ ] **パフォーマンス回帰なし**
  ```bash
  # ビルドサイズの確認
  npm run build
  ls -lh .next/static/chunks/pages/ | awk '{print $5, $9}' | sort -h
  
  # Lighthouse スコアの確認（オプション）
  npm run lighthouse
  ```
  **Expected:**
  - バンドルサイズが大幅に増加していない（+10% 以内）
  - Lighthouse スコア ≥ 90 (Performance, Accessibility, Best Practices)

- [ ] **CI/CD パイプラインの確認**
  ```bash
  # ローカルで CI と同じコマンドを実行
  npm run ci:check  # package.json に定義されている場合
  
  # または手動で
  npm install && npm test && npm run lint && npm run build
  ```
  **Expected:** すべてのコマンドが成功

- [ ] **セキュリティスキャン**
  ```bash
  npm audit
  npm audit --production
  ```
  **Expected:** 
  - `0 vulnerabilities` または
  - 既知の false positive のみ
  **If fails:** `npm audit fix` で修正可能なものを修正

### 検証完了後のアクション (Post-Verification Actions)

すべてのチェックがパスしたら:

1. **変更を main にマージ**
   ```bash
   git checkout main
   git merge --no-ff feature/my-branch -m "feat: description of changes"
   git push origin main
   ```

2. **タグを付ける**（メジャーな変更の場合）
   ```bash
   git tag -a v1.2.0 -m "Release v1.2.0: Project stabilization"
   git push origin v1.2.0
   ```

3. **ドキュメントを更新**
   - CHANGELOG.md に変更内容を記録
   - PR に検証結果を添付
   - Slack/Teams でチームに通知

4. **クリーンアップ**
   ```bash
   # マージ済みブランチを削除
   git branch -d feature/my-branch
   git push origin --delete feature/my-branch
   ```

### クイックチェックスクリプト

すべての検証を一度に実行するスクリプト:

```bash
#!/bin/bash
# scripts/verify-all.sh

set -e  # エラーで停止

echo "🔍 Phase 1: Basic Validation"
npm install
npx tsc --noEmit
npm run lint
npm test -- --coverage
npm run build

echo "✅ Phase 1 passed"

echo "🔍 Phase 2: Post-Merge Quality"
# カバレッジチェック
COVERAGE=$(npm test -- --coverage --silent | grep "All files" | awk '{print $10}' | sed 's/%//')
if [ "$COVERAGE" -lt 80 ]; then
  echo "❌ Coverage too low: $COVERAGE%"
  exit 1
fi

echo "✅ Phase 2 passed"

echo "🔍 Phase 3: Modernization"
# 古いパターンが残っていないか
OLD_PATTERNS=$(grep -r "useEffect.*fetch" app/components/ --include="*.tsx" | wc -l)
if [ "$OLD_PATTERNS" -gt 0 ]; then
  echo "⚠️  Warning: $OLD_PATTERNS old useEffect+fetch patterns found"
fi

echo "✅ Phase 3 passed"

echo "🔍 Phase 4: Documentation"
# .env.example が最新か
git diff --quiet .env.example || echo "⚠️  .env.example has uncommitted changes"

echo "✅ Phase 4 passed"

echo "🔍 Phase 5: Final Verification"
npm run test:e2e
npm audit --production

echo "✅ All phases passed! Ready to merge."
```

## 🔧 Common Troubleshooting (よくある問題と解決策)

### Issue 1: テストが無限ループする
**症状:**
```bash
$ npm test
Tests are running... (never completes)
CPU usage: 100%
```

**原因:** 
- useEffect の依存配列が不適切
- TanStack Query の設定ミス（refetchInterval が 0）
- モックが無限に Promise を返す

**診断:**
```typescript
// Bad: Missing dependencies
useEffect(() => {
  fetchData(userId);
}, []); // userId の変更が検知されない

// Bad: Object in dependency array
useEffect(() => {
  fetchData(config);
}, [config]); // config は毎回新しいオブジェクト → 無限ループ
```

**Solution:**
```typescript
// Good: Proper primitive dependencies
useEffect(() => {
  fetchData(userId);
}, [userId]);

// Better: Use TanStack Query (no useEffect needed)
const { data } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
  staleTime: 30000, // 30秒キャッシュ
});
```

**Verification:**
```bash
# テストを --detectOpenHandles で実行
npm test -- --detectOpenHandles

# タイムアウトを設定して強制終了
npm test -- --testTimeout=5000
```

#### 無限ループの高度なデバッグ手法 (Advanced Infinite Loop Debugging)

**方法 1: React DevTools Profiler で原因を特定**

```bash
# 1. 開発サーバーを起動
$ npm run dev

# 2. ブラウザで React DevTools を開く
# Chrome DevTools → Components/Profiler タブ

# 3. Profiler で「Record」を開始
# 4. 問題のコンポーネントを操作
# 5. 数秒後に「Stop」
```

**期待される出力:**
```
Profiler Results:
- StockDashboard: 47 renders in 2s (❌ 異常に多い)
- useEffect fired: 47 times
- Reason: props.config changed 47 times
```

**解決策:**
```typescript
// Before: config オブジェクトが毎回新しい参照
<StockDashboard config={{ symbol: 'AAPL', interval: '1D' }} />

// After: useMemo で参照を安定化
const config = useMemo(
  () => ({ symbol: 'AAPL', interval: '1D' }),
  [] // 依存なし = 初回のみ作成
);
<StockDashboard config={config} />
```

---

**方法 2: Console.log で再レンダリングを追跡**

```typescript
// デバッグ用コンポーネント
export function StockDashboard({ symbol }: { symbol: string }) {
  const renderCount = useRef(0);
  
  useEffect(() => {
    renderCount.current += 1;
    console.log(`🔄 Render #${renderCount.current}`, {
      symbol,
      timestamp: new Date().toISOString(),
      stack: new Error().stack, // 呼び出し元を追跡
    });
  });
  
  // 通常のロジック
  const { data } = useStockData({ symbol });
  // ...
}
```

**期待される出力 (正常):**
```
🔄 Render #1 { symbol: 'AAPL', timestamp: '2024-01-01T12:00:00.000Z' }
🔄 Render #2 { symbol: 'AAPL', timestamp: '2024-01-01T12:00:01.500Z' } // データ取得完了
```

**異常な出力 (無限ループ):**
```
🔄 Render #1 { symbol: 'AAPL', timestamp: '2024-01-01T12:00:00.000Z' }
🔄 Render #2 { symbol: 'AAPL', timestamp: '2024-01-01T12:00:00.050Z' }
🔄 Render #3 { symbol: 'AAPL', timestamp: '2024-01-01T12:00:00.100Z' }
🔄 Render #4 { symbol: 'AAPL', timestamp: '2024-01-01T12:00:00.150Z' }
... (continues)
```

---

**方法 3: Why-Did-You-Render ライブラリを使用**

```bash
# インストール
$ npm install --save-dev @welldone-software/why-did-you-render
```

```typescript
// app/lib/wdyr.ts (開発環境のみ)
if (process.env.NODE_ENV === 'development') {
  const React = require('react');
  const whyDidYouRender = require('@welldone-software/why-did-you-render');
  
  whyDidYouRender(React, {
    trackAllPureComponents: true,
    logOnDifferentValues: true,
    collapseGroups: true,
  });
}

// app/layout.tsx (最上部)
import './lib/wdyr'; // デバッグ時のみインポート
```

```typescript
// デバッグ対象のコンポーネント
export function StockDashboard({ symbol }: { symbol: string }) {
  // ...
}

// Why-Did-You-Render を有効化
StockDashboard.whyDidYouRender = true;
```

**期待される出力:**
```
[why-did-you-render] StockDashboard
  Re-rendered because of props changes:
    config: { symbol: 'AAPL', interval: '1D' } → { symbol: 'AAPL', interval: '1D' }
    (same values, different references) ❌
```

---

**方法 4: TanStack Query Devtools で状態を監視**

```typescript
// app/layout.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

**DevTools で確認する項目:**
- **Fetches**: データ取得の頻度（1秒に何回も取得していないか）
- **Query Status**: `fetching` → `success` のサイクルが正常か
- **Refetch Interval**: 自動リフレッシュの設定が適切か

**正常な状態:**
```
Query: ['stock', 'AAPL']
Status: success
Data Age: 15s
Refetch Interval: 60s
Last Fetched: 12:00:00
```

**異常な状態 (無限ループ):**
```
Query: ['stock', 'AAPL']
Status: fetching (constantly)
Data Age: 0s
Refetch Interval: 0s ❌ (should be > 0)
Fetch Count: 247 in 5s ❌
```

**修正:**
```typescript
// Before: refetchInterval が 0 または undefined
const { data } = useQuery({
  queryKey: ['stock', symbol],
  queryFn: fetchStockData,
  refetchInterval: 0, // ❌ 無限ループの原因
});

// After: 適切な間隔を設定
const { data } = useQuery({
  queryKey: ['stock', symbol],
  queryFn: fetchStockData,
  refetchInterval: 60000, // ✅ 1分ごと
  staleTime: 30000, // 30秒間はキャッシュを使用
});
```

---

**方法 5: Node.js の --inspect でテストをデバッグ**

```bash
# Chrome DevTools でテストをデバッグ
$ node --inspect-brk ./node_modules/.bin/jest --runInBand

# 別のターミナルで
$ node --inspect ./node_modules/.bin/jest --runInBand

# Chrome で chrome://inspect を開く
# "Inspect" をクリックして DevTools を起動
```

**DevToolsでの手順:**
1. **Sources** タブを開く
2. 問題のテストファイルにブレークポイントを設定
3. useEffect の中にブレークポイント
4. **Step Over (F10)** で1行ずつ実行
5. **Watch** で依存配列の値を監視

**監視する変数:**
```javascript
// Watch expressions in Chrome DevTools
config                  // オブジェクトの参照が変わっているか
JSON.stringify(config)  // 値は同じか
renderCount.current     // 何回レンダリングされたか
```

---

**方法 6: Performance API でボトルネックを特定**

```typescript
// app/hooks/useStockData.ts
import { useQuery } from '@tanstack/react-query';

export function useStockData({ symbol }: { symbol: string }) {
  const startTime = performance.now();
  
  const result = useQuery({
    queryKey: ['stock', symbol],
    queryFn: async () => {
      const fetchStart = performance.now();
      const data = await fetchStockData(symbol);
      const fetchEnd = performance.now();
      
      console.log(`📊 Fetch time: ${(fetchEnd - fetchStart).toFixed(2)}ms`);
      return data;
    },
  });
  
  useEffect(() => {
    const endTime = performance.now();
    console.log(`⏱️ Hook execution: ${(endTime - startTime).toFixed(2)}ms`);
  }, [result.dataUpdatedAt]);
  
  return result;
}
```

**期待される出力 (正常):**
```
📊 Fetch time: 125.45ms
⏱️ Hook execution: 128.30ms
(1回のみ出力、その後60秒間隔)
```

**異常な出力 (無限ループ):**
```
📊 Fetch time: 125.45ms
⏱️ Hook execution: 128.30ms
📊 Fetch time: 126.12ms
⏱️ Hook execution: 129.01ms
📊 Fetch time: 124.89ms
⏱️ Hook execution: 127.78ms
... (continues every 100-200ms)
```

---

**クイックチェックリスト (無限ループ診断):**

```bash
#!/bin/bash
# scripts/diagnose-infinite-loop.sh

echo "🔍 Infinite Loop Diagnostic Tool"
echo "================================="

# 1. useEffect の依存配列をチェック
echo "1. Checking useEffect dependencies..."
grep -rn "useEffect" app/components/ --include="*.tsx" | \
  grep -E "\[.*\{.*\}\]" && \
  echo "❌ Found object in dependency array" || \
  echo "✅ No objects in dependency arrays"

# 2. TanStack Query の設定をチェック
echo "2. Checking TanStack Query config..."
grep -rn "refetchInterval.*0" app/ --include="*.ts" --include="*.tsx" && \
  echo "❌ Found refetchInterval: 0" || \
  echo "✅ No invalid refetchInterval"

# 3. 無限再レンダリングの兆候をチェック
echo "3. Checking for render loops..."
npm test -- --testTimeout=3000 --silent 2>&1 | \
  grep -i "timeout\|exceeded" && \
  echo "❌ Test timeout detected (possible infinite loop)" || \
  echo "✅ No test timeouts"

# 4. CPU使用率をモニタリング
echo "4. Monitoring CPU usage during dev server..."
npm run dev &
DEV_PID=$!
sleep 5
CPU=$(ps -p $DEV_PID -o %cpu | tail -n 1)
kill $DEV_PID

if (( $(echo "$CPU > 80" | bc -l) )); then
  echo "❌ High CPU usage: ${CPU}% (possible infinite loop)"
else
  echo "✅ Normal CPU usage: ${CPU}%"
fi

echo "================================="
echo "Diagnostic complete. Review output above."
```

```bash
# 実行
$ chmod +x scripts/diagnose-infinite-loop.sh
$ ./scripts/diagnose-infinite-loop.sh
```

---

### Issue 2: Zod バリデーションエラーが本番で発生
**症状:**
```
ZodError: [
  {
    "code": "invalid_type",
    "expected": "number",
    "received": "string",
    "path": ["price"]
  }
]
```

**原因:** 
- API レスポンスの形式が環境で異なる
- 古いキャッシュデータが残っている
- API バージョンの不一致

**診断:**
```typescript
// API が返す実際のデータを記録
try {
  return DataSchema.parse(json);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('Validation failed:', error.errors);
    console.error('Received data:', JSON.stringify(json, null, 2));
    console.error('Expected schema:', DataSchema);
  }
  throw error;
}
```

**Solution:**
```typescript
// 1. スキーマを実際のデータに合わせる
const DataSchema = z.object({
  price: z.union([z.number(), z.string()]).transform(val => 
    typeof val === 'string' ? parseFloat(val) : val
  ),
});

// 2. strict モードで未知のキーを拒否
const DataSchema = z.object({
  id: z.string(),
  value: z.number(),
}).strict(); // 定義外のキーがあればエラー

// 3. デフォルト値を設定
const DataSchema = z.object({
  price: z.number().default(0),
  change: z.number().optional(),
});

// 4. 詳細なエラーメッセージ
const DataSchema = z.object({
  price: z.number({
    required_error: "Price is required",
    invalid_type_error: "Price must be a number",
  }),
});
```

**Verification:**
```bash
# スキーマのテストを作成
npm test -- schemas/stock.test.ts

# 実際の API レスポンスでテスト
curl https://api.example.com/stocks/AAPL | jq . > test-data.json
node -e "const schema = require('./app/lib/schemas/stock').StockDataSchema; \
         const data = require('./test-data.json'); \
         console.log(schema.parse(data));"
```

---

#### Zod バリデーション包括テストガイド (Comprehensive Zod Testing Guide)

Zodスキーマの品質を保証するため、以下のテストパターンを必ず実装してください。

**テストファイル構成:**
```bash
app/lib/schemas/
├── stock.ts                    # スキーマ定義
├── __tests__/
│   ├── stock.test.ts           # スキーマのユニットテスト
│   └── stock.integration.test.ts # APIとの統合テスト
```

---

**パターン 1: 基本的なバリデーションテスト**

```typescript
// app/lib/schemas/__tests__/stock.test.ts
import { describe, test, expect } from '@jest/globals';
import { StockDataSchema } from '../stock';

describe('StockDataSchema', () => {
  test('accepts valid stock data', () => {
    const validData = {
      symbol: 'AAPL',
      price: 150.00,
      change: 2.50,
      changePercent: 1.69,
      volume: 50000000,
      lastUpdated: '2024-01-01T12:00:00Z',
    };
    
    const result = StockDataSchema.parse(validData);
    expect(result).toEqual(validData);
  });
  
  test('rejects data with missing required fields', () => {
    const invalidData = {
      symbol: 'AAPL',
      // price が欠落
      change: 2.50,
    };
    
    expect(() => StockDataSchema.parse(invalidData)).toThrow();
  });
  
  test('rejects negative price', () => {
    const invalidData = {
      symbol: 'AAPL',
      price: -150.00, // ❌ 負の価格
      change: 0,
      changePercent: 0,
      volume: 0,
      lastUpdated: '2024-01-01T12:00:00Z',
    };
    
    expect(() => StockDataSchema.parse(invalidData)).toThrow('positive');
  });
  
  test('rejects negative volume', () => {
    const invalidData = {
      symbol: 'AAPL',
      price: 150.00,
      change: 0,
      changePercent: 0,
      volume: -1000, // ❌ 負の出来高
      lastUpdated: '2024-01-01T12:00:00Z',
    };
    
    expect(() => StockDataSchema.parse(invalidData)).toThrow('nonnegative');
  });
  
  test('rejects invalid datetime format', () => {
    const invalidData = {
      symbol: 'AAPL',
      price: 150.00,
      change: 0,
      changePercent: 0,
      volume: 0,
      lastUpdated: 'not-a-datetime', // ❌ 不正な日時
    };
    
    expect(() => StockDataSchema.parse(invalidData)).toThrow('datetime');
  });
  
  test('rejects symbol with special characters', () => {
    const invalidData = {
      symbol: 'A@PL', // ❌ 特殊文字
      price: 150.00,
      change: 0,
      changePercent: 0,
      volume: 0,
      lastUpdated: '2024-01-01T12:00:00Z',
    };
    
    // シンボルに英数字のみを許可する場合
    expect(() => StockDataSchema.parse(invalidData)).toThrow();
  });
});
```

---

**パターン 2: 変換と正規化のテスト**

```typescript
// app/lib/schemas/stock.ts (変換を含むスキーマ)
import { z } from 'zod';

export const StockDataSchema = z.object({
  symbol: z.string().min(1).max(10).transform(s => s.toUpperCase()),
  price: z.union([z.number(), z.string()]).transform(val => 
    typeof val === 'string' ? parseFloat(val) : val
  ),
  volume: z.union([z.number(), z.string()]).transform(val => {
    const num = typeof val === 'string' ? parseInt(val, 10) : val;
    return isNaN(num) ? 0 : num;
  }),
  lastUpdated: z.string().datetime().transform(s => new Date(s)),
});

// app/lib/schemas/__tests__/stock.test.ts (変換のテスト)
describe('StockDataSchema with transformations', () => {
  test('transforms symbol to uppercase', () => {
    const data = {
      symbol: 'aapl', // 小文字
      price: 150.00,
      volume: 1000,
      lastUpdated: '2024-01-01T12:00:00Z',
    };
    
    const result = StockDataSchema.parse(data);
    expect(result.symbol).toBe('AAPL'); // 大文字に変換
  });
  
  test('converts string price to number', () => {
    const data = {
      symbol: 'AAPL',
      price: '150.00', // 文字列
      volume: 1000,
      lastUpdated: '2024-01-01T12:00:00Z',
    };
    
    const result = StockDataSchema.parse(data);
    expect(result.price).toBe(150.00);
    expect(typeof result.price).toBe('number');
  });
  
  test('converts datetime string to Date object', () => {
    const data = {
      symbol: 'AAPL',
      price: 150.00,
      volume: 1000,
      lastUpdated: '2024-01-01T12:00:00Z',
    };
    
    const result = StockDataSchema.parse(data);
    expect(result.lastUpdated).toBeInstanceOf(Date);
    expect(result.lastUpdated.getFullYear()).toBe(2024);
  });
  
  test('handles edge case of invalid string to number conversion', () => {
    const data = {
      symbol: 'AAPL',
      price: 'not-a-number', // ❌ 数値に変換できない
      volume: 1000,
      lastUpdated: '2024-01-01T12:00:00Z',
    };
    
    expect(() => StockDataSchema.parse(data)).toThrow();
  });
});
```

---

**パターン 3: APIレスポンスとの統合テスト**

```typescript
// app/lib/schemas/__tests__/stock.integration.test.ts
import { describe, test, expect, jest } from '@jest/globals';
import { fetchStockData } from '@/lib/api/stockClient';
import { StockDataSchema } from '../stock';

// 実際のAPIレスポンスのサンプル
const mockAPIResponse = {
  '01. symbol': 'AAPL',
  '05. price': '150.00',
  '06. volume': '50000000',
  '09. change': '2.50',
  '10. change percent': '1.69%',
  'lastRefreshed': '2024-01-01 12:00:00',
};

describe('Stock API integration with Zod', () => {
  test('parses real API response format', () => {
    // API形式を内部形式に変換
    const transformedData = {
      symbol: mockAPIResponse['01. symbol'],
      price: parseFloat(mockAPIResponse['05. price']),
      volume: parseInt(mockAPIResponse['06. volume'], 10),
      change: parseFloat(mockAPIResponse['09. change']),
      changePercent: parseFloat(mockAPIResponse['10. change percent'].replace('%', '')),
      lastUpdated: new Date(mockAPIResponse.lastRefreshed).toISOString(),
    };
    
    // Zodでバリデーション
    expect(() => StockDataSchema.parse(transformedData)).not.toThrow();
  });
  
  test('catches API format changes', () => {
    const unexpectedFormat = {
      ticker: 'AAPL', // ❌ 'symbol' ではなく 'ticker'
      price: 150.00,
      volume: 1000,
      lastUpdated: '2024-01-01T12:00:00Z',
    };
    
    // スキーマが変更を検出
    expect(() => StockDataSchema.parse(unexpectedFormat)).toThrow();
  });
  
  test('validates multiple API responses in batch', () => {
    const batchData = [
      { symbol: 'AAPL', price: 150, volume: 1000, lastUpdated: '2024-01-01T12:00:00Z' },
      { symbol: 'GOOGL', price: 2800, volume: 2000, lastUpdated: '2024-01-01T12:00:00Z' },
      { symbol: 'MSFT', price: 350, volume: 3000, lastUpdated: '2024-01-01T12:00:00Z' },
    ];
    
    // すべてのデータが有効であることを確認
    batchData.forEach(data => {
      expect(() => StockDataSchema.parse(data)).not.toThrow();
    });
  });
});
```

---

**パターン 4: エラーメッセージのカスタマイズとテスト**

```typescript
// app/lib/schemas/stock.ts (カスタムエラーメッセージ)
export const StockDataSchema = z.object({
  symbol: z.string({
    required_error: "シンボルは必須です",
    invalid_type_error: "シンボルは文字列である必要があります",
  }).min(1, "シンボルは1文字以上である必要があります")
    .max(10, "シンボルは10文字以内である必要があります"),
  
  price: z.number({
    required_error: "価格は必須です",
    invalid_type_error: "価格は数値である必要があります",
  }).positive("価格は正の数である必要があります"),
  
  volume: z.number({
    required_error: "出来高は必須です",
    invalid_type_error: "出来高は数値である必要があります",
  }).int("出来高は整数である必要があります")
    .nonnegative("出来高は0以上である必要があります"),
});

// app/lib/schemas/__tests__/stock.test.ts (エラーメッセージのテスト)
describe('StockDataSchema error messages', () => {
  test('provides custom error message for missing symbol', () => {
    const data = {
      price: 150,
      volume: 1000,
      lastUpdated: '2024-01-01T12:00:00Z',
    };
    
    try {
      StockDataSchema.parse(data);
      fail('Should have thrown an error');
    } catch (error) {
      expect(error.errors[0].message).toBe('シンボルは必須です');
    }
  });
  
  test('provides custom error message for negative price', () => {
    const data = {
      symbol: 'AAPL',
      price: -150, // ❌ 負の価格
      volume: 1000,
      lastUpdated: '2024-01-01T12:00:00Z',
    };
    
    try {
      StockDataSchema.parse(data);
      fail('Should have thrown an error');
    } catch (error) {
      expect(error.errors[0].message).toBe('価格は正の数である必要があります');
    }
  });
  
  test('provides custom error message for non-integer volume', () => {
    const data = {
      symbol: 'AAPL',
      price: 150,
      volume: 1000.5, // ❌ 小数
      lastUpdated: '2024-01-01T12:00:00Z',
    };
    
    try {
      StockDataSchema.parse(data);
      fail('Should have thrown an error');
    } catch (error) {
      expect(error.errors[0].message).toBe('出来高は整数である必要があります');
    }
  });
});
```

---

**パターン 5: 本番環境のエラー監視**

```typescript
// app/lib/api/stockClient.ts (本番環境用エラーハンドリング)
import { StockDataSchema, type StockData } from '@/lib/schemas/stock';
import * as Sentry from '@sentry/nextjs'; // エラー追跡ツール

export async function fetchStockData(symbol: string): Promise<StockData> {
  const response = await fetch(`/api/stocks?symbol=${encodeURIComponent(symbol)}`);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const json = await response.json();
  
  try {
    return StockDataSchema.parse(json);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // 本番環境でバリデーションエラーを記録
      const validationError = {
        symbol,
        errors: error.errors,
        receivedData: json,
        timestamp: new Date().toISOString(),
      };
      
      // エラートラッキングサービスに送信
      Sentry.captureException(error, {
        extra: validationError,
        tags: { type: 'zod_validation_error' },
      });
      
      // 開発環境では詳細をログ出力
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Zod Validation Error:');
        console.error('Symbol:', symbol);
        console.error('Errors:', error.errors);
        console.error('Received:', JSON.stringify(json, null, 2));
      }
      
      throw new Error(`API response validation failed: ${error.errors[0].message}`);
    }
    throw error;
  }
}
```

**本番エラー監視のテスト:**
```typescript
// app/lib/api/__tests__/stockClient.production.test.ts
import { fetchStockData } from '../stockClient';
import * as Sentry from '@sentry/nextjs';

jest.mock('@sentry/nextjs');

describe('Production error monitoring', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  test('sends Zod validation errors to Sentry', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ price: 'invalid' }), // ❌ 不正なデータ
    });
    
    await expect(fetchStockData('AAPL')).rejects.toThrow();
    
    // Sentryにエラーが送信されたことを確認
    expect(Sentry.captureException).toHaveBeenCalled();
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: { type: 'zod_validation_error' },
      })
    );
  });
});
```

---

**検証チェックリスト:**
```bash
# 1. すべてのスキーマテストを実行
$ npm test -- schemas/

# 2. カバレッジを確認
$ npm test -- schemas/ --coverage
# 期待: 100% カバレッジ（スキーマは小さいので完全カバレッジを目指す）

# 3. 実際のAPIレスポンスでテスト
$ curl https://api.example.com/stocks/AAPL > test-response.json
$ node -e "
  const schema = require('./app/lib/schemas/stock').StockDataSchema;
  const data = require('./test-response.json');
  try {
    const result = schema.parse(data);
    console.log('✅ Validation passed:', result);
  } catch (error) {
    console.error('❌ Validation failed:', error.errors);
  }
"

# 4. 本番環境のエラーログを確認（デプロイ後）
# Sentry または CloudWatch Logs で 'zod_validation_error' を検索
```

### Issue 3: `'use client'` を追加してもエラーが解決しない
**症状:**
```
Error: useState only works in Client Components
```

**原因:** 
- サーバーコンポーネントからクライアント専用機能を使用
- `'use client'` の位置が間違っている
- 親コンポーネントがサーバーコンポーネント

**診断:**
```typescript
// ❌ Bad: Server component using client hooks
export default function Page() {
  const [state, setState] = useState(0); // Error!
  return <div>{state}</div>;
}

// ❌ Bad: 'use client' が import の後
import { useState } from 'react';
'use client'; // Too late!

// ❌ Bad: Server component importing client without boundary
// app/page.tsx (Server Component)
import { Counter } from './Counter'; // Counter uses useState
export default function Page() {
  return <Counter />;
}
```

**Solution:**
```typescript
// ✅ Good: Separate client component
// app/components/Counter.tsx
'use client';

import { useState } from 'react';

export function Counter() {
  const [state, setState] = useState(0);
  return (
    <div>
      <p>Count: {state}</p>
      <button onClick={() => setState(state + 1)}>Increment</button>
    </div>
  );
}

// ✅ Good: Server component imports client component
// app/page.tsx
import { Counter } from '@/components/Counter';

export default function Page() {
  // Server component - no hooks
  const data = await fetchData(); // Server-side data fetching
  
  return (
    <div>
      <h1>Server Component</h1>
      <Counter /> {/* Client component boundary */}
    </div>
  );
}
```

**Architecture Pattern:**
```
app/
├── page.tsx                 (Server Component)
│   └── imports ClientWrapper
├── components/
│   ├── ClientWrapper.tsx    ('use client' - boundary)
│   │   └── imports Counter
│   └── Counter.tsx          (Client Component)
```

**Verification:**
```bash
# クライアントコンポーネントを確認
grep -r "'use client'" app/ --include="*.tsx"

# useState/useEffect が Server Component にないか確認
grep -r "useState\|useEffect" app/page.tsx app/layout.tsx
```

---

### Issue 4: マージ後にパッケージのバージョンが競合
**症状:**
```bash
$ npm install
npm ERR! Found: react@19.0.0
npm ERR! Could not resolve dependency:
npm ERR! peer react@"^18.0.0" from @some/package@1.0.0
```

**原因:** 
- 複数のブランチで異なるバージョンをインストール
- peer dependency の不一致
- npm vs pnpm vs yarn の混在

**診断:**
```bash
# 競合しているパッケージを特定
npm list react
npm list react-dom

# ロックファイルの重複を確認
ls -la | grep -E "package-lock|pnpm-lock|yarn.lock"
```

**Solution:**
```bash
# 1. クリーンインストール
rm -rf node_modules package-lock.json pnpm-lock.yaml yarn.lock

# 2. プロジェクト標準（npm）で再インストール
npm install

# 3. 特定パッケージを更新
npm install react@latest react-dom@latest

# 4. peer dependency の警告を解決
npm install --legacy-peer-deps  # 一時的な回避策

# 5. バージョンの固定
npm install react@19.0.0 --save-exact

# 6. package.json の整合性確認
cat package.json | jq '.dependencies'

# 7. ロックファイルをコミット
git add package-lock.json
git commit -m "chore: resolve package version conflicts"
```

**Prevention:**
```json
// package.json で範囲を制限
{
  "engines": {
    "node": ">=18.0.0 <20.0.0",
    "npm": ">=9.0.0"
  },
  "packageManager": "npm@9.8.1"
}
```

**Verification:**
```bash
# すべての依存関係が解決されているか確認
npm list --depth=0

# セキュリティ問題がないか確認
npm audit

# 重複パッケージがないか確認
npm dedupe
npm list --all | grep -E "deduped"
```

---

### Issue 5: テストで async/await が正しく動作しない
**症状:**
```typescript
test('fetches data', async () => {
  const data = await fetchData();
  expect(data).toBeDefined(); // Passes but data is undefined
});
```

**原因:**
- Promise が reject されているがキャッチされていない
- モックが同期的に返している
- waitFor を使っていない

**Solution:**
```typescript
// ✅ Good: Proper async testing
test('fetches data correctly', async () => {
  // 1. モックが Promise を返すことを確認
  jest.spyOn(api, 'fetchData').mockResolvedValue({ id: 1, name: 'Test' });
  
  // 2. await で結果を待つ
  const data = await fetchData();
  
  // 3. 検証
  expect(data).toEqual({ id: 1, name: 'Test' });
});

// ✅ Good: Testing React async updates
test('displays fetched data', async () => {
  render(<DataComponent />);
  
  // findBy* は要素が表示されるまで待機
  const element = await screen.findByText('Test Data');
  expect(element).toBeInTheDocument();
  
  // または waitFor を使用
  await waitFor(() => {
    expect(screen.getByText('Test Data')).toBeInTheDocument();
  });
});

// ✅ Good: Testing error cases
test('handles fetch error', async () => {
  jest.spyOn(api, 'fetchData').mockRejectedValue(new Error('Network error'));
  
  await expect(fetchData()).rejects.toThrow('Network error');
});
```

---

### Issue 6: E2E テストが CI で失敗するがローカルでは成功
**症状:**
```
CI: ✗ Login test - Timeout waiting for element
Local: ✓ Login test
```

**原因:**
- タイムアウトが短すぎる
- CI 環境の CPU/メモリが遅い
- ヘッドレスモードでの描画の違い
- 環境変数の不一致

**Solution:**
```typescript
// playwright.config.ts
export default defineConfig({
  timeout: 30000, // ローカル: 10s, CI: 30s
  expect: {
    timeout: 10000,
  },
  retries: process.env.CI ? 2 : 0, // CI で 2 回リトライ
  workers: process.env.CI ? 1 : undefined, // CI では並列実行を制限
  use: {
    baseURL: process.env.CI 
      ? 'http://localhost:3000' 
      : 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: process.env.CI ? 'on' : 'off',
  },
});
```

**Debugging:**
```bash
# CI と同じ環境でローカル実行
CI=true npm run test:e2e

# ヘッドレスモードで実行
npm run test:e2e:headed=false

# スクリーンショットとトレースを有効化
npm run test:e2e -- --trace on --screenshot on

# CI ログからトレースをダウンロード
playwright show-trace trace.zip
```

---

### Issue 7: ビルドは成功するが実行時エラー
**症状:**
```bash
$ npm run build
✓ Build successful

$ npm start
Error: Cannot find module '@/lib/utils'
```

**原因:**
- ケース sensitive な問題（macOS vs Linux）
- パスエイリアスの設定ミス
- 動的インポートの問題

**Solution:**
```typescript
// tsconfig.json のパスエイリアスを確認
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./app/*"]
    }
  }
}

// next.config.js でも同様に設定
module.exports = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'app'),
    };
    return config;
  },
};
```

**Verification:**
```bash
# ケースsensitiveな問題を検出
find app/ -name "*.ts" -o -name "*.tsx" | while read file; do
  grep -i "from.*utils" "$file" && echo "Check case: $file"
done

# ビルド後の出力を確認
npm run build
ls -la .next/server/app/

# プロダクションモードで起動
NODE_ENV=production npm start
```

## 📚 References

- **TanStack Query**: https://tanstack.com/query/latest
- **Zod**: https://zod.dev
- **React 19 Guide**: https://react.dev/blog/2024/04/25/react-19
- **Next.js App Router**: https://nextjs.org/docs/app
- **Testing Library**: https://testing-library.com/docs/react-testing-library/intro

## 🎯 Success Criteria (成功基準)

プロジェクト安定化が**成功したと判断する定量的・定性的基準**。

### ✅ Zero Errors (エラーゼロ)

**定量基準:**
```bash
# 1. TypeScript
npx tsc --noEmit
# Expected: "Found 0 errors. Watching for file changes."

# 2. ESLint
npm run lint
# Expected: "✓ No ESLint errors or warnings"

# 3. Tests
npm test
# Expected: "Tests: X passed, 0 failed, 0 skipped"
# Expected: "Snapshots: X passed"
```

**合格条件:**
- TypeScript エラー: **0**
- ESLint エラー: **0**
- ESLint 警告: **0** （新規追加なし）
- テスト失敗: **0**
- スナップショット不一致: **0**

---

### ✅ No Regressions (機能デグレードなし)

**定性基準:**
以下のすべてが正常に動作すること:

**コア機能:**
- [ ] ユーザー認証（ログイン/ログアウト）
- [ ] 株価データの取得と表示
- [ ] チャートの描画（リアルタイム更新含む）
- [ ] 予測機能（ML モデルの実行）
- [ ] バックテスト機能
- [ ] ポートフォリオ管理

**UI/UX:**
- [ ] すべてのページが正しく表示される
- [ ] ナビゲーションが機能する
- [ ] フォームの送信が正常
- [ ] ローディング状態が適切に表示される
- [ ] エラーメッセージが表示される

**パフォーマンス:**
```bash
# Lighthouse スコア（オプション）
npm run lighthouse

# Expected:
# Performance: ≥ 90
# Accessibility: ≥ 90
# Best Practices: ≥ 90
# SEO: ≥ 90
```

**検証方法:**
```bash
# 1. 開発サーバーを起動
npm run dev

# 2. ブラウザで主要なユーザーフローをテスト
# - ログイン → ダッシュボード → 株価検索 → チャート表示 → ログアウト

# 3. コンソールエラーがないことを確認
# - ブラウザ DevTools の Console タブ
# - Network タブでエラーレスポンスがないか確認

# 4. E2E テストを実行
npm run test:e2e
```

---

### ✅ Improved Quality (品質向上)

**定量基準:**

1. **テストカバレッジ ≥ 80%**
```bash
npm test -- --coverage
# Expected:
# Statements   : 82.5% ( X/Y )
# Branches     : 80.1% ( X/Y )
# Functions    : 83.2% ( X/Y )
# Lines        : 82.8% ( X/Y )
```

2. **コード品質スコア**
```bash
# Cyclomatic Complexity（循環的複雑度）
npx eslint app/ --ext .ts,.tsx --format json | \
  jq '[.[] | .messages[] | select(.ruleId == "complexity")] | length'
# Expected: 0 (複雑度 10 以上の関数なし)

# 重複コード
npx jscpd app/ --threshold 5
# Expected: "No duplications found"
```

3. **Bundle Size（バンドルサイズ）**
```bash
npm run build
ls -lh .next/static/chunks/pages/*.js | awk '{print $5}'
# Expected: 
# - First Load JS: ≤ 200 KB
# - 個別ページ: ≤ 50 KB
```

**マージ前後の比較:**
```bash
# Before merge
Total coverage: 78.5%
Bundle size: 187 KB
Lint warnings: 23

# After merge
Total coverage: 82.3% (+3.8%) ✅
Bundle size: 192 KB (+5 KB) ✅
Lint warnings: 0 (-23) ✅
```

**合格条件:**
- カバレッジ: 維持または向上
- バンドルサイズ: +10% 以内
- Lint 警告: 減少または同じ

---

### ✅ Documentation Updated (ドキュメント更新)

**必須更新項目:**

1. **環境変数の変更**
```bash
# .env.example が最新か確認
git diff main -- .env.example

# すべての環境変数が文書化されているか
grep "^[A-Z_]*=" .env.example | wc -l
grep -r "process.env." app/ --include="*.ts" | \
  sed 's/.*process\.env\.\([A-Z_]*\).*/\1/' | sort -u | wc -l
# Expected: 両方の数が一致
```

2. **API の変更**
```bash
# 破壊的変更があれば CHANGELOG.md に記録
git diff main -- app/api/

# If changes exist:
# - Update docs/API.md
# - Add entry to CHANGELOG.md
# - Update OpenAPI schema (if applicable)
```

3. **README.md の更新**
```bash
# セットアップ手順が変わった場合
git diff main -- README.md

# 新しい機能が追加された場合
# - README.md の Features セクションを更新
# - 使用例を追加
```

**チェックリスト:**
- [ ] `.env.example` が最新
- [ ] `CHANGELOG.md` に変更を記録
- [ ] `README.md` が最新の手順を反映
- [ ] `docs/API.md` が最新（API 変更がある場合）
- [ ] 複雑なロジックにコメントを追加
- [ ] パブリック API に JSDoc を追加

---

### ✅ CI Passing (CI チェック成功)

**GitHub Actions ワークフロー:**

すべてのジョブが緑（✅）であること:

```yaml
# .github/workflows/ci.yml の各ステップ
✅ Install dependencies
✅ Type check (TypeScript)
✅ Lint (ESLint)
✅ Unit tests (Jest)
✅ E2E tests (Playwright)
✅ Build (Next.js)
✅ Security audit (npm audit)
```

**検証方法:**
```bash
# ローカルで CI と同じコマンドを実行
npm ci
npx tsc --noEmit
npm run lint
npm test -- --coverage
npm run test:e2e
npm run build
npm audit --production
```

**CI ログの確認:**
```bash
# GitHub CLI を使用
gh run list --branch feature/my-branch
gh run view <run-id> --log

# すべてのステップが成功していることを確認
gh run view <run-id> --json conclusion -q '.jobs[].conclusion'
# Expected: すべて "success"
```

---

### 📊 Success Report Template (成功レポートテンプレート)

安定化完了時に以下の形式でレポートを作成:

```markdown
# Project Stabilization Success Report

## Date: 2024-01-15
## Branch: feature/project-stabilization
## Author: @username

---

## ✅ Quantitative Results

### Errors
- TypeScript: 0 errors (was: 15)
- ESLint: 0 errors, 0 warnings (was: 23 warnings)
- Tests: 247 passed, 0 failed (was: 198 passed, 49 failed)

### Quality Metrics
- Test Coverage: 82.5% (was: 67.3%, +15.2%)
- Build Time: 45s (was: 52s, -13%)
- Bundle Size: 192 KB (was: 187 KB, +2.7%)

### CI/CD
- All checks: ✅ Passing
- Deployment: ✅ Successful
- Performance: ✅ No regressions

---

## ✅ Qualitative Results

### Features Verified
- [x] User authentication
- [x] Stock data fetching
- [x] Chart rendering
- [x] ML predictions
- [x] Backtesting
- [x] Portfolio management

### Improvements
1. Migrated 12 components to TanStack Query
2. Added Zod validation to 8 API routes
3. Resolved 15 TypeScript errors
4. Fixed 49 failing tests
5. Updated 3 outdated dependencies

---

## 📝 Documentation

### Updated Files
- [x] `.env.example` - Added new environment variables
- [x] `CHANGELOG.md` - Documented breaking changes
- [x] `README.md` - Updated setup instructions
- [x] `docs/ARCHITECTURE.md` - Added TanStack Query patterns

---

## 🚀 Next Steps

1. Monitor production metrics for 24 hours
2. Gather user feedback
3. Plan next modernization phase (Zustand → TanStack Query mutations)

---

## 🔗 Related PRs

- #988: Data Quality Panel Refactor
- #1000: Core Service Stabilization
- #1012: Project Stabilizer Skill Enhancement

---

**Conclusion:** Project stabilization completed successfully. All quality gates passed. Ready for production deployment.
```

---

### 成功後のアクション (Post-Success Actions)

すべての基準を満たしたら:

1. **マージして main にデプロイ**
```bash
git checkout main
git merge --no-ff feature/stabilization
git push origin main
```

2. **リリースタグを作成**
```bash
git tag -a v1.2.0 -m "Release v1.2.0: Project Stabilization Complete"
git push origin v1.2.0
```

3. **チームに通知**
```markdown
## 🎉 Project Stabilization Complete!

**Summary:**
- ✅ 0 TypeScript errors
- ✅ 0 ESLint warnings
- ✅ 82.5% test coverage
- ✅ All CI checks passing

**Key Improvements:**
- Migrated 12 components to TanStack Query
- Added runtime validation with Zod
- Fixed 49 failing tests
- Improved build time by 13%

**Documentation:**
All docs updated and ready for team review.

cc: @team
```

4. **次のイテレーションを計画**
- マージ後の監視期間を設定（24-48時間）
- 次のモダン化対象を特定
- 技術的負債の優先順位付け
