# Agent Skill: Test Automation & Quality Assurance

## 概要
このスキルは、Trading Platformプロジェクトでの自動テスト実行と品質保証のワークフローを定義します。

## 適用シナリオ
- PRマージ前のテスト実行
- バグ修正後の回帰テスト
- 新機能追加時のテスト作成

## テスト実行ワークフロー

### Phase 1: ユニットテスト

```bash
# 全ユニットテスト実行
cd trading-platform && npm test

# カバレッジ付き
npm run test:coverage

# 失敗したテストのみ再実行
npm test -- --onlyFailures

# 特定ファイルのテスト
npm test -- app/lib/analysis.test.ts
npm test -- --testPathPattern="riskManagement"

# ウォッチモード（開発時）
npm run test:watch
```

### Phase 2: 統合テスト

```bash
# APIルートのテスト
npm test -- app/api/market/__tests__/route.test.ts

# コンポーネントテスト
npm test -- app/components/__tests__/SignalCard.test.tsx
```

### Phase 3: E2Eテスト（Playwright）

```bash
# 全E2Eテスト実行
npm run test:e2e

# ヘッドレスモード
npx playwright test

# ヘッド付き（デバッグ用）
npx playwright test --headed

# UIモード
npm run test:e2e:ui

# 特定テストファイル
npx playwright test main.spec.ts

# タイムアウト延長
npx playwright test --timeout=120000

# デバッグモード
npx playwright test --debug
```

## テスト失敗時の対応

### 1. スナップショットテスト失敗

```bash
# スナップショット更新
npm test -- --updateSnapshot

# 特定ファイルのみ更新
npm test -- app/components/__tests__/Header.test.tsx --updateSnapshot
```

### 2. タイムアウトエラー

```bash
# タイムアウト値を増加
npm test -- --testTimeout=30000
```

### 3. メモリリーク検出

```bash
# メモリ使用量監視
npm test -- --detectOpenHandles
npm test -- --logHeapUsage
```

## CI/CD統合

### GitHub Actionsワークフロー

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm test -- --coverage
      - run: npm run test:e2e
```

## 品質チェック自動化

### マージ前必須チェック

```bash
#!/bin/bash
# pre-merge-check.sh

echo "🔍 Running pre-merge checks..."

# 1. Lintチェック
npm run lint || exit 1

# 2. TypeScript型チェック
npx tsc --noEmit || exit 1

# 3. ユニットテスト
npm test -- --passWithNoTests || exit 1

# 4. ビルドテスト
npm run build || exit 1

echo "✅ All checks passed!"
```

### 自動品質レポート

```bash
# テストカバレッジレポート生成
npm run test:coverage

# カバレッジ閾値チェック
npx nyc check-coverage --lines 80 --functions 80 --branches 70
```

## テスト戦略ガイドライン

### 優先度

1. **Critical機能のテスト**
   - 注文実行ロジック
   - 損益計算
   - WebSocket接続

2. **セキュリティ関連テスト**
   - 認証ミドルウェア
   - 入力検証
   - XSS防止

3. **UIコンポーネントテスト**
   - ErrorBoundary
   - フォーム入力
   - ナビゲーション

### テスト作成パターン

```typescript
// Jestテストパターン
describe('Component', () => {
  beforeEach(() => {
    // セットアップ
  });

  afterEach(() => {
    // クリーンアップ
    cleanup();
  });

  it('should render correctly', () => {
    render(<Component />);
    expect(screen.getByText('expected')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    render(<Component />);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByText('result')).toBeInTheDocument();
  });
});
```

## トラブルシューティング

### よくある問題

1. **モジュール解決エラー**
   ```bash
   # Jest設定確認
   cat jest.config.js
   ```

2. **環境変数不足**
   ```bash
   # テスト環境変数設定
   cp .env.example .env.test
   ```

3. **タイムゾーン問題**
   ```bash
   # UTC設定
   TZ=UTC npm test
   ```

## 関連ドキュメント
- FOR_OPENCODE.md - テスト戦略
- .github/skills/pr-management.md - PRマージ前テスト
- .github/skills/debugging.md - テスト失敗時のデバッグ
