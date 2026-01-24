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

#ウォッチモードで実行
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

### 結果の分析
- APIレスポンスの検証
- データ整合性の確認
- エラーハンドリングの動作確認

## 3. E2Eテスト実行 (E2E Test Execution)
ブラウザを使用したエンドツーエンドのテストを実行する。

### 実行手順
```bash
# PlaywrightでE2Eテスト実行
npx playwright test

# ヘッドレスモードで実行
npx playwright test --headed=false

# 特定のテストファイル実行
npx playwright test tests/e2e/checkout.spec.ts

# デバッグモードで実行
npx playwright test --debug
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

### テストシナリオ
1. **ユーザー登録**: フォーム入力 → 送信 → 確認メール
2. **商品購入**: 商品選択 → カート追加 → 決済
3. **ログイン**: 認証 → ダッシュボード表示
4. **データ更新**: 編集 → 保存 → 反映確認

## 4. テスト結果の可視化 (Test Reporting)

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

### JUnit XML形式
```xml
<testsuites name="Test Suite">
  <testsuite name="Unit Tests" tests="10" failures="1" skipped="0">
    <testcase name="should render correctly">
      <failure message="Expected 'Hello' but got 'Goodbye'"/>
    </testcase>
  </testsuite>
</testsuites>
```

## 5. CI/CD統合

### GitHub Actions
```yaml
- name: Run tests
  run: npm test

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

### テスト結果の通知
- **成功**: 緑色のチェックマーク
- **失敗**: 赤色の×マーク + 詳細ログ
- **カバレッジ低下**: 警告メッセージ

## 6. 自動テスト戦略

### テストピラミッド
```
        /\
       /E2E\      少ない、高価値
      /------\
     /統合テスト\    中程度
    /------------\
   /  単体テスト   \  多い、高速
  /----------------\
```

### テスト駆動開発（TDD）
1. テストを先に書く
2. テストが失敗することを確認
3. 実装を書く
4. テストがパスすることを確認
5. リファクタリング

## 7. トラブルシューティング

| 問題 | 原因 | 対処法 |
|------|------|--------|
| テストがタイムアウト | 非同期処理の待機不足 | `waitFor` を使用 |
| フリッキーテスト | タイミング依存 | リトライを追加 |
| カバレッジが低い | テスト不足 | 新規テスト追加 |
| メモリリーク | クリーンアップ漏れ | `afterEach` で後処理 |
