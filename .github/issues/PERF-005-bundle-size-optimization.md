# [PERF-005] バンドルサイズ最適化

## 概要

初期ロード時間の短縮が必要です。バンドルサイズを最適化し、ユーザー体験を向上させます。

## 対応内容

1. **動的インポート導入**
   - ルートベースのコード分割
   - コンポーネントの遅延ロード
   - ライブラリの動的インポート

2. **コード分割最適化**
   - チャンクサイズの最適化
   - 共通チャンクの抽出
   - プリロード戦略

3. **未使用コード削除**
   - Tree Shakingの最適化
   - 未使用ライブラリの削除
   - Dead Code Elimination

## 受け入れ条件（Acceptance Criteria）

- [ ] 動的インポートが導入され、初期ロードJSが50%削減されている
- [ ] コード分割が最適化され、チャンクサイズが適切に制御されている
- [ ] 未使用コードが削除され、バンドルサイズが20%削減されている
- [ ] Lighthouseパフォーマンススコアが90以上に向上している
- [ ] First Contentful Paintが1.8秒以内に短縮されている
- [ ] Time to Interactiveが3.8秒以内に短縮されている

## 関連するレビュー発見事項

- 初期ロード時間が長い
- バンドルサイズが大きい
- 未使用のライブラリが含まれている

## 想定工数

16時間

## 優先度

Medium

## 担当ロール

Frontend Engineer

## ラベル

`performance`, `priority:medium`, `bundle`, `optimization`

---

## 補足情報

### バンドル分析ツール

```bash
# バンドルサイズ分析
npm run analyze

# webpack-bundle-analyzer
npx webpack-bundle-analyzer .next/stats.json
```

### 動的インポート例

```typescript
// ✅ ルートベースコード分割
const BacktestPage = dynamic(() => import('../pages/Backtest'), {
  loading: () => <LoadingSpinner />,
  ssr: false
});

// ✅ コンポーネント遅延ロード
const HeavyChart = dynamic(() => import('../components/HeavyChart'), {
  loading: () => <ChartSkeleton />
});

// ✅ ライブラリ動的インポート
async function exportToExcel(data: Data[]) {
  const XLSX = await import('xlsx');
  // ...
}
```

### 目標バンドルサイズ

| チャンク | 現在 | 目標 |
|----------|------|------|
| 初期JS | 500KB | 250KB |
| 共通 | 300KB | 200KB |
| ページ別 | 100KB/ページ | 50KB/ページ |
