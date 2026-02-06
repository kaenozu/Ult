# TypeScript 型エラー解消ガイドライン

このドキュメントは、TypeScript プロジェクトで型エラーを体系的に解消するための標準化された手順です。

## 原則

### 最小限の変更原則
- ✅ 影響のある関数のみを編集
- ❌ ファイル全体を書き換えない
- ✅ 既存の定義を再利用する（重複定義禁止）

### 即時検証原則
- 1つの修正ごとに `tsc --noEmit` を実行
- 0エラーを確認してから次に進む
- エラー発生時は即時ロールバック

### 依存関係の可視化原則
```
変更対象
    ↓ 影響を受ける関数
    ↓ その関数を使用するコンポーネント
    ↓ テストファイル
```

## 手順

### ステップ1: 事前確認フェーズ

```bash
# 1. 現在のエラーを収集
npx tsc --noEmit | tee /tmp/tsc-errors.txt

# 2. エラーを分類（致命的・警告・情報）
grep "error TS" /tmp/tsc-errors.txt > critical-errors.txt

# 3. 変更対象の使用箇所を特定
grep -r "validateRequiredString" --include="*.ts" --include="*.tsx"

# 4. 既存の類似実装を検索
grep -r "class.*Error.*extends Error" --include="*.ts" | head -5
```

### ステップ2: 影響範囲の特定

```bash
# 変更する関数の依存を追跡
grep -r "import.*validateSymbol" --include="*.ts" --include="*.tsx"

# 使用箇所のファイルリスト
grep -rl "validateSymbol" --include="*.ts" --include="*.tsx"

# テストファイルの特定
find . -name "*.test.ts" -o -name "*.spec.ts" | xargs grep -l "validateSymbol"
```

### ステップ3: 最小限の修正

**優先順位:**
1. 既存のクラス定義をインポート
2. 新規定義を避ける
3. 型を維持する

**例:**
```typescript
// ❌ 悪い例
class ValidationError extends Error { ... }

// ✅ 良い例
import { ValidationError } from './errors';
```

### ステップ4: 即時検証ループ

```bash
# 修正前
npx tsc --noEmit  # エラー: 5件

# 修正1: validation.ts のみ
npx tsc --noEmit  # エラー: 3件

# 修正2: route.ts のみ
npx tsc --noEmit  # エラー: 1件

# 修正3: useStockData.ts のみ
npx tsc --noEmit  # エラー: 0件 ✅
```

### ステップ5: 自動化可能なチェック

```bash
# テストモックの整合性
for file in app/**/__tests__/*.ts; do
  grep -l "mockResolvedValue" "$file" | while read testfile; do
    # モックと実装の型が一致するかチェック
    ...
  done
done
```

## ワークフロー

```
┌─────────────────────────────────────────────────────┐
│ 1. エラー収集                                   │
│    npx tsc --noEmit                            │
└──────────────────┬──────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────┐
│ 2. 分類と優先度決定                             │
│    - 致命的エラー: 即時対応                      │
│    - 警告: 並列対応可能                         │
└──────────────────┬──────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────┐
│ 3. 影響範囲の特定                               │
│    grep -r <関数名>                             │
└──────────────────┬──────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────┐
│ 4. 最小限の修正                                 │
│    既存の再利用を優先                             │
└──────────────────┬──────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────┐
│ 5. 即時検証                                    │
│    npx tsc --noEmit                            │
└──────────────────┬──────────────────────────────────┘
                   ↓
              エラー0?
                   ↓
            Yes  No
            ↓    ↓
         完成   修正→検証
```

## チェックリスト

### 事前
- [ ] 現在のエラー一覧を取得
- [ ] 影響範囲を特定
- [ ] 既存の定義を検索

### 実行中
- [ ] 最小限の変更のみ
- [ ] 既存の定義を再利用
- [ ] 修正ごとに検証

### 事後
- [ ] 0エラーを確認
- [ ] ESLint を実行
- [ ] テストを実行
- [ ] 変更をコミット（1変更=1コミット）

## よくあるパターン

### パターン1: バリデーション関数の変更
```typescript
// 変更前
export function validateX(value: unknown): string | Response {
  if (!valid) return errorResponse;
  return value;
}

// 変更後
export function validateX(value: unknown): string {
  if (!valid) throw new ValidationError(...);
  return value;
}
```

**影響:** 使用箇所すべての早期リターン削除が必要

### パターン2: 型の変更
```typescript
// 変更前
export function fetchSignal(): Promise<Signal | null>

// 変更後
export function fetchSignal(): Promise<APIResponse<Signal>>
```

**影響:** テストモック、呼び出し元、型アサーション

### パターン3: React Hooks の依存配列
```typescript
// ❌ 悪い例
const hasChanged = useMemo(() => {
  return prevRef.current !== props.value;
}, props.value); // ref アクセス中

// ✅ 良い例
const hasChanged = useMemo(() => {
  const prevValue = prevRef.current;
  return prevValue !== props.value;
}, [props.value]);
```

## ツール

| 目的 | コマンド | 出力 |
|------|---------|------|
| エラー収集 | `npx tsc --noEmit 2>&1 \| tee errors.txt` | エラー一覧 |
| 影響検索 | `grep -r "functionName" --include="*.ts"` | 使用箇所 |
| 依存グラフ | `ts-node dependency-graph.ts` | 可視化 |

## 学んだ教訓

### 過ちと回避策

| 過ち | 回避策 |
|------|--------|
| ファイル全体を書き換え | 最小限の修正原則 |
| 既存の定義を見つけず新規作成 | `grep` で既存定義を検索 |
| まとめて修正してから検証 | 1修正1検証のループ |
| ロールバックが困難 | Git ブランチで作業 |

### 改善フィードバック

1. なぜその変更が必要だったか
2. どの原則が適用されたか
3. 今後どう回避できるか
4. ドキュメントの更新が必要か

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2026-02-06 | 初版作成 |

## 関連ドキュメント

- [TypeScript 公式ドキュメント](https://www.typescriptlang.org/docs/)
- [ESLint React Hooks ルール](https://github.com/facebook/react/issues/14920)
