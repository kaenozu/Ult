# Agent Skill: Automated Code Review & Issue Creation

## 概要
このスキルは、ソースコードレビューを自動化し、発見した問題をGitHub Issueとして作成するためのガイドラインです。

## 適用シナリオ
- 全ソースレビューを実施する場合
- 新規機能追加前の品質チェック
- 技術負債の可視化

## ワークフロー

### 1. 並列レビュー戦略

```typescript
// 4つの並列タスクで効率的にレビュー
task1: Core lib files (services, stores, api)
task2: Components and pages (tsx files)
task3: Hooks and utilities
task4: API routes and types
```

### 2. レビューチェックリスト

#### セキュリティ
- [ ] XSS脆弱性（サニタイズ不足）
- [ ] 認証・認可チェック
- [ ] ハードコードされたシークレット
- [ ] SQL/NoSQLインジェクション
- [ ] IPアドレス信頼問題

#### パフォーマンス
- [ ] メモリリーク（intervals, listeners）
- [ ] 不要な再レンダリング
- [ ] O(n)以上の計算量
- [ ] バンドルサイズ肥大
- [ ] キャッシュ戦略

#### 安定性
- [ ] 競合状態（race conditions）
- [ ] ErrorBoundary適用漏れ
- [ ] ゼロ除算リスク
- [ ] 配列境界チェック
- [ ] 型安全性（any型）

#### アクセシビリティ
- [ ] alt属性の欠如
- [ ] aria-labelの欠如
- [ ] コントラスト比
- [ ] キーボードナビゲーション

### 3. Issue作成テンプレート

#### Critical Issue
```markdown
## 問題の概要
[簡潔な説明]

## 該当箇所
- File: [パス]
- Lines: [行数]

## 問題の詳細
[コードスニペット]

## 修正案
[推奨される修正]

## 優先度
**Critical** - [カテゴリ]

Closes #[Issue番号]
```

#### 作成時の命名規則
- Critical: `[CRITICAL] [カテゴリ]: [簡潔な説明]`
- High: `[HIGH] [カテゴリ]: [簡潔な説明]`
- Medium: `[Medium] [カテゴリ]: [簡潔な説明]`
- Low: `[Low] [カテゴリ]: [簡潔な説明]`

## 重要な判断基準

### 優先度マトリックス

| 影響範囲 | 深刻度 | 優先度 |
|---------|--------|--------|
| 全ユーザー | セキュリティ侵害 | Critical |
| 全ユーザー | クラッシュ/データ損失 | Critical |
| 一部ユーザー | 機能不全 | High |
| 全ユーザー | パフォーマンス劣化 | High |
| 開発者 | 保守性低下 | Medium |
| 開発者 | コード重複 | Low |

### バッチIssue作成
```bash
# ファイルにIssue本文を書き込み
write filePath: .github/issue-{category}.md content: "..."

# バッチ作成
gh issue create --title "[Priority] Title" --body-file .github/issue-{category}.md
```

## トラブルシューティング

### 特殊文字エラー
Issue本文に `、` や `>` などの特殊文字が含まれるとbashがエラーを起こす。
**解決策**: ファイルに本文を書き込んで `--body-file` を使用。

### Issue番号の重複
既存Issueと重複しないよう注意。
**解決策**: 作成前に `gh issue list` で確認。

### ラベルエラー
存在しないラベルを指定するとエラー。
**解決策**: ラベルなしで作成し、後で手動追加。

## 関連ファイル
- FOR_OPENCODE.md - 既知の問題リスト
- .github/issue-*.md - Issueテンプレート
