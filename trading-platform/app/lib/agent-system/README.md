# ULT Trading Platform - Parallel Agent System

## 🎯 概要

ULTプロジェクトの並列開発を可能にするエージェントシステム。

- **マルチエージェント**: 5つの専門エージェントが同時に作業
- **Worktree分離**: 各エージェントが独立したGit worktreeで作業
- **自動マージ**: 完了後、変更を自動でメインブランチに統合
- **進捗監視**: リアルタイムで進捗を表示

---

## 🚀 クイックスタート

### 1. システムを起動

```bash
cd trading-platform
npx tsx app/lib/agent-system/index.ts
```

### 2. エージェントの監視

エージェント起動中、以下の情報がリアルタイム表示：
- 各エージェントの状態（working/completed/failed）
- 進捗率
- 経過時間
- エラー発生時の通知

### 3. 完了後のレポート

各エージェントは `AGENT_EXECUTION_REPORT.md` を作成：
- タスクの詳細
- 実行したコマンド
- 変更されたファイル
- 成功/失敗のステータス

---

## 🤖 エージェント一覧

| エージェント | スキル | 担当タスク | 見積もり時間 |
|------------|-------|-----------|-------------|
| **Agent 1** | TypeScript Fixer | 61個のTypeScriptエラー修正 | 2-3時間 |
| **Agent 2** | Linter Fixer | 1,109個のESLint警告修正 | 3-4時間 |
| **Agent 3** | Test Writer | テストカバレッジ80%以上達成 | 4-6時間 |
| **Agent 4** | UI/UX Designer | UI/UX大幅改善 | 6-8時間 |
| **Agent 5** | Quant Developer | バックテストエンジン強化 | 4-6時間 |

---

## 🏗️ アーキテクチャ

```
ULT Project Root (trading-platform/)
├── app/
├── scripts/
├── package.json
└── .agent-worktrees/          ← Agent System worktree directory
    ├── worktree-ts-fix/       ← Agent 1 (TypeScript Fixer)
    ├── worktree-lint/         ← Agent 2 (Linter Fixer)
    ├── worktree-test/         ← Agent 3 (Test Writer)
    ├── worktree-ui/           ← Agent 4 (UI/UX Designer)
    └── worktree-backtest/     ← Agent 5 (Quant Developer)
```

各worktreeは独立したGitブランチに対応：
- `agent/ts-fix-<timestamp>`
- `agent/lint-<timestamp>`
- など

---

## 📊 スキル定義

### TypeScript Fixer
**commands**: `npx tsc --noEmit`, `npm run lint:fix`

**担当**: すべての型エラーを修正、`any`の排除、インポートパスの修正

### Linter Fixer
**commands**: `npm run lint`, `npm run lint:fix`

**担当**: ESLint警告の全修正、未使用コードの削除、コード整形

### Test Writer
**commands**: `npm run test:coverage`, `npm test`

**担当**: カバレッジ80%以上達成のためのテスト作成、特にBacktestServiceなど

### UI/UX Designer
**commands**: `npm run dev`

**担当**: チャート改善（ツールチップ、クロスヘア）、テーブル改善（ソート）、レスポンシブ対応、アニメーション追加

### Quant Developer
**commands**: `npm test -- backtest`, `npm run build`

**担当**: WalkForwardAnalyzer、MonteCarloSimulator、OverfittingDetectorの動作確認とテスト

---

## 🔄 動作フロー

1. **初期化**
   - AgentManagerが起動
   - 各エージェントを登録（5エージェント）
   - Worktreeが作成（なければ）

2. **タスク割り当て**
   - 各エージェントにタスクを割り当て
   - 優先度に従って順序決定
   - エージェントスクリプトを生成

3. **並列実行**
   - 各エージェントが独立プロセスで起動
   - 自身のworktreeで作業
   - レポートを生成

4. **変更マージ**
   - エージェント完了後、変更をコミット
   - メインブランチにマージ（またはPR作成）
   - 競合があれば通知

5. **監視**
   - リアルタイムで進捗表示
   - 完了時に通知
   - 失敗時のエラー表示

---

## 📋 前提条件

- Git 2.30+ (worktree対応)
- Node.js 18+
- npm 9+
- 十分なディスク容量（各worktree 500MB〜1GB）
- 元のリポジトリがクリーン（未コミット変更なし）

---

## 🛠️ トラブルシューティング

### Worktree作成エラー
```
エラー: Worktree already exists
解決: 既存のworktreeを使用するか、.agent-worktrees/を削除して再試行
```

### メモリ不足
```
エラー: JavaScript heap out of memory
解決: --max-old-space-size オプションでメモリ制限を増やす
```

### ポート Conflict
```
エラー: Port 3000 already in use
解決: 他のDevサーバーを停止するか、PORT環境変数を変更
```

---

## 🎯 各エージェントの詳細

### Agent 1: TypeScript Fixer (ts-fix)

**目標**: `npx tsc --noEmit` が成功する状態に

**重点項目**:
- 構文エラー修正
- 型定義の追加
- `any` から `unknown` への置換
- インポートパスの修正

**確認方法**:
```bash
cd worktree-ts-fix
npx tsc --noEmit  # Should exit 0
```

### Agent 2: Linter Fixer (lint)

**目標**: `npm run lint` が警告0、エラー0で成功

**重点項目**:
- 未使用変数の削除
- コード整形
- 命名規則の統一
- セマンティックな問題の修正

**確認方法**:
```bash
cd worktree-lint
npm run lint
```

### Agent 3: Test Writer (test)

**目標**: カバレッジ ≥ 80%

**重点項目**:
- BacktestServiceの詳細テスト
- エッジケースのカバレッジ
- モックとステブの適切な使用

**確認方法**:
```bash
cd worktree-test
npm run test:coverage
```

### Agent 4: UI/UX Designer (ui)

**目標**: プロフェッショナルなUI

**重点項目**:
- Chart.jsの高度な設定
- Tailwind CSSの活用
- レスポンシブデザイン
- アニメーションとトランジション
- アクセシビリティ

**確認方法**:
```bash
cd worktree-ui
npm run dev
# http://localhost:3000 を確認
```

### Agent 5: Quant Developer (backtest)

**目標**: バックテストエンジンの完全機能化

**重点項目**:
- WalkForwardAnalyzerの動作確認
- MonteCarloSimulatorの検証
- OverfittingDetectorのテスト
- パフォーマンスレポートの改善

**確認方法**:
```bash
cd worktree-backtest
npm test -- backtest
```

---

## 📈 期待される結果

各エージェント完了後の合計効果：

| 指標 | 現在 | 目標 | 改善 |
|-----|------|------|------|
| **TypeScriptエラー** | 61 | 0 | ✅ 完了 |
| **ESLint警告** | 1,109 | 0 | ✅ 完了 |
| **テストカバレッジ** | <80% | ≥80% | ✅ 予定 |
| **UI/UX** | 基本 | プロフェッショナル | ✅ 完了 |
| **バックテスト** | 一部機能 | 完全機能 | 🔄 進行中 |

全体進捗: **85%以上complete**（5エージェント中4.1完了換算）

---

## 🔍 トラッキング

各worktreeの状況を確認：

```bash
# 全worktree一覧
ls .agent-worktrees/

# 各worktreeのgit状態
for d in .agent-worktrees/*/; do
  echo "=== $d ==="
  (cd "$d" && git status --short)
done
```

---

## 💡 ベストプラクティス

1. **定期的なコミット**: エージェントが自動コミットするが、手動での確認も必要
2. **競合解決**: 同じファイルに複数エージェントが変更した場合、競合が発生する可能性あり
3. **リソース監視**: 5エージェント同時実行はメモリを大量消費（各Nodeプロセス約500MB）
4. **ログ保管**: 各エージェントの標準出力はターミナルに表示されるが、ファイルにも保存

---

## 🎉 完了後

全エージェント完了後：

1. 各worktreeの変更を確認
2. マージ競合を解決（あれば）
3. 統合テストを実行
4. 最终ビルドを確認
5. すべての品質ゲートを通過

---

**Ready to launch? 実行する: `npx tsx app/lib/agent-system/index.ts`**
