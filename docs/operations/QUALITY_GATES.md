# Quality Gates System

## 概要

Quality Gates は、プルリクエストが本番環境にマージされる前に、コードの品質とセキュリティ基準を自動的に検証するシステムです。

## 品質基準

すべてのプルリクエストは、以下の品質基準を満たす必要があります：

### 1. テストカバレッジ ≥ 80% ✅

**基準**: すべてのメトリクス（Lines, Branches, Functions, Statements）で 80% 以上

**測定方法**: Jest による単体テスト実行時に自動計測

**設定ファイル**: `trading-platform/jest.config.js`

```javascript
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
}
```

**ローカル確認**:
```bash
cd trading-platform
npm run test:coverage
```

**改善方法**:
- 未テストのファイルにテストを追加
- エッジケースのテストを追加
- カバレッジレポート（`coverage/index.html`）を確認

---

### 2. TypeScript エラー = 0 ✅

**基準**: TypeScript コンパイルエラーが 0 件

**検証方法**: `tsc --noEmit` で型チェック

**ローカル確認**:
```bash
cd trading-platform
npx tsc --noEmit
```

**改善方法**:
- 型定義を追加
- `any` 型を避ける
- strict モードに準拠

---

### 3. ESLint エラー = 0 ✅

**基準**: ESLint ルール違反が 0 件

**設定ファイル**: `trading-platform/eslint.config.mjs`

**ローカル確認**:
```bash
cd trading-platform
npm run lint
```

**自動修正**:
```bash
cd trading-platform
npm run lint:fix
```

**改善方法**:
- コーディング規約に従う
- 自動修正を実行
- 必要に応じて例外を設定（慎重に）

---

### 4. セキュリティ脆弱性 = 0（High以上） ✅

**基準**: High/Critical レベルの脆弱性が 0 件

**検証方法**: `npm audit --audit-level=high`

**ローカル確認**:
```bash
cd trading-platform
npm audit --audit-level=high
```

**自動修正**:
```bash
cd trading-platform
npm audit fix
```

**改善方法**:
- `npm audit fix` で自動修正
- 依存関係の更新
- 代替パッケージの検討
- 脆弱性が修正されるまで待つ

---

### 5. バンドルサイズ監視 📊

**基準**: ビルドサイズの増加を監視（目安: 500KB 以下）

**測定方法**: Next.js ビルド後の `.next` ディレクトリサイズ

**ローカル確認**:
```bash
cd trading-platform
npm run build
du -sh .next
```

**改善方法**:
- 動的インポートの活用
- 不要な依存関係の削除
- Tree-shaking の最適化
- 画像の最適化

---

## ワークフロー

### トリガー

Quality Gates ワークフローは以下のタイミングで自動実行されます：

- **プルリクエスト作成時**
- **プルリクエストへのコミット時**
- **手動実行**（workflow_dispatch）

### 実行順序

```
1. Setup (Node.js, dependencies)
   ↓
2. Test Coverage Check (80% threshold)
   ↓
3. TypeScript Type Check (0 errors)
   ↓
4. ESLint Check (0 errors)
   ↓
5. Security Audit (0 high+ vulnerabilities)
   ↓
6. Build & Bundle Size Analysis
   ↓
7. Generate Quality Report
```

すべてのチェックが成功すると、ワークフローは ✅ Passed となります。

---

## ローカルでの実行

### 全チェックを実行

```bash
#!/bin/bash
# quality-check.sh

cd trading-platform

echo "📋 Running Quality Gates checks..."
echo ""

# 1. Test Coverage
echo "1️⃣ Checking test coverage (≥80%)..."
npm run test:coverage
if [ $? -ne 0 ]; then
  echo "❌ Coverage check failed!"
  exit 1
fi
echo "✅ Coverage passed"
echo ""

# 2. TypeScript
echo "2️⃣ Checking TypeScript types..."
npx tsc --noEmit
if [ $? -ne 0 ]; then
  echo "❌ TypeScript check failed!"
  exit 1
fi
echo "✅ TypeScript passed"
echo ""

# 3. ESLint
echo "3️⃣ Checking ESLint..."
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ ESLint check failed!"
  exit 1
fi
echo "✅ ESLint passed"
echo ""

# 4. Security
echo "4️⃣ Checking security vulnerabilities..."
npm audit --audit-level=high
if [ $? -ne 0 ]; then
  echo "❌ Security check failed!"
  exit 1
fi
echo "✅ Security passed"
echo ""

# 5. Build
echo "5️⃣ Building application..."
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Build failed!"
  exit 1
fi
echo "✅ Build passed"
echo ""

echo "🎉 All quality gates passed!"
```

### 個別チェックの実行

```bash
# カバレッジのみ
npm run test:coverage

# 型チェックのみ
npx tsc --noEmit

# Lint のみ
npm run lint

# セキュリティのみ
npm audit --audit-level=high

# ビルドのみ
npm run build
```

---

## 失敗時の対処法

### 🔴 Coverage Failed

**原因**: テストカバレッジが 80% 未満

**対処法**:
1. カバレッジレポートを確認
   ```bash
   cd trading-platform
   npm run test:coverage
   open coverage/index.html
   ```
2. 未カバーのファイルを特定
3. テストを追加
4. 再度テストを実行

### 🔴 TypeScript Failed

**原因**: 型エラーがある

**対処法**:
1. エラーメッセージを確認
   ```bash
   npx tsc --noEmit
   ```
2. 該当箇所を修正
3. 再度型チェックを実行

### 🔴 ESLint Failed

**原因**: コーディング規約違反

**対処法**:
1. 自動修正を試す
   ```bash
   npm run lint:fix
   ```
2. 手動で修正が必要な箇所を確認
   ```bash
   npm run lint
   ```
3. 修正後に再度チェック

### 🔴 Security Failed

**原因**: High/Critical レベルの脆弱性が検出

**対処法**:
1. 脆弱性の詳細を確認
   ```bash
   npm audit
   ```
2. 自動修正を試す
   ```bash
   npm audit fix
   ```
3. 手動対応が必要な場合
   - 依存関係を更新
   - 代替パッケージを検討
   - パッチを適用

### 🔴 Build Failed

**原因**: ビルドエラー

**対処法**:
1. エラーメッセージを確認
2. ビルドキャッシュをクリア
   ```bash
   rm -rf .next
   npm run build
   ```
3. エラー内容に応じて修正

---

## CI/CD との連携

Quality Gates は以下の GitHub Actions ワークフローと連携します：

### 依存関係

```yaml
Quality Gates
├── Lint Workflow
├── Test Workflow
├── Security Workflow
└── Build Workflow
```

### ステータスバッジ

README にステータスバッジを追加できます：

```markdown
[![Quality Gates](https://github.com/kaenozu/Ult/actions/workflows/quality-gates.yml/badge.svg)](https://github.com/kaenozu/Ult/actions/workflows/quality-gates.yml)
```

---

## ベストプラクティス

### 1. コミット前にローカルチェック

```bash
# pre-commit hook の例
cd trading-platform
npm run lint && npx tsc --noEmit && npm test
```

### 2. PR 作成前に全チェック

```bash
# 全 Quality Gates を実行
cd trading-platform
npm run lint && \
npx tsc --noEmit && \
npm run test:coverage && \
npm audit --audit-level=high && \
npm run build
```

### 3. 定期的な依存関係の更新

```bash
# 週次で実行推奨
cd trading-platform
npm outdated
npm update
npm audit fix
```

### 4. カバレッジを維持

- 新機能にはテストを追加
- バグ修正にはリグレッションテストを追加
- カバレッジが下がらないようにする

### 5. セキュリティの監視

- Dependabot を有効化
- 定期的に `npm audit` を実行
- 脆弱性アラートに迅速に対応

---

## 設定のカスタマイズ

### カバレッジ閾値の変更

`trading-platform/jest.config.js`:
```javascript
coverageThreshold: {
  global: {
    branches: 85,    // 変更可能
    functions: 85,   // 変更可能
    lines: 85,       // 変更可能
    statements: 85,  // 変更可能
  },
}
```

### ESLint ルールの変更

`trading-platform/eslint.config.mjs`:
```javascript
export default [
  // ルールを追加/変更
]
```

### セキュリティレベルの変更

`.github/workflows/quality-gates.yml`:
```yaml
# moderate, high, critical から選択
npm audit --audit-level=moderate
```

---

## トラブルシューティング

### ワークフローが実行されない

**確認事項**:
- PR が `main` または `develop` ブランチに対して作成されているか
- ワークフローファイルに構文エラーがないか
- GitHub Actions が有効化されているか

### タイムアウトする

**対処法**:
- テストの実行時間を確認
- 不要なテストを削除
- テストの並列実行を検討

### 依存関係のインストールエラー

**対処法**:
```bash
cd trading-platform
rm -rf node_modules package-lock.json
npm install
```

---

## 参考リンク

- [Jest Coverage Configuration](https://jestjs.io/docs/configuration#coveragethreshold-object)
- [TypeScript Compiler Options](https://www.typescriptlang.org/tsconfig)
- [ESLint Configuration](https://eslint.org/docs/latest/use/configure/)
- [npm audit Documentation](https://docs.npmjs.com/cli/v10/commands/npm-audit)
- [Next.js Build Optimization](https://nextjs.org/docs/pages/building-your-application/optimizing)

---

## サポート

問題が発生した場合：

1. このドキュメントのトラブルシューティングセクションを確認
2. [CI/CD Guide](./CI_CD_GUIDE.md) を参照
3. GitHub Issues で報告
4. チームに相談

---

**最終更新**: 2026-02-01  
**メンテナー**: Development Team  
**ステータス**: ✅ Active
