# Agent Skill: Dependency Management

## 概要
このスキルは、Trading Platformプロジェクトの依存関係管理とアップデートのためのガイドラインです。

## 適用シナリオ
- セキュリティパッチ適用
- 依存関係の更新
- 未使用パッケージの削除
- バージョン管理

## 依存関係分析

### 現在の状態確認

```bash
# インストール済みパッケージ一覧
npm list --depth=0

# 古いパッケージの確認
npm outdated

# 脆弱性の確認
npm audit

# 依存関係ツリー
npm list
```

### 依存関係の可視化

```bash
# グラフ生成
npx dependency-cruiser --init
npx dependency-cruiser app/

# サイズ分析
npx cost-of-modules
```

## セキュリティアップデート

### 自動修正

```bash
# パッチレベルのアップデート
npm audit fix

# メジャーアップデート（注意！）
npm audit fix --force

# 個別パッケージ更新
npm update <package-name>
```

### 手動アップデート

```bash
# 特定バージョンへ更新
npm install <package>@<version>

# 最新バージョンへ更新
npm install <package>@latest

# 次期メジャーバージョンの確認
npm view <package> versions --json | tail -10
```

## 依存関係の整理

### 未使用パッケージの検出

```bash
# 未使用パッケージ検出
npx depcheck

# 未使用ファイル検出
npx ts-prune

# 手動確認後の削除
npm uninstall <unused-package>
```

### devDependencies vs dependencies

```json
// package.json構造
{
  "dependencies": {
    // 本番環境で必要
    "next": "^16.0.0",
    "react": "^19.0.0"
  },
  "devDependencies": {
    // 開発時のみ必要
    "jest": "^30.0.0",
    "typescript": "^5.0.0"
  }
}
```

### 移動が必要なパッケージ

```bash
# 誤ってdependenciesに入っているdevDependenciesを移動
npm uninstall <package>
npm install -D <package>
```

## バージョン管理戦略

### セマンティックバージョニング

```
メジャー.マイナー.パッチ
1.2.3
│   │   └─ パッチ: バグ修正
│   └───── マイナー: 後方互換性のある追加
└───────── メジャー: 破壊的変更
```

### package.jsonのバージョン指定

```json
{
  "dependencies": {
    // 厳密なバージョン
    "package-a": "1.2.3",
    
    // パッチアップデート許可
    "package-b": "~1.2.3",
    
    // マイナーアップデート許可
    "package-c": "^1.2.3",
    
    // 最新を常に使用（非推奨）
    "package-d": "*"
  }
}
```

### lockファイルの管理

```bash
# package-lock.jsonの更新
npm install

# 完全な再作成（トラブル時）
rm package-lock.json
rm -rf node_modules
npm install

# 特定パッケージの再インストール
npm ci
```

## 定期メンテナンス

### 週次チェック

```bash
# 脆弱性スキャン
npm audit

# 古いパッケージ確認
npm outdated

# 未使用パッケージ確認
npx depcheck
```

### 月次アップデート

```bash
# 安全なアップデート
npm update

# テスト実行
npm test

# 問題なければコミット
git add package.json package-lock.json
git commit -m "chore: Update dependencies"
```

### 四半期メジャーアップデート

```bash
# メジャーバージョンアップデート計画
# 1. 変更履歴の確認
npm view <package> changelog

# 2. テスト環境で検証
npm install <package>@latest
npm test

# 3. 問題なければ本番適用
```

## 特定パッケージ管理

### Next.jsアップデート

```bash
# Next.js公式アップグレードガイドに従う
# https://nextjs.org/docs/upgrading

# バージョン確認
npm view next versions --json | tail -5

# アップデート
npm install next@latest

# 型定義も更新
npm install -D @types/react@latest @types/react-dom@latest
```

### Reactアップデート

```bash
# React 18 → 19 移行例
npm install react@19 react-dom@19
npm install -D @types/react@19 @types/react-dom@19

# 互換性チェック
npm ls react
```

### TypeScriptアップデート

```bash
# TypeScriptアップデート
npm install -D typescript@latest

# 型チェック
npx tsc --noEmit

# エラー修正
# [手動修正]
```

## トラブルシューティング

### 依存関係の競合

```bash
# 競合の確認
npm ls <package-name>

# 強制的な解決
npm install <package>@<version> --force

# または
npm install <package>@<version> --legacy-peer-deps
```

### node_modulesの破損

```bash
# 完全なクリーンインストール
rm -rf node_modules
rm package-lock.json
npm cache clean --force
npm install
```

### パッケージが見つからない

```bash
# レジストリの確認
npm view <package>

# スコープ付きパッケージの認証
npm login --scope=@scope

# プライベートレジストリ設定
npm config set registry https://registry.npmjs.org/
```

## セキュリティベストプラクティス

### 信頼できるソース

```bash
# 公式レジストリのみ使用
npm config set registry https://registry.npmjs.org/

# パッケージの検証
npm audit
npm audit fix
```

### 定期スキャン

```bash
# Snyk統合
npx snyk test

# GitHub Security Advisories
# GitHubで自動通知

# Dependabot設定
# .github/dependabot.yml
```

## 自動化

### GitHub Actionsでの自動更新

```yaml
# .github/workflows/dependency-update.yml
name: Dependency Update

on:
  schedule:
    - cron: '0 0 * * 0'  # 毎週日曜日

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm update
      - run: npm test
      - name: Create PR
        uses: peter-evans/create-pull-request@v5
        with:
          title: 'chore: Update dependencies'
          branch: 'deps/update'
```

### 脆弱性アラート自動対応

```yaml
# .github/workflows/security-audit.yml
name: Security Audit

on:
  push:
    paths:
      - 'package.json'
      - 'package-lock.json'

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --audit-level=high
```

## ドキュメント管理

### 変更履歴の記録

```markdown
## Dependencies Update - YYYY-MM-DD

### Updated
- next: 16.0.0 → 16.1.0
- react: 19.0.0 → 19.1.0

### Security Fixes
- lodash: CVE-XXXX-XXXX patched

### Breaking Changes
- None

### Notes
- TypeScript型定義の更新も同時実施
```

## 関連ドキュメント
- FOR_OPENCODE.md - 過去のアップデート履歴
- package.json - 依存関係定義
- package-lock.json - ロックファイル
