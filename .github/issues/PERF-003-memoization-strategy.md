# [PERF-003] メモ化戦略の徹底適用

## 概要

StockChart等で部分的に適用済みですが統一性がありません。メモ化戦略を徹底適用し、不要な再レンダリングを防止します。

## 対応内容

1. **`React.memo`適用箇所の監査**
   - 全コンポーネントの分析
   - 再レンダリングの原因特定
   - 適用優先順位の決定

2. **`useMemo`/`useCallback`最適化**
   - 依存配列の見直し
   - 計算コストの高い処理の特定
   - 適切なメモ化の適用

3. **再レンダリング防止パターン標準化**
   - ベストプラクティス文書化
   - コードレビューチェックリスト
   - ESLintルールの追加

## 受け入れ条件（Acceptance Criteria）

- [ ] 全コンポーネントの再レンダリング監査が完了している
- [ ] `React.memo`が適切に適用されている
- [ ] `useMemo`/`useCallback`が最適化されている
- [ ] React DevTools Profilerで不要な再レンダリングが検出されない
- [ ] 主要画面のレンダリング時間が30%短縮されている
- [ ] メモ化に関するベストプラクティスが文書化されている

## 関連するレビュー発見事項

- StockChart等で部分的にメモ化適用済みだが統一性がない
- 不要な再レンダリングが発生している
- `useMemo`/`useCallback`の依存配列が不適切

## 想定工数

20時間

## 優先度

Medium

## 担当ロール

Frontend Engineer

## ラベル

`performance`, `priority:medium`, `react`, `optimization`

---

## 補足情報

### メモ化適用ガイドライン

```typescript
// ✅ 適切なuseMemoの使用
const processedData = useMemo(() => {
  return heavyCalculation(rawData);
}, [rawData]);

// ✅ 適切なuseCallbackの使用
const handleSubmit = useCallback(() => {
  submitForm(data);
}, [data]);

// ✅ 適切なReact.memoの使用
const ChartComponent = React.memo(function Chart({ data }) {
  return <Chart data={data} />;
});

// ❌ 避けるべきパターン
// プリミティブ値のuseMemo（オーバーヘッドが利益を上回る）
const value = useMemo(() => 1 + 2, []); // 不要
```

### 監査チェックリスト

| 項目 | 確認内容 |
|------|----------|
| 大きなリスト | リストコンポーネントのメモ化 |
| チャート | データ変更時のみ再レンダリング |
| フォーム | 入力フィールドの分離 |
| コンテキスト | 不要なコンテキスト更新の防止 |

### 推奨ESLintルール

```json
// .eslintrc.json
{
  "rules": {
    "react-hooks/exhaustive-deps": "error",
    "react-memo/require-memo": "warn",
    "react-memo/require-usememo": "warn"
  }
}
```
