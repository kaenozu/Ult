# Type Safety Cleanup Agent

TypeScript型安全性の向上とコードベース整理を行うエージェントスキル

## トリガー

以下の発言で自動的に適用されます：
- 「型安全性を改善して」
- 「any型を減らして」
- 「重複ファイルを整理して」
- 「コードを整理して」
- 「リファクタリングして」

## 主な機能

1. **型安全性分析**: `any`型の使用箇所を特定
2. **型定義作成**: 厳密な型定義と型ガードの実装
3. **重複検出**: 重複ファイルの自動検出
4. **統合実行**: ファイル統合とre-export設定
5. **品質検証**: TypeScript/ESLintチェック

## ワークフロー

```
分析 → 型定義作成 → 型キャスト修正 → 重複統合 → 不要ファイル削除 → 検証
```

## 対象ファイル

### 型改善
- `app/lib/strategy/*.ts`
- `app/lib/utils/*.ts`
- `app/lib/trading/*.ts`

### サービス統合
- `app/lib/services/*-model-service.ts`
- `app/lib/services/*-prediction-service.ts`

### 削除対象
- `app/shared/`
- `*.backup`, `*.disabled`, `*-example.ts`

## 品質基準

- TypeScript Strict Mode準拠
- any型使用率90%減少
- テストカバレッジ80%以上維持
- ESLintエラー0

## スキルファイル

- `SKILL.json` - スキル定義とワークフロー
- `SKILL.md` - 詳細ドキュメント

## 使用例

```
User: "any型を減らして整理して"
Agent: 分析 → 型定義作成 → 修正 → 統合 → 検証
```
