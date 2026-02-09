/**
 * StrategyDashboard.tsx
 * 
 * 戦略評価ダッシュボード - エントリーポイント
 * 
 * このファイルは後方互換性のために維持されています。
 * 新しい実装は StrategyDashboard/index.tsx に移動しました。
 * 
 * @deprecated 直接 StrategyDashboard/index からインポートしてください
 */

'use client';

// 新しいモジュラー実装から再エクスポート
export {
  StrategyDashboard,
  StrategyPerformance,
  StrategyDashboardProps,
  ViewMode,
} from './StrategyDashboard/index';

// 個別コンポーネントもエクスポート
export {
  CumulativeReturnChart,
  DrawdownChart,
  ReturnHeatmap,
  CorrelationMatrix,
  StrategySelector,
  MetricRow,
  PerformanceMetricsGrid,
  SharpeRatioProgressChart,
  PnLHistogram,
  StrategyComparisonTable,
} from './StrategyDashboard/components';

// ユーティリティ関数もエクスポート
export {
  calculateDrawdowns,
  createHistogramBins,
  calculateCorrelations,
  calculateReturns,
  pearsonCorrelation,
  getCorrelationColor,
} from './StrategyDashboard/utils';

// フックもエクスポート
export { useStrategyData } from './StrategyDashboard/hooks/useStrategyData';
