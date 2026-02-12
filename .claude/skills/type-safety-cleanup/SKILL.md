# Type Safety Cleanup Skill

TypeScript型安全性改善と重複ファイル整理の統括スキル

## 概要

このスキルは以下の作業を統括します：
1. `any`型の厳密な型への置き換え
2. 重複ファイルの検出と統合
3. 型安全性の向上
4. コードベースの整理

## 使用シナリオ

- レガシーコードの型安全性改善
- 重複コードの統合
- コードベースの整理整頓
- 技術的負債の返済

## ワークフロー

### Phase 1: 分析

```bash
# any型の検出
grep -r 'any' --include='*.ts' --include='*.tsx' app/lib/ | grep -v '__tests__'

# 重複ファイルの検出
find app/ -name '*.ts' -type f | xargs -I {} basename {} | sort | uniq -d
```

### Phase 2: 型定義の作成

#### Pattern 1: ユニオン型の作成
```typescript
// Before
parameters: Record<string, any>

// After
export type StrategyParameterValue = string | number | boolean | string[] | number[];
parameters: Record<string, StrategyParameterValue>
```

#### Pattern 2: 型ガードの実装
```typescript
export function isString(value: StrategyParameterValue): value is string {
  return typeof value === 'string';
}

export function isStringArray(value: StrategyParameterValue): value is string[] {
  return Array.isArray(value) && value.length > 0 && typeof value[0] === 'string';
}
```

### Phase 3: 型キャストの修正

#### 問題パターンと解決策

| 問題 | 解決策 |
|------|--------|
| `as string` | `isString()` 型ガード使用 |
| `as T` | 適切なジェネリック型パラメータ |
| `any[]` | `unknown[]` または具体的な型 |
| `Record<string, any>` | `Record<string, ConcreteType>` |

### Phase 4: 重複ファイルの統合

#### 原則
- `domains/` が正統な実装場所
- `lib/services/` は `domains/prediction/services/` からre-export
- `shared/` は `lib/` と重複するため削除

#### 統合パターン
```typescript
// lib/services/example-service.ts
// Re-exports from domains for backward compatibility
export {
  ServiceClass,
  serviceInstance,
  ServiceInterface,
} from '@/app/domains/prediction/services/example-service';

// Additional types not in domains
export interface ExtendedInterface {
  // ...
}
```

### Phase 5: 不要ファイルの削除

#### 削除対象
- `*.backup` - バックアップファイル
- `*.disabled` - 無効化されたファイル
- `*-example.ts` - exampleファイル
- `shared/` ディレクトリ（lib/と完全重複）

## 品質ゲート

### TypeScript設定
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### ESLintルール
```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error"
  }
}
```

### メトリクス
- 目標削減行数: 4,000行以上
- テストカバレッジ維持: 80%以上
- any型削減率: 90%以上

## 変更履歴テンプレート

```markdown
## Changes

### Type Safety Improvements
- Replace any types with strict types
- Add type guards
- Remove invalid type casts

### File Consolidation
- Remove duplicate shared/ directory
- Unify prediction services
- Remove backup and example files

### Impact
- -{lines_deleted} lines deleted
- +{lines_added} lines added
- Improved maintainability
```

## 注意事項

1. **循環参照に注意**: domains/ → lib/ の参照は避ける
2. **後方互換性維持**: lib/のre-exportで既存コードを維持
3. **テスト確認**: 変更後は必ずテスト実行
4. **段階的適用**: 大きな変更は分割して実施

## 関連ファイル

### 型改善対象
- `app/lib/strategy/types.ts`
- `app/lib/strategy/StrategyCatalog.ts`
- `app/lib/trading/patternRecognition.ts`
- `app/lib/utils/*.ts`

### 統合対象サービス
- `app/lib/services/tensorflow-model-service.ts`
- `app/lib/services/feature-calculation-service.ts`
- `app/lib/services/ml-model-service.ts`
- `app/lib/services/enhanced-ml-service.ts`
- `app/lib/services/integrated-prediction-service.ts`

## 成功指標

- [ ] TypeScriptコンパイルエラーなし
- [ ] ESLintエラーなし
- [ ] テストパス
- [ ] any型使用率90%減少
- [ ] 重複ファイル統合完了
