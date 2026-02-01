# Agent Skill: Code Refactoring Strategy

## 概要
このスキルは、Trading Platformプロジェクトでの大規模リファクタリング計画と実行のためのガイドラインです。

## 適用シナリオ
- 技術負債の返済
- コードベースの近代化
- 重複コードの統合
- アーキテクチャ改善

## リファクタリングタイプ分類

### 1. 小規模リファクタリング（1ファイル〜数ファイル）

```bash
# 単一ファイルのリファクタリング
# リネーム、変数抽出、関数抽出など

# リファクタリング前のテスト実行
npm test -- [target-file].test.ts

# リファクタリング実施
# - 型安全性の向上
# - 変数名の改善
# - 重複コードの抽出

# リファクタリング後のテスト実行
npm test -- [target-file].test.ts
```

### 2. 中規模リファクタリング（モジュール単位）

```bash
# モジュール構造の変更
# 例: APIクライアントの統合

# 1. 新構造の設計
# 2. 段階的な移行
# 3. 旧コードの非推奨化
# 4. 移行ガイドの作成

# ブランチ作成
git checkout -b refactor/unify-api-clients

# リファクタリング実施
# [コード変更]

# 全テスト実行
npm test
```

### 3. 大規模リファクタリング（アーキテクチャ変更）

```bash
# 段階的アプローチ
# 例: ステート管理のZustand移行

# Phase 1: 並行実装
# - 新システムを構築
# - 旧システムは維持

# Phase 2: 段階的移行
# - コンポーネントごとに移行
# - 各移行後にテスト

# Phase 3: 旧システム削除
# - 未使用コードの特定
# - 安全な削除
```

## リファクタリングパターン

### 重複コードの統合

```typescript
// BEFORE: 重複するATR計算
// riskManagement.ts
export function calculateATR(data, period) { ... }

// utils.ts
export function calculateBatchATR(data, period) { ... }

// AccuracyService.ts
export function calculateSimpleATR(data, period) { ... }

// AFTER: 統一された実装
// utils/atr.ts
export function calculateATR(
  data: OHLCV[], 
  period: number,
  options?: ATROptions
): number[] { ... }

// 既存ファイルからは再エクスポート
export { calculateATR } from '@/app/lib/utils/atr';
```

### 設定の一元管理

```typescript
// BEFORE: 複数の設定ファイル
// WinningBacktestEngine.ts
const DEFAULT_CONFIG = { initialCapital: 1000000, ... }

// AdvancedBacktestEngine.ts
const DEFAULT_CONFIG = { initialCapital: 1000000, ... }

// AFTER: 一元管理
// config/backtest.ts
export const DEFAULT_BACKTEST_CONFIG = {
  initialCapital: 1000000,
  maxPositionSize: 0.1,
  // ...
} as const;

// 各エンジンでインポート
import { DEFAULT_BACKTEST_CONFIG } from '@/app/config/backtest';
```

### 型安全性の向上

```typescript
// BEFORE: any型の使用
function processData(data: any): any {
  return data.map((item: any) => item.value);
}

// AFTER: 厳密な型定義
interface DataItem {
  id: string;
  value: number;
  timestamp: Date;
}

function processData(data: DataItem[]): number[] {
  return data.map((item) => item.value);
}
```

## リファクタリング計画テンプレート

```markdown
# リファクタリング計画: [タイトル]

## 背景・目的
[なぜリファクタリングが必要か]

## スコープ
### 対象
- [ファイル/モジュール一覧]

### 非対象
- [除外するもの]

## 実施手順
1. [ステップ1]
2. [ステップ2]
3. [ステップ3]

## リスクと対策
| リスク | 対策 |
|-------|------|
| [リスク1] | [対策1] |

## テスト計画
- [ ] 既存テストの通過確認
- [ ] 新規テストの追加
- [ ] E2Eテストの実行

## ロールバック計画
[問題発生時の対応]
```

## 段階的移行戦略

### Strangler Figパターン

```typescript
// 新システムを構築し、徐々に移行
class NewService {
  process() { /* 新実装 */ }
}

class LegacyService {
  process() { /* 旧実装 */ }
}

// ファサードで切り替え
class ServiceFacade {
  private newService = new NewService();
  private legacyService = new LegacyService();
  
  process() {
    if (featureFlags.useNewService) {
      return this.newService.process();
    }
    return this.legacyService.process();
  }
}
```

### 並行実装パターン

```typescript
// 新旧のコードを並行して維持
// 段階的に新コードへ移行

// フェーズ1: 新コードを追加（旧コードは維持）
// フェーズ2: 移行（コンポーネントごとに）
// フェーズ3: 旧コード削除
```

## 自動化ツール

### コード分析

```bash
# 複雑度分析
npx complexity-report app/

# 重複検出
npx jscpd app/

# 依存関係分析
npx madge --circular app/

# 未使用コード検出
npx ts-prune
```

### 自動リファクタリング

```bash
# ESLint自動修正
npm run lint:fix

# Prettier整形
npx prettier --write "app/**/*.{ts,tsx}"

# TypeScriptエラー修正（手動確認必要）
npx tsc --noEmit 2>&1 | head -50
```

## リファクタリング前チェックリスト

- [ ] バックアップの作成
- [ ] テストカバレッジの確認（80%以上推奨）
- [ ] 影響範囲の特定
- [ ] ロールバック手順の準備
- [ ] チームへの通知

## リファクタリング後チェックリスト

- [ ] 全テストの通過確認
- [ ] 型チェックの通過確認
- [ ] リンターの通過確認
- [ ] 手動での動作確認
- [ ] パフォーマンス測定
- [ ] ドキュメントの更新

## 実践例: Alpha Vantage削除

```bash
# 実際に実施したリファクタリング

# 1. 削除対象の特定
glob "app/**/alpha-vantage*" "app/**/APIClient*"

# 2. 削除
rm app/lib/api/alpha-vantage.ts
rm app/lib/api/APIClient.ts
rm app/__tests__/alpha-vantage.test.ts

# 3. インポート元の修正
# [自動修正スクリプト]

# 4. テスト実行
npm test

# 5. PR作成
git add .
git commit -m "refactor: Alpha Vantage関連ファイルを削除"
gh pr create --title "refactor: Remove Alpha Vantage files" --body "- 削除: 5ファイル\n- 削減: 1,130行"
```

## トラブルシューティング

### 大規模リファクタリング失敗時

```bash
# 1. 変更の取り消し
git checkout -- .

# 2. クリーンな状態に戻す
git clean -fd

# 3. 依存関係の再インストール
rm -rf node_modules
npm install

# 4. テスト実行
npm test
```

### コンフリクト多数発生時

```bash
# 段階的なアプローチに変更
# 1. 小さな単位に分割
# 2. 各部分を個別にマージ
# 3. 最終統合
```

## 関連ドキュメント
- FOR_OPENCODE.md - 過去のリファクタリング履歴
- .github/skills/code-review.md - コード品質チェック
- .github/skills/testing-automation.md - テスト戦略
