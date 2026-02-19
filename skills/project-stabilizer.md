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

**Example:**
```bash
cd trading-platform
npm test -- --passWithNoTests
npm run lint
npx tsc --noEmit
```

**Expected Output:**
- List of failing tests
- TypeScript errors count
- ESLint warnings/errors

### Step 2: 基盤修復 (Base Fix)
認証や環境変数など、システムの根幹に関わる不整合を `AuthStore` や `env.ts` の導入により最優先で修正する。

**Example:**
```typescript
// Before: Scattered authentication state
// app/api/auth/route.ts - independent state
// app/components/Login.tsx - local state

// After: Centralized AuthStore
// app/lib/auth/AuthStore.ts
export class AuthStore {
  private static instance: AuthStore;
  private users = new Map<string, User>();
  
  static getInstance(): AuthStore {
    if (!AuthStore.instance) {
      AuthStore.instance = new AuthStore();
    }
    return AuthStore.instance;
  }
}
```

### Step 3: UI/ロジックの安定化
壊れたコンポーネントのテストを、最新のライブラリ（RTL等）のパスに合わせて修正する。

**Example:**
```typescript
// Before: Using old testing patterns
import { render } from '@testing-library/react';

test('renders component', () => {
  const { getByText } = render(<MyComponent />);
  expect(getByText('Hello')).toBeInTheDocument();
});

// After: React 19 compatible patterns
import { render, screen } from '@testing-library/react';
import { expect, test } from '@jest/globals';

test('renders component with modern patterns', async () => {
  render(<MyComponent />);
  const element = await screen.findByText('Hello');
  expect(element).toBeDefined();
});
```

### Step 4: モダン化 (Modernization)
修正した箇所を順次 TanStack Query や Zod を用いたベストプラクティスコードに昇華させる。

**Example:**
```typescript
// Before: Manual fetch with useEffect
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetch('/api/data')
    .then(res => res.json())
    .then(setData)
    .finally(() => setLoading(false));
}, []);

// After: TanStack Query with Zod validation
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

const DataSchema = z.object({
  id: z.string(),
  value: z.number(),
});

export function useData() {
  return useQuery({
    queryKey: ['data'],
    queryFn: async () => {
      const res = await fetch('/api/data');
      const json = await res.json();
      return DataSchema.parse(json);
    },
  });
}
```

### Step 5: 一括統合 (Orchestration)
複数のPRや競合ブランチを、依存関係を考慮しながら順次 `main` へ統合し、最終的な健全性を全件テストで証明する。

**Workflow:**
```bash
# 1. Merge base branches first
git checkout main
git pull origin main

# 2. Integrate feature branches in dependency order
git merge --no-ff feature/auth-store
npm test && npm run lint

git merge --no-ff feature/data-fetching
npm test && npm run lint

# 3. Final verification
npm run build
npm run test:e2e
```

## ⚠️ 禁止事項
- `any` 型の放置。
- 警告（Warning）を無視したマージ。
- サーバー/クライアント境界を意識しない `'use client'` の濫用。

## ✅ Verification Checklist (検証チェックリスト)

プロジェクト安定化作業を完了する前に、以下を確認してください：

### 基本検証
- [ ] すべてのテストがパスする (`npm test`)
- [ ] TypeScript エラーがゼロ (`npx tsc --noEmit`)
- [ ] ESLint エラーがゼロ (`npm run lint`)
- [ ] ビルドが成功する (`npm run build`)

### マージ後の品質
- [ ] マージ前と比較して機能のデグレードがない
- [ ] 新しい警告が追加されていない
- [ ] テストカバレッジが維持または改善されている
- [ ] パッケージマネージャーのロックファイルが統一されている（npm のみ）

### モダン化の確認
- [ ] 新しいコードは TanStack Query を使用している（該当する場合）
- [ ] API レスポンスに Zod バリデーションが適用されている（該当する場合）
- [ ] React 19 のベストプラクティスに準拠している
- [ ] `'use client'` ディレクティブが適切に配置されている

### ドキュメント
- [ ] 大きな変更には適切なコメントがある
- [ ] 破壊的変更があればドキュメントが更新されている
- [ ] 環境変数の変更が `.env.example` に反映されている

## 🔧 Common Troubleshooting (よくある問題と解決策)

### Issue: テストが無限ループする
**Cause:** useEffect の依存配列が不適切、または TanStack Query の設定ミス

**Solution:**
```typescript
// Bad: Missing dependencies
useEffect(() => {
  fetchData(userId);
}, []); // userId changes not detected

// Good: Proper dependencies or use TanStack Query
const { data } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
});
```

### Issue: Zod バリデーションエラーが本番で発生
**Cause:** 開発環境とAPIレスポンスの不一致

**Solution:**
```typescript
// Add detailed error logging
const DataSchema = z.object({
  id: z.string(),
  value: z.number(),
}).strict(); // Reject unknown keys

try {
  return DataSchema.parse(json);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('Validation failed:', error.errors);
    console.error('Received data:', json);
  }
  throw error;
}
```

### Issue: `'use client'` を追加してもエラーが解決しない
**Cause:** サーバーコンポーネントからクライアント専用機能を使用

**Solution:**
```typescript
// Bad: Server component using client hooks
export default function Page() {
  const [state, setState] = useState(0); // Error!
  return <div>{state}</div>;
}

// Good: Separate client component
'use client';
export function Counter() {
  const [state, setState] = useState(0);
  return <div>{state}</div>;
}

// Server component imports client component
export default function Page() {
  return <Counter />;
}
```

### Issue: マージ後にパッケージのバージョンが競合
**Cause:** 複数のブランチで異なるバージョンをインストール

**Solution:**
```bash
# Remove conflicting lock files
rm -rf node_modules package-lock.json

# Use project standard (npm)
npm install

# Verify versions
npm list <package-name>

# Commit updated lock file
git add package-lock.json
git commit -m "chore: resolve package version conflicts"
```

## 📚 References

- **TanStack Query**: https://tanstack.com/query/latest
- **Zod**: https://zod.dev
- **React 19 Guide**: https://react.dev/blog/2024/04/25/react-19
- **Next.js App Router**: https://nextjs.org/docs/app
- **Testing Library**: https://testing-library.com/docs/react-testing-library/intro

## 🎯 Success Criteria (成功基準)

プロジェクト安定化が成功したと判断する基準：

1. **Zero Errors**: TypeScript エラー、ESLint エラー、テスト失敗がすべてゼロ
2. **No Regressions**: 既存の機能がすべて正常に動作する
3. **Improved Quality**: コードカバレッジとコード品質が向上または維持されている
4. **Documentation Updated**: 重要な変更がドキュメントに反映されている
5. **CI Passing**: すべての CI チェックがパスする

成功したら、変更を main ブランチにマージし、次のモダン化作業に進みます。
