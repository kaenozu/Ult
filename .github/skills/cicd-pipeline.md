# CI/CD Pipeline Management Agent

## Purpose
専門的CI/CDパイプライン管理とワークフロー最適化エージェント。

## Capabilities
- GitHub Actionsワークフローの設計と最適化
- テスト戦略と品質ゲートの実装
- ビルドエラーの診断と修正
- デプロイパイプラインの構築
- パフォーマンス監視と改善

## Workflows Managed
- CIパイプライン（テスト、ビルド、リント、セキュリティ）
- CDパイプライン（本番/ステージングデプロイ）
- 品質ゲート（カバレッジ、脆弱性スキャン）
- 通知ワークフロー（Slack、Email、Discord）

## Key Commands

### CI Pipeline Diagnosis
```bash
# 失敗したワークフローの確認
gh run list --status=failure --limit=5

# ワークフローログの取得
gh run view <run-id> --log

# ワークフローの再実行
gh run rerun <run-id>

# 特定のワークフロー実行
gh workflow run <workflow-name>
```

### Build Optimization
```bash
# ビルド時間計測
time npm run build

# キャッシュクリア
npm run build:clean

# 依存関係最適化
npm ci
```

### Quality Gates
```bash
# カバレッジレポート
npm run test:coverage

# セキュリティスキャン
npm audit --audit-level=moderate

# 依存関係更新
npx npm-check-updates
```

## Common Issues & Solutions

### Build Failures
1. **TypeScriptエラー**
   ```bash
   npx tsc --noEmit
   # 型定義の確認・修正
   ```

2. **ESLintエラー**
   ```bash
   npm run lint:fix
   # 自動修正→手動修正
   ```

3. **メモリ不足**
   ```yaml
   # .github/workflows/ci.yml
   jobs:
     build:
       runs-on: ubuntu-latest
       env:
         NODE_OPTIONS: '--max-old-space-size=4096'
   ```

### Test Failures
1. **テストのタイムアウト**
   ```javascript
   // jest.config.js
   testTimeout: 10000
   ```

2. **環境変数の問題**
   ```yaml
   env:
     NODE_ENV: test
     NEXT_PUBLIC_API_URL: ${{ secrets.API_URL }}
   ```

### Performance Optimization
1. **並列ビルド**
   ```yaml
   strategy:
     matrix:
       node-version: [18, 20]
   ```

2. **キャッシュ戦略**
   ```yaml
   - uses: actions/cache@v3
     with:
       path: ~/.npm
       key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
   ```

## Monitoring & Alerting

### Key Metrics
- ビルド時間
- テスト実行時間
- デプロイ成功率
- キャッシュヒット率
- 脆弱性検出数

### Alert Configuration
```yaml
- uses: actions/github-script@v6
  with:
    script: |
      if (context.payload.action === 'failed') {
        await github.rest.issues.create({
          owner: context.repo.owner,
          repo: context.repo.repo,
          title: `Build Failure: ${context.workflow}`,
          body: 'Pipeline failed. Immediate attention required.'
        });
      }
```

## Best Practices

1. **早期フィードバック**
   - 高速フィードバックループ（< 2分）
   - 重要度順のチェック実行
   - 並列実行の最大化

2. **信頼性**
   - 冪等性の確保
   - 適切なリトライ戦略
   - エッジケースの処理

3. **スケーラビリティ**
   - リソース制限の監視
   - ワークフローのモジュール化
   - コスト最適化

## Templates

### CI Workflow Template
```yaml
name: CI Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  quality-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm test
      - run: npm audit
```

### CD Workflow Template
```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]
    tags: [ 'v*' ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm run deploy
```

## Troubleshooting Guide

### Debug Mode
```bash
# GitHub Actionsデバッグ
# .github/workflows/ci.yml
env:
  ACTIONS_STEP_DEBUG: true
  ACTIONS_RUNNER_DEBUG: true
```

### Local Testing
```bash
# act (GitHub Actionsローカル実行)
act -j build

# nektos/actインストール
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
```

## Integration Points

- **PR Management**: 自動マージ条件
- **Security**: 脆弱性スキャン統合
- **Documentation**: 自動ドキュメント生成
- **Monitoring**: パフォーマンスメトリクス収集

このエージェントはCI/CDパイプラインの設計、実装、最適化、監視を網羅的に支援します。