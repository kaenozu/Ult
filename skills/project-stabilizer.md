---
name: project-stabilizer
description: Post-merge recovery and test stabilization specialist. Resolves inconsistencies after large merges and migrates to modern tech stack (TanStack Query, Zod, React 19).
version: 1.1.0
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
echo "=== Integration Health Check ==="
echo ""

echo "📦 Dependencies"
npm list --depth=0 2>&1 | grep -E "UNMET|missing" && echo "❌ FAIL" || echo "✅ PASS"
echo ""

echo "🔍 TypeScript"
npx tsc --noEmit >/dev/null 2>&1 && echo "✅ PASS (0 errors)" || echo "❌ FAIL"
echo ""

echo "📏 ESLint"
npm run lint >/dev/null 2>&1 && echo "✅ PASS" || echo "❌ FAIL"
echo ""

echo "🧪 Tests"
npm test -- --passWithNoTests --silent >/dev/null 2>&1 && echo "✅ PASS" || echo "❌ FAIL"
echo ""

echo "🏗️ Build"
npm run build >/dev/null 2>&1 && echo "✅ PASS" || echo "❌ FAIL"
echo ""

echo "🎯 E2E"
npm run test:e2e >/dev/null 2>&1 && echo "✅ PASS" || echo "❌ FAIL"
echo ""

# Exit with error if any check failed
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
  **If fails:** `npm install` を再実行。それでも失敗なら `package-lock.json` を削除して `npm install`

- [ ] **TypeScript 型チェック**
  ```bash
  npx tsc --noEmit
  ```
  **Expected:** `Found 0 errors.`
  **If fails:** エラー箇所を修正。`any` 型は絶対に使わない

- [ ] **ESLint チェック**
  ```bash
  npm run lint
  ```
  **Expected:** `✓ No ESLint errors or warnings`
  **If fails:** `npm run lint:fix` で自動修正可能なものを修正。残りは手動修正

- [ ] **ユニットテストの実行**
  ```bash
  npm test -- --passWithNoTests --coverage
  ```
  **Expected:** 
  - `Tests: X passed, 0 failed`
  - `Coverage: ≥ 80% statements, branches, functions, lines`
  **If fails:** 失敗したテストを修正。新しいコードには必ずテストを追加

- [ ] **ビルドの成功**
  ```bash
  npm run build
  ```
  **Expected:** `Build completed successfully`
  **If fails:** ビルドエラーを修正。通常は型エラーかインポート問題

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
