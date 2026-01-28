# Release Manager Skill

## 概要
コード改善からリリースまでのワークフロー全体を管理するスキル。品質改善、テスト実行、Git操作、PR作成を一貫したプロセスとして実行する。

## 前提条件
- Git リポジトリが初期化されていること
- 適切なブランチ戦略が存在すること（main/master ブランチ）
- GitHub リモートリポジトリが設定されていること

## 1. 品質改善サイクル (Quality Improvement Cycle)

### 1.1 問題の分析と優先順位付け

#### 実行手順
```bash
# 1. コードベースの全体分析
# Explore エージェントを使用してプロジェクト構造を把握

# 2. 問題カテゴリの特定
# - P0 (Critical): セキュリティ、データ損失リスク
# - P1 (High): 型安全性、エラーハンドリング
# - P2 (Medium): 重複コード、パフォーマンス
# - P3 (Low): コードスタイル、命名規則
```

#### 優先順位フレームワーク
```
P0 (Critical) - 即時対応
├── APIキーの露出
├── SQLインジェクション/XSS脆弱性
└── データ損失リスク

P1 (High) - 早期対応
├── TypeScript型安全性
├── エラーハンドリング統一
└── メモリリーク防止

P2 (Medium) - 計画的対応
├── 重複コード削除
├── パフォーマンス改善
└── テストカバレッジ向上

P3 (Low) - 随時対応
├── コードスタイル統一
├── 命名規則適用
└── ドキュメント整備
```

### 1.2 コード改善の実行

#### P0: セキュリティ修正
```typescript
// ❌ 誤り: APIキーがハードコード
const API_KEY = "hardcoded_key";

// ✅ 正解: 環境変数を使用
const API_KEY = process.env.API_KEY!;
```

#### P1: 型安全性
```typescript
// ❌ 誤り: any型
function processData(data: any) { ... }

// ✅ 正解: 具体的な型定義
interface Data {
  id: string;
  value: number;
}
function processData(data: Data) { ... }
```

#### P2: エラーハンドリング統一
```typescript
// 統一エラークラス
export class APIError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'APIError';
  }
}
```

#### P3: メモリリーク防止
```typescript
// AbortController パターン
const abortControllerRef = useRef<AbortController | null>(null);

useEffect(() => {
  return () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };
}, []);
```

## 2. テスト戦略 (Test Strategy)

### 2.1 テストカバレッジ分析

#### 実行手順
```bash
# カバレッジレポート生成
npm test -- --coverage

# カバレッジ不足ファイルの特定
# coverage/lcov-report/index.html を確認
```

#### テストピラミッド
```
        /\
       /E2E\      5-10% - クリティカルパス
      /------\
     /統合テスト\    20-30% - API連携
    /------------\
   /  単体テスト   \  60-75% - コンポーネント/関数
  /----------------\
```

### 2.2 E2Eテスト追加

#### Playwright構成
```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }},
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }},
    { name: 'webkit', use: { ...devices['Desktop Safari'] }},
  ],
});
```

#### テストシナリオ例
```typescript
test.describe('Main Features', () => {
  test('ページが正しく表示される', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Trader Pro/);
  });

  test('銘柄をクリックしてチャートが更新される', async ({ page }) => {
    await page.click('text=任天堂');
    await expect(page.locator('text=任天堂')).toBeVisible();
  });
});
```

### 2.3 テスト実行
```bash
# 全テスト実行
npx playwright test

# ヘッドモードで実行（デバッグ用）
npx playwright test --headed

# 特定のテストファイル実行
npx playwright test e2e/main.spec.ts
```

## 3. Git ワークフロー (Git Workflow)

### 3.1 ブランチ作成と切り替え
```bash
# 機能ブランチ作成
git checkout -b feature/feature-name

# ブランチ名の規則
# feature/xxx - 新機能
# fix/xxx - バグ修正
# refactor/xxx - リファクタリング
# test/xxx - テスト追加
# docs/xxx - ドキュメント更新
```

### 3.2 変更のステージングとコミット
```bash
# 変更内容の確認
git status
git diff

# ファイルをステージング
git add path/to/file.ts
# または特定パターン
git add *.ts

# コミット作成
git commit -m "$(cat <<'EOF'
feat: add comprehensive error handling

- Added APIError base class with error code support
- Implemented RateLimitError for API quota management
- Added validateAlphaVantageResponse() helper
- Updated all API calls to use unified error handling

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

#### コミットメッセージ規則
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type:**
- `feat`: 新機能
- `fix`: バグ修正
- `refactor`: リファクタリング
- `test`: テスト追加/修正
- `docs`: ドキュメント更新
- `chore`: ビルド/設定変更

### 3.3 プッシュとPR作成
```bash
# リモートブランチにプッシュ
git push -u origin feature/feature-name

# PR作成
gh pr create --title "PR Title" --body "PR Description"
```

## 4. PR 作成のベストプラクティス

### 4.1 PR テンプレート
```markdown
## Summary
[1-2文で変更内容を説明]

### Changes
- **[Category]**: [変更点]
- **[Category]**: [変更点]

### Breaking Changes
[破壊的変更がある場合は記述]

## Test plan
- [x] 単体テストパス
- [x] E2Eテストパス
- [x] 手動テスト完了

## Screenshots (if applicable)
[スクリーンショット]

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

### 4.2 PR レビューチェックリスト
```markdown
## コード品質
- [ ] TypeScriptエラーなし
- [ ] ESLint警告なし
- [ ] 適切なエラーハンドリング
- [ ] 重複コードの削除

## テスト
- [ ] 新しいテスト追加
- [ ] 既存テストパス
- [ ] E2Eテストパス

## ドキュメント
- [ ] コメント追加
- [ ] README更新（必要な場合）
- [ ] 変更ログ更新（必要な場合）
```

## 5. CI/CD 統合

### 5.1 GitHub Actions ワークフロー
```yaml
name: Quality Gate

on:
  pull_request:
    branches: [main]

jobs:
  quality-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm test
      - run: npx playwright test
```

### 5.2 品質ゲート
```
品質ゲート通過条件:
✅ Lint エラー: 0
✅ 型エラー: 0
✅ テスト成功率: 100%
✅ カバレッジ低下: なし
✅ E2Eテスト: 全パス
```

## 6. リリースチェックリスト

### 6.1 リリース前確認
```bash
# 1. ブランチが最新であること
git fetch origin
git rebase origin/main

# 2. 全テストパス
npm test && npx playwright test

# 3. ビルド成功
npm run build

# 4. 型チェックパス
npm run type-check
```

### 6.2 マージ後作業
```bash
# 1. main ブランチに切り替え
git checkout main
git pull origin main

# 2. develop ブランチを更新（必要な場合）
git checkout develop
git merge main
git push origin develop

# 3. リリースタグ作成（必要な場合）
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

## 7. トラブルシューティング

| 問題 | 原因 | 対処法 |
|------|------|--------|
| コミットできない | ファイルがステージされていない | `git add` を実行 |
| プッシュ失敗 | リモートと競合 | `git pull --rebase` |
| テスト失敗 | コード変更の影響 | 変更を修正またはテスト更新 |
| PR作成失敗 | ブランチがプッシュされていない | `git push -u origin` |

## 8. 完全ワークフロー例

```bash
# 1. 機能ブランチ作成
git checkout -b feature/error-handling

# 2. コード変更
# (エディタでファイル編集)

# 3. 品質チェック
npm run lint -- --fix
npm run type-check
npm test

# 4. ステージングとコミット
git add .
git commit -m "feat: add unified error handling

- Added APIError base class
- Implemented RateLimitError
- Updated API calls

Co-Authored-By: Claude <noreply@anthropic.com>"

# 5. E2Eテスト実行
npx playwright test

# 6. プッシュ
git push -u origin feature/error-handling

# 7. PR作成
gh pr create --title "feat: add unified error handling" --body "$(cat <<'EOF'
## Summary
Implement unified error handling for all API calls

### Changes
- **Error Handling**: Added APIError, RateLimitError classes
- **Type Safety**: Added comprehensive API type definitions
- **Memory**: Added AbortController for cleanup

## Test plan
- [x] Unit tests pass
- [x] E2E tests pass
- [x] Manual testing completed

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
