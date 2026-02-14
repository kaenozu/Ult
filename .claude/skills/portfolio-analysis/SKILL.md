# ポートフォリオ分析ダッシュボード実装スキル

## 概要

取引履歴データを基にしたポートフォリオ分析ダッシュボードの実装における知見とパターン。

## 主要な学び

### 1. データモデルの不一致への対処

**問題**: StoredTrade型と実際のOrder型のフィールドが一致しない
- StoredTradeはOrderを継承しているが、pnlやexitTime等のフィールドが存在しない
- 月次パフォーマンス計算時に必要な損益データが取引レベルでない

**解決策**:
```typescript
// IndexedDBServiceでの月次パフォーマンス計算を活用
const monthlyPerformance = await indexedDBService.getAllMonthlyPerformance();

// 取引データ単体ではなく、月次集計データを使用して分析
const monthlyReturns = monthlyData.map(m => m.netProfit / initialCapital);
```

### 2. リスク調整後リターン指標の計算

**シャープレシオ**:
```typescript
export function calculateSharpeRatio(
  returns: number[],
  riskFreeRate: number = 0.02
): number {
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const excessReturn = avgReturn - riskFreeRate;
  
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance);
  
  return volatility === 0 ? 0 : excessReturn / volatility;
}
```

**ソルティノレシオ**（下方リスクのみ考慮）:
```typescript
export function calculateSortinoRatio(
  returns: number[],
  riskFreeRate: number = 0.02,
  targetReturn: number = 0
): number {
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const excessReturn = avgReturn - riskFreeRate;
  
  // 下方偏差のみ計算
  const downsideReturns = returns.filter(r => r < targetReturn);
  const downsideVariance = downsideReturns.reduce(
    (sum, r) => sum + Math.pow(r - targetReturn, 2), 
    0
  ) / downsideReturns.length;
  
  return Math.sqrt(downsideVariance) === 0 ? 0 : excessReturn / Math.sqrt(downsideVariance);
}
```

### 3. ドローダウン分析

**最大ドローダウンの計算**:
```typescript
export function calculateMaxDrawdown(equityCurve: number[]): {
  maxDrawdown: number;
  maxDrawdownPercent: number;
  peakIndex: number;
  troughIndex: number;
} {
  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;
  let currentPeak = equityCurve[0];
  
  for (let i = 1; i < equityCurve.length; i++) {
    if (equityCurve[i] > currentPeak) {
      currentPeak = equityCurve[i];
    }
    
    const drawdown = currentPeak - equityCurve[i];
    const drawdownPercent = drawdown / currentPeak;
    
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      maxDrawdownPercent = drawdownPercent;
    }
  }
  
  return { maxDrawdown, maxDrawdownPercent, peakIndex, troughIndex };
}
```

### 4. UIコンポーネントの設計パターン

**メトリックカード**:
- リスク指標を視覚的に表示
- トレンドインジケーターで良好/要改善を示す
- アイコンと色分けで直感的に理解可能

**ドローダウンインジケーター**:
- プログレスバーでドローダウン率を視覚化
- リスクレベル（低/中/高）を色分け
- 回復期間を表示

### 5. 既存データ構造との統合

**IndexedDBServiceとの連携**:
- `useTradeHistory`フックを活用
- `StoredTrade[]`を入力として分析
- 月次パフォーマンスはIndexedDBServiceで計算済み

**注意点**:
- StoredTradeはOrderを継承しているが、pnl等の派生フィールドは含まれていない
- 損益計算はIndexedDBService内でポジションレベルで行われる
- ポートフォリオ分析は月次集計データを使用するのが適切

## 実装チェックリスト

- [ ] データモデルの確認（StoredTradeの実際のフィールド）
- [ ] 月次パフォーマンスデータの取得方法確認
- [ ] シャープレシオ・ソルティノレシオ計算関数の実装
- [ ] ドローダウン計算関数の実装
- [ ] UIコンポーネント（カード、チャート、テーブル）の実装
- [ ] ナビゲーションへのリンク追加
- [ ] ページコンポーネントの作成
- [ ] ビルド確認
- [ ] テスト実行

## 今後の改善点

1. **市場データとの連携**: ベータ値、アルファの計算
2. **リアルタイム更新**: WebSocketまたはポーリングでの最新データ反映
3. **インタラクティブチャート**: ドローダウン期間の詳細表示
4. **エクスポート機能**: PDF/Excelでのレポート出力
5. **アラート機能**: ドローダウン閾値超過時の通知

## 関連ファイル

- `app/lib/utils/portfolio-analysis.ts` - 分析計算関数
- `app/components/PortfolioAnalysisDashboard.tsx` - UIコンポーネント
- `app/portfolio-analysis/page.tsx` - ページ
- `app/components/Navigation.tsx` - ナビゲーション
