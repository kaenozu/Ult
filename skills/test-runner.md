# Test Runner Skill

## 概要
テストを自動実行して結果を報告するスキル。単体テスト、統合テスト、E2Eテストの実行と結果の可視化を行う。

## 前提条件
- プロジェクトにテストフレームワークが設定されていること（Jest, Vitest, Playwright等）
- package.json にテストスクリプトが定義されていること

## 1. 単体テスト実行 (Unit Test Execution)
個々の関数、コンポーネント、モジュールをテストする。

### 実行手順
```bash
# 全単体テスト実行
npm test

# 特定のファイルのみ実行
npm test -- path/to/test.spec.ts

# ウォッチモードで実行
npm test -- --watch

# カバレッジレポート付き
npm test -- --coverage
```

### MCPツール使用例
```javascript
// テスト実行
Bash("npm test")

// 特定パターンのテストのみ実行
Bash("npm test -- --testNamePattern='should render'")
```

### 結果の分析
- ✅ **成功**: 全テストパス
- ⚠️ **警告**: 一部テストがスキップ
- ❌ **失敗**: テスト失敗、エラー発生

## 2. 統合テスト実行 (Integration Test Execution)
複数のモジュールが連携する動作をテストする。

### 実行手順
```bash
# 統合テスト実行
npm run test:integration

# APIエンドポイントのテスト
npm run test:api

# データベース統合テスト
npm run test:db
```

### テスト対象
- APIルートとレスポンス
- データベース操作
- 外部サービスとの連携
- ステート管理の統合

## 3. E2Eテスト実行 (E2E Test Execution)
ブラウザを使用したエンドツーエンドのテストを実行する。

### Playwright 設定

#### playwright.config.ts
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

### 実行手順
```bash
# PlaywrightでE2Eテスト実行
npx playwright test

# ヘッドレスモードで実行
npx playwright test --headed=false

# 特定のテストファイル実行
npx playwright test e2e/main.spec.ts

# デバッグモードで実行
npx playwright test --debug

# レポートを開く
npx playwright show-report
```

### E2Eテスト記述パターン

#### メイン機能のテスト
```typescript
test.describe('Trader Pro - メイン機能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('ページが正しく表示される', async ({ page }) => {
    await expect(page).toHaveTitle(/Trader Pro/);
    await expect(page.locator('h1')).toContainText('TRADER PRO');
  });

  test('銘柄をクリックしてチャートが更新される', async ({ page }) => {
    await page.click('text=任天堂');
    await expect(page.locator('text=6146')).toBeVisible();
  });

  test('時間足を切り替える', async ({ page }) => {
    await page.click('button:has-text("1m")');
    await page.waitForTimeout(1000);

    await page.click('button:has-text("5m")');
    await page.waitForTimeout(1000);

    const button5m = page.locator('button:has-text("5m")');
    await expect(button5m).toHaveClass(/focus/);
  });
});
```

#### ナビゲーションのテスト
```typescript
test.describe('Trader Pro - ナビゲーション', () => {
  test('各ページに遷移できる', async ({ page }) => {
    await page.goto('/');

    await page.click('a:has-text("ヒートマップ")');
    await expect(page).toHaveURL(/\/heatmap/);

    await page.click('a:has-text("ジャーナル")');
    await expect(page).toHaveURL(/\/journal/);

    await page.click('a:has-text("スクリーナー")');
    await expect(page).toHaveURL(/\/screener/);
  });
});
```

#### エラーハンドリングのテスト
```typescript
test.describe('Trader Pro - エラーハンドリング', () => {
  test('無効な銘柄コードでエラーが表示されないこと', async ({ page }) => {
    await page.fill('[placeholder="銘柄検索"]', 'INVALID_TICKER');
    await page.press('Enter');

    await expect(page).not.toHaveURL(/\/error/);
  });

  test('APIエラー時に適切に処理されること', async ({ page }) => {
    await page.goto('/screener');
    await expect(page.locator('h1')).toBeVisible();
  });
});
```

### Chrome DevTools MCPとの統合
```javascript
// ブラウザでE2Eテスト実行
navigate_page("http://localhost:3000/checkout")
fill("#email", "test@example.com")
fill("#password", "password123")
click("#login-button")
wait_for("Welcome", timeout=5000)
take_screenshot()
```

## 4. モンキーテスト (Monkey Testing)
ランダムなUI操作で予期せぬバグを発見するテスト。

### モンキーテストスクリプト

#### scripts/monkey-test.js
```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('http://localhost:3000');

  // ランダムクリックを実行
  for (let i = 0; i < 50; i++) {
    try {
      const buttons = await page.$$('button, a, [role="button"]');
      if (buttons.length > 0) {
        const randomButton = buttons[Math.floor(Math.random() * buttons.length)];
        await randomButton.click({ timeout: 1000 });
        await page.waitForTimeout(500);
      }
    } catch (e) {
      console.log(`Click ${i} failed:`, e.message);
    }
  }

  await browser.close();
})();
```

### 実行手順
```bash
# モンキーテスト実行
node scripts/monkey-test.js

# 結果チェック
node scripts/check-monkey-test-results.js
```

### GitHub Actions 連携
```yaml
name: Monkey Test

on:
  schedule:
    - cron: '0 0 * * *'  # 毎日実行
  workflow_dispatch:

jobs:
  monkey-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run dev &
      - run: npx playwright test
      - run: node scripts/monkey-test.js
```

## 5. テスト結果の可視化 (Test Reporting)

### レポート形式
```markdown
# 🧪 テスト実行レポート

## サマリー
- テストスイート: [名前]
- 実行日時: [日時]
- 環境: [開発/ステージング/本番]

## 結果
| 項目 | 結果 |
|------|------|
| 全テスト数 | [数] |
| 成功 | [数] |
| 失敗 | [数] |
| スキップ | [数] |
| カバレッジ | [%] |

## 失敗したテスト
### [テスト名]
- **ファイル**: [パス:行]
- **エラー**: [エラーメッセージ]
- **スタックトレース**: [トレース]

## カバレッジレポート
| ファイル | ステートメント | 分岐 | 関数 | 行 |
|---------|--------------|------|------|-----|
| [ファイル] | [%] | [%] | [%] | [%] |
```

### Playwright HTML レポート
```bash
# レポート生成
npx playwright test

# レポートを開く
npx playwright show-report
```

## 6. CI/CD統合

### GitHub Actions
```yaml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Run E2E tests
        run: npx playwright test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

### テスト結果の通知
- **成功**: 緑色のチェックマーク
- **失敗**: 赤色の×マーク + 詳細ログ
- **カバレッジ低下**: 警告メッセージ

## 7. 自動テスト戦略

### テストピラミッド
```
        /\
       /E2E\      少ない、高価値 (5-10%)
      /------\
     /統合テスト\    中程度 (20-30%)
    /------------\
   /  単体テスト   \  多い、高速 (60-75%)
  /----------------\
```

### テスト駆動開発（TDD）
1. テストを先に書く
2. テストが失敗することを確認
3. 実装を書く
4. テストがパスすることを確認
5. リファクタリング

### テストカバレッジ目標
| ファイルタイプ | 目標カバレッジ |
|---------------|----------------|
| ユーティリティ | 90%+ |
| API/データ層 | 80%+ |
| コンポーネント | 70%+ |
| ページ/E2E | クリティカルパス100% |

## 8. トラブルシューティング

| 問題 | 原因 | 対処法 |
|------|------|--------|
| テストがタイムアウト | 非同期処理の待機不足 | `waitFor` を使用 |
| フリッキーテスト | タイミング依存 | リトライを追加 |
| カバレッジが低い | テスト不足 | 新規テスト追加 |
| メモリリーク | クリーンアップ漏れ | `afterEach` で後処理 |
| E2Eが失敗 | サーバー未起動 | `webServer` 設定を確認 |
| モン�テストがクラッシュ | 予期せぬUI状態 | エラーハンドリング追加 |
