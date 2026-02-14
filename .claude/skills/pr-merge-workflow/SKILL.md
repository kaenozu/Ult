---
name: pr-merge-workflow
description: PRのコンフリクト解消、レビュー対応、マージワークフローを自動化。複数PRの一括管理と効率的な解決策を提供。
model: auto
---

# PRマージワークフロー スキル

複数のプルリクエストを効率的に管理し、コンフリクト解消、レビュー対応、マージを自動化します。

## 適用シナリオ

- 複数PRの一括管理
- マージコンフリクトの解消
- レビューコメントへの対応
- PRの優先順位付けと依存関係管理

## ワークフロー

### 1. PR一覧取得と分析

```bash
# オープンなPRを全て取得
gh pr list --state open --limit 20

# PRの詳細情報を取得
gh pr view <PR_NUMBER> --json state,mergeStateStatus,mergeable,comments,reviews

# CIチェック状態を確認
gh pr checks <PR_NUMBER>
```

### 2. コンフリクト解消

**コンフリクト検出:**
```bash
# ブランチをフェッチ
gh pr checkout <PR_NUMBER>

# mainとのマージを試行
gh merge main --no-edit

# コンフリクトファイルを特定
git diff --name-only --diff-filter=U
```

**コンフリクト解消パターン:**

1. **片方の変更を採用**
```bash
# mainブランチの変更を採用
git checkout --theirs <filepath>

# 現在のブランチの変更を採用
git checkout --ours <filepath>
```

2. **手動でマージ（推奨）**
```typescript
// ❌ コンフリクトマーカーを残さない
<<<<<<< HEAD
const value = 100;
=======
const value = 200;
>>>>>>> main

// ✅ 最適な解決策を選択または統合
const value = 200; // 理由: より厳密なバリデーションのため
```

3. **複数コンフリクトの一括解消**
```bash
# すべてのコンフリクトマーカーを検索
grep -r "<<<<<<<\|=======\|>>>>>>>" --include="*.ts" --include="*.tsx"

# 装飾的なコメント行を除外
grep -r "<<<<<<<\|=======\|>>>>>>>" --include="*.ts" --include="*.tsx" | grep -v "// ==="
```

### 3. レビューコメント対応

**一般的なレビュー指摘と対応:**

| 指摘 | 対応方法 | 例 |
|------|---------|-----|
| マジックナンバー | 定数化 | `const MAX_RETRIES = 3;` |
| 重複コード | 関数抽出 | 共通ロジックをutil化 |
| エラーログ不足 | 適切なロギング追加 | `logger.error()` |
| 型安全性 | 型アサーション削除 | `as any` → 適切な型 |
| パフォーマンス | メモ化 | `useMemo`, `React.memo` |

### 4. PRマージ戦略

**優先順位:**

1. **依存関係のないPR**（インフラ・設定変更）
2. **レビュー済み・CI通過PR**
3. **コンフリクトなしPR**
4. **依存関係があるPR**（他のPRに依存）

**マージ順序の例:**
```
PR #789 (security skill) ← 独立
PR #788 (dual-match fix) ← mainとのコンフリクトあり
PR #787 (sentinel fix)   ← 依存: #788
```

### 5. 自動化ルール

**明示的な指示なく自動実行:**

- ✅ コンフリクトマーカーの検出
- ✅ CIチェック状態の確認
- ✅ 不要な`console.log`の検出
- ✅ 型エラーの事前チェック
- ✅ 未使用インポートの検出

## コンフリクト解消のベストプラクティス

### 原則

1. **機能を理解してから解消**
   - 両ブランチの変更意図を確認
   - テストケースを参照
   - コミットメッセージを読む

2. **より優れた実装を選択**
   - パフォーマンスが良い方
   - 保守性が高い方
   - チームのコーディング規約に合う方

3. **コメントを残す**
   ```typescript
   // PR #788: トレード数による段階的ペナルティを採用
   // 理由: 統計的有意性を考慮したより細かい制御が可能
   if (result.totalTrades < 5) {
     score *= 0.5;
   }
   ```

### 一般的なコンフリクトパターン

**1. インポート文の競合**
```typescript
// 両方必要な場合は統合
import { 
  funcA,  // from HEAD
  funcB   // from main
} from './module';
```

**2. ロジックの競合**
```typescript
// より良い実装を選択または統合
// HEAD: シンプルだが制限あり
// main: 複雑だが包括的

// → 統合: mainの包括性 + HEADの可読性
```

**3. テストファイルの競合**
```bash
# テストは通常、mainブランチの最新を採用
git checkout --theirs <test-file>
# ただし、新しいテストケースは手動で追加
```

## レビュー対応テンプレート

### 指摘への返答形式

```markdown
## レビュー対応

### 対応済み
- [x] マジックナンバーの定数化 (src/constants.ts)
- [x] 重複ロジックの抽出 (src/utils/common.ts)
- [x] エラーハンドリングの強化

### 対応しない（理由付き）
- [ ] 型アサーションの削除
  - 理由: 外部ライブラリの型定義が不完全なため
  - 代替: コメントで説明を追加

### 要検討
- [ ] パフォーマンス最適化
  - メモ化の検討が必要だが、現時点では計測データなし
  - Issue #XXX で追跡
```

## コミットメッセージ規約

### コンフリクト解消時
```
merge: resolve conflicts with main branch

- Keep: <採用した変更1> (<理由>)
- Keep: <採用した変更2> (<理由>)
- Remove: <削除した変更> (<理由>)
```

### レビュー対応時
```
fix: address review comments

- Extract magic numbers to constants
- Remove duplicate logic in component
- Add error logging for edge cases
```

## 禁止事項

- ❌ コンフリクトマーカーを残したままコミット
- ❌ 理解しないまま片方の変更を採用
- ❌ テストなしでコンフリクトを解消
- ❌ 複数の無関係な変更を1コミットにまとめる

## トラブルシューティング

**コンフリクトが多すぎる:**
```bash
# 戦略的に段階的にマージ
1. git merge main~5  # 5コミット前から
2. コンフリクト解消
3. git merge main~3  # さらに3コミット
4. コンフリクト解消
5. git merge main    # 最終マージ
```

**間違った解消をした後:**
```bash
# マージをリセット
git merge --abort

# または特定のファイルをリセット
git checkout HEAD -- <filepath>
```

## ツールとコマンド

### 必須コマンド
```bash
# PRチェック
gh pr checks <PR_NUMBER>
gh pr view <PR_NUMBER> --json mergeStateStatus

# コンフリクト解消
git diff --name-only --diff-filter=U
grep -r "<<<<<<<" --include="*.ts" --include="*.tsx"

# コミット前チェック
npx tsc --noEmit
npm run lint
npm test
```

### 便利なエイリアス
```bash
# .bashrc または .zshrc に追加
alias gfp='git fetch origin main && git log --oneline --graph --all -10'
alias gcm='git checkout main && git pull origin main'
alias gpm='git pull origin main --no-edit'
```

## 参考実装

### 実際のコンフリクト解消例

```typescript
// File: PerformanceScreenerService.ts

// BEFORE (コンフリクト)
<<<<<<< HEAD
// トレード数が極端に少ない場合は段階的にペナルティ
// 3回未満はスコア0（統計的に評価不能）
=======
// 1回のデータ取得を共有
// トレード数が極端に少ない場合は0点
>>>>>>> main
if (result.totalTrades < 3) {
  return 0;
}

// AFTER (解消後)
// PR #788: トレード数による段階的ペナルティを採用
// 理由: 統計的有意性を考慮したより細かい制御が可能
if (result.totalTrades < 3) {
  return 0;
}

// 各指標を正規化（0-100）
const winRateScore = Math.min(result.winRate, 100);
```

## スキル統合

このスキルは以下と組み合わせて使用：

- **security-review**: セキュリティレビュー対応時のパターン適用
- **debugger-pro**: コンフリクト解消後の動作検証
- **dev-master**: コード品質の確保

---

**最終更新**: 2026-02-13
**適用プロジェクト**: Ult Trading Platform
