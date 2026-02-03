# 🟢 LOW: テストカバレッジ可視化不足

## 問題の説明

`npm run test:coverage` はローカルで実行可能ですが、CIパイプラインでカバレッジレポートが自動的に公開されていません。コードカバレッジの進捗をチームで追跡困難です。

```bash
# 現在の状態
npm run test:coverage  # ローカル実行可能だが、レポートは一時ファイル
# 出力例:
# -------------------|----------|----------|----------|----------|-------------------|
# File               |  % Stmts | % Branch |  % Funcs |  % Lines | Uncovered Line #s |
# -------------------|----------|----------|----------|----------|-------------------|
# -------------------|----------|----------|----------|----------|-------------------|
# All files          |   XX.XX% |   XX.XX% |   XX.XX% |   XX.XX% |
```

## 影響範囲

- **現在のワークフロー**: GitHub Actions の `test.yml` で coverage 収集
- **問題点**: レポートがアーティファクトとして保存されない、可視化なし
- **目標**: カバレッジ ≥ 80%（README.md に記載）

## 推奨解決策

### 1. Codecov 導入（推奨）

```bash
# 無料プランで十分
npm install --save-dev @codecov/clobber @codecov/uploader-js
codecov
```

`.github/workflows/test.yml` に追加：

```yaml
- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/coverage-final.json
    flags: unittests
    name: codecov-umbrella
    fail_ci_if_error: false
```

`README.md` にバッジ追加：

```markdown
[![codecov](https://codecov.io/gh/kaenozu/Ult/branch/main/graph/badge.svg)](https://codecov.io/gh/kaenozu/Ult)
```

### 2. GitHub Native アーティファクト（Codecov不要）

テストワークフローにアーティファクト保存：

```yaml
- name: Upload coverage reports
  uses: actions/upload-artifact@v3
  with:
    name: coverage-report
    path: coverage/
```

さらに `coverage-summary.json` を解析してPRコメント：

```yaml
- name: Comment coverage on PR
  uses: maks-zh/coverage-comment-action@v1
  env:
    COVERAGE_FILE: coverage/coverage-summary.json
```

### 3. カバレッジ閾値の自動チェック

`jest.config.js` に設定：

```javascript
module.exports = {
  // ... 既存設定
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './app/components/**/*.tsx': {
      branches: 70,
      functions: 70
    }
  },
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    '!app/**/*.d.ts',
    '!app/**/node_modules/**',
    '!**/vendor/**'
  ]
};
```

これにより、カバレッジが閾値を下回るとビルド失敗。

### 4. coverage-badge の自動更新

ローカルでバッジ生成：

```bash
npx coverage-badge-creator --output=coverage.svg
```

`README.md` に静的バッジ追加：

```markdown
![Coverage](coverage.svg)
```

GitHub Actions で `coverage.svg` を自動コミット：

```yaml
- name: Generate coverage badge
  run: |
    npx coverage-badge-creator --output=badge.svg
    # git add と commit
```

### 5. カバレッジ追跡ダッシュボード

独自スクリプト `scripts/coverage-trend.ts`：

```typescript
import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';

// 毎日カバレッジ収集、DB保存、トレンドグラフ生成
const coverage = JSON.parse(
  execSync('cat coverage/coverage-summary.json').toString()
);

// Supabaseに保存
await supabase
  .from('coverage_metrics')
  .insert({ date: new Date(), metrics: coverage });
```

## 受入基準

- [ ] Codecov または GitHub-native でカバレッジ公開
- [ ] `README.md` にライブカバレッジバッジ表示
- [ ] PRコメントに差分カバレッジ自動投稿
- [ ] カバレッジ閾値（80%）を jacken、ビルド失敗
- [ ] トレンド分析ダッシュボード（オプション）

## 関連ファイル

- `trading-platform/package.json:9` (`test:coverage` script)
- `trading-platform/jest.config.js` (または `jest.config.ts`)
- `.github/workflows/test.yml`
- `README.md:3` (既存のバッジ)
- `docs/QUALITY_GATES.md` (カバレッジ要件)

## 優先度

**P3 - LOW**: 品質メトリクス可視化のため、開発体験向上

---

**作成日**: 2026-02-02  
**レビュアー**: Code Review Summary  
**プロジェクト**: ULT Trading Platform
