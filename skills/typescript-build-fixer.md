# タイプセーフティとビルド修正スキル

## スキル概要
TypeScript/ESLintエラーを体系的に検出・修正し、ビルドを正常化するスキル。

## トリガー条件
- TypeScriptコンパイルエラーが発生
- ESLintパースエラーや構文エラー
- ビルドが失敗する場合

## 実行手順

### 1. エラー診断フェーズ
```bash
# TypeScriptエラー検出
npx tsc --noEmit > tsc-errors.txt 2>&1

# ESLintエラー検出
npm run lint > lint-errors.txt 2>&1 || true

# ビルド試行
npm run build > build-errors.txt 2>&1 || true
```

### 2. エラー分類
- **構文エラー（Syntax Errors）**: カンマ、セミコロン、括弧の不一致
- **型エラー（Type Errors）**: 型定義の不一致、any型問題
- **パースエラー（Parse Errors）**: ESLintがコードを解析できない
- **モジュールエラー（Module Errors）**: import/exportの問題

### 3. 修正戦略

#### 3.1 構文エラー修正
```typescript
// ❌ 構文エラー例
export function myFunction() {
  return {
    prop1: 'value'
    prop2: 'value'  // カンマ不足
  }
}

// ✅ 修正後
export function myFunction() {
  return {
    prop1: 'value',
    prop2: 'value'  // カンマ追加
  }
}
```

#### 3.2 型エラー修正
```typescript
// ❌ any型使用
const data: any = fetchData();

// ✅ 適切な型定義
interface DataItem {
  id: string;
  value: number;
}
const data: DataItem[] = fetchData();
```

#### 3.3 モジュールエラー修正
```typescript
// ❌ 循環参照/不完全なエクスポート
import { Service } from './service';
export { Service };

// ✅ 明確なエクスポート
import { Service } from './service';
export { Service };
export type { ServiceType };
```

### 4. 検証フェーズ
```bash
# TypeScriptチェック
npx tsc --noEmit

# ESLintチェック
npm run lint

# ビルド確認
npm run build
```

## 具体的事例（今回の修正）

### 修正前の問題
- TypeScriptエラー: 71個
- ESLintパースエラー: 3ファイル
- ビルド失敗

### 修正内容
1. **APIルートの構文エラー修正**
   - `app/api/sentiment/route.ts`: カンマ不足を修正

2. **テストユーティリティの整形**
   - `app/lib/__tests__/test-utils.ts`: 不正なフォーマットを修正

3. **アラートマネージャの構文修正**
   - `app/lib/aiAnalytics/AnomalyDetection/AlertManager.ts`: セミコロン/カンマ問題を修正

### 修正結果
- ✅ TypeScriptエラー: 71個 → 0個
- ✅ ビルド: 失敗 → 成功
- ✅ ブラウザ: localhost:3000で正常表示

## ベストプラクティス

### 1. 段階的アプローチ
- 構文エラー → 型エラー → リンター警告の順
- 一度に多くの変更を避ける

### 2. 品質保証
- 各修正後にビルドを確認
- 既存機能を破壊しないことを保証

### 3. 自動化推奨
- `.eslintignore`でビルド成果物を除外
- quality gatesスクリプトで品質チェック

## 注意事項
- 既存機能の破壊的変更を避ける
- TypeScript strictモードを維持
- ESLintの自動修正を活用（`npm run lint:fix`）

## 期待されるアウトプット
- ✅ TypeScriptコンパイルエラー0件
- ✅ ESLintクリティカルエラー0件
- ✅ ビルド成功
- ✅ 既存機能の維持