# [DEBT-005] 型安全性向上（any撲滅）

## 概要

レビューで`any`型の使用が複数検出されました。型安全性を向上させ、コンパイル時のエラー検出とIDEサポートを強化します。

## 対応内容

1. **`any`型使用箇所の検索・リスト化**
   - 全コードベースの`any`型使用箇所を特定
   - 影響度と修正優先度の評価
   - 修正計画の策定

2. **重要な箇所から順に型付け**
   - APIレスポンス型の定義
   - コンポーネントprops型の厳密化
   - ステート管理の型付け

3. **型ガード関数作成**
   - ランタイム型チェック関数の実装
   - 外部APIレスポンスのバリデーション
   - 型安全なユーティリティ関数

## 受け入れ条件（Acceptance Criteria）

- [ ] 全`any`型使用箇所がリスト化され、優先度付けされている
- [ ] 重要なパス（API、主要コンポーネント）から`any`型が排除されている
- [ ] 型ガード関数が作成され、適切に使用されている
- [ ] `strict`モードでTypeScriptコンパイルが成功する
- [ ] `any`型の使用が全体の1%以下に削減されている
- [ ] 新規コードは`any`型を使用しない方針が定められている

## 関連するレビュー発見事項

- `any`型の使用が複数検出された（レビュー報告より）
- APIレスポンスの型定義が不十分で、ランタイムエラーのリスクがある
- 一部のコンポーネントでpropsの型が`any`となっており、型安全性が損なわれている

## 想定工数

24時間

## 優先度

Medium

## 担当ロール

Frontend Engineer

## ラベル

`tech-debt`, `priority:medium`, `frontend`, `typescript`

---

## 補足情報

### any型撲滅優先順位

| 優先度 | 対象 | 理由 |
|--------|------|------|
| 最高 | APIレスポンス型 | データ整合性の確保 |
| 高 | 主要コンポーネントprops | 再利用性と安全性 |
| 中 | ステート管理 | 予測可能性の向上 |
| 低 | ユーティリティ関数 | 段階的改善 |

### 型ガード関数例

```typescript
// APIレスポンス型ガード
function isValidTradeResponse(data: unknown): data is TradeResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    typeof (data as TradeResponse).id === 'string'
  );
}

// ユニオン型判別
function isMarketOrder(order: Order): order is MarketOrder {
  return order.type === 'market';
}
```

### 推奨設定

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```
