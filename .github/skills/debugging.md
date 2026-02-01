# Agent Skill: Debugging & Error Resolution

## 概要
このスキルは、トレーディングプラットフォームにおけるデバッグとエラー解決の自動化ガイドラインです。

## 適用トリガー（CLAUDE.md準拠）
- 「デバッグして」「画面のデバッグ」
- 「バグってる」「動かない」「エラー」
- 「ブラウザで確認」「画面を操作」

## 自動デバッグワークフロー

### Phase 1: 問題の特定

```bash
# 1. エラーログの確認
npm test 2>&1 | grep -i "error\|fail"

# 2. TypeScriptエラーの確認
cd trading-platform && npx tsc --noEmit

# 3. Lintエラーの確認
npm run lint

# 4. 最近の変更確認
git log --oneline -5
```

### Phase 2: ブラウザ自動デバッグ

```typescript
// Chrome DevTools MCPを使用した自動診断
// スクリーンショット取得
chrome-devtools_take_screenshot({ fullPage: true });

// コンソールログ収集
chrome-devtools_list_console_messages();

// ネットワークリクエスト確認
chrome-devtools_list_network_requests();

// ページスナップショット取得
chrome-devtools_take_snapshot({ verbose: true });
```

### Phase 3: 自動パッチ適用

```bash
# 検出された問題を自動修正
# 1. TypeScriptエラー自動修正
npx tsc --noEmit 2>&1 | head -20

# 2. Lintエラー自動修正
npm run lint:fix

# 3. 未使用インポート削除
npx ts-prune | head -10
```

## エラーカテゴリ別対応

### 1. ビルドエラー

#### TypeScriptエラー
```bash
# エラーの一覧表示
npx tsc --noEmit 2>&1

# 自動修正を試行
# - any型の追加
# - 型アサーションの追加
# - オプショナルチェーンの追加
```

#### Importエラー
```bash
# モジュール解決エラー
# 対策: パスエイリアスの確認
# tsconfig.jsonのpaths設定を確認
cat tsconfig.json | jq '.compilerOptions.paths'
```

#### Webpack/Next.jsエラー
```bash
# ビルドログ確認
npm run build 2>&1 | tail -50

# キャッシュクリア
rm -rf .next node_modules/.cache
npm run build
```

### 2. ランタイムエラー

#### Reactエラー
```bash
# Hydration mismatch
# 対策: クライアント/サーバーのレンダリング差異を確認

# Minified React error
# 対策: 開発モードで再現
npm run dev
```

#### WebSocketエラー
```bash
# 接続失敗
# 1. WebSocketサーバー起動確認
lsof -i :3001

# 2. 接続状態確認
netstat -an | grep 3001

# 3. 自動再起動
npm run ws:server &
```

#### APIエラー
```bash
# APIルートエラー
# 1. ログ確認
npm run dev 2>&1 | grep -i "api\|error"

# 2. ステータスコード確認
curl -I http://localhost:3000/api/health
```

### 3. テストエラー

#### Jestエラー
```bash
# 単一テスト実行
npm test -- --testPathPattern="riskManagement"

# 失敗したテストのみ再実行
npm test -- --onlyFailures

# スナップショット更新
npm test -- --updateSnapshot
```

#### Playwrightエラー
```bash
# タイムアウト増加
npx playwright test --timeout=120000

# ヘッドレスモードで実行
npx playwright test --headed

# デバッグモード
npx playwright test --debug
```

## Chrome DevTools MCP活用

### 自動化フロー

```typescript
// 1. ブラウザを自動起動
chrome-devtools_new_page({ url: 'http://localhost:3000' });

// 2. 問題を再現する操作を実行
chrome-devtools_click({ uid: 'search-box' });
chrome-devtools_fill({ uid: 'search-input', value: '7974' });
chrome-devtools_press_key({ key: 'Enter' });

// 3. エラーを検出
chrome-devtools_list_console_messages({ types: ['error'] });

// 4. スクリーンショット取得
chrome-devtools_take_screenshot({ filePath: 'error-screenshot.png' });

// 5. パッチを適用
// [修正コードを自動生成して適用]
```

### パフォーマンストレース

```typescript
// パフォーマンス計測開始
chrome-devtools_performance_start_trace({ 
  reload: true,
  autoStop: true 
});

// 計測停止＆レポート取得
chrome-devtools_performance_stop_trace();

// CWVスコア確認
// - LCP (Largest Contentful Paint)
// - FID (First Input Delay)
// - CLS (Cumulative Layout Shift)
```

## デバッグコマンド集

### リアルタイムモニタリング

```bash
# ファイル変更監視
npx chokidar-cli "app/**/*.ts" -c "npm run lint"

# テスト自動実行
npx jest --watch

# サーバーログ監視
tail -f logs/server.log
```

### 診断ツール

```bash
# 依存関係分析
npx madge --circular app/

# バンドル分析
npx next-bundle-analyzer

# 型カバレッジ
npx type-coverage
```

## 緊急時の対応

### 本番環境のエラー

```bash
# 1. 即座にロールバック
git revert HEAD

# 2. ホットフィックスブランチ作成
git checkout -b hotfix/critical-fix

# 3. 修正適用
# [修正コード]

# 4. マージとデプロイ
git add . && git commit -m "hotfix: critical bug"
git push origin hotfix/critical-fix
gh pr create --title "[HOTFIX] Critical bug fix" --body "Emergency fix"
```

### データベース接続エラー

```bash
# 接続テスト
psql $DATABASE_URL -c "SELECT 1"

# 接続プール確認
# [接続プール設定の確認]
```

## エラーログ解析

### ログパターン

```bash
# エラーパターンの抽出
grep -r "ERROR\|WARN" logs/ | sort | uniq -c | sort -rn

# スタックトレース解析
# [スタックトレースから問題箇所を特定]
```

### 自動エラーレポート

```typescript
// Sentryや類似サービスへの自動送信
const errorHandler = (error: Error) => {
  console.error('Application Error:', error);
  
  // エラートラッキングサービスへ送信
  errorTracker.captureException(error, {
    tags: { component: 'TradingPlatform' },
    extra: { timestamp: new Date().toISOString() }
  });
};
```

## ベストプラクティス

### 予防的デバッグ
- エラーバウンダリの設置
- グローバルエラーハンドラの設定
- ログレベルの適切な設定
- 開発/本番環境での差異管理

### デバッグ時の注意事項
1. 本番データは使用しない
2. パスワード/キーはログに出力しない
3. デバッグ後は必ずクリーンアップ
4. 大規模変更はバックアップ後に実行

## 関連ドキュメント
- FOR_OPENCODE.md - 既知の問題と解決策
- .github/skills/trading-platform-dev.md - 開発ガイド
- CLAUDE.md - 自動アクション設定
