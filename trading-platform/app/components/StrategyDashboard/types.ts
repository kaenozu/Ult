/**
 * StrategyDashboard Types
 * 
 * 戦略評価ダッシュボードの型定義
 */

import { BacktestResult } from '@/app/lib/backtest/AdvancedBacktestEngine';

/**
 * 戦略パフォーマンスデータ
 */
export interface StrategyPerformance {
  name: string;
  result: BacktestResult;
  color: string;
}

/**
 * ダッシュボードのプロパティ
 */
export interface StrategyDashboardProps {
  strategies: StrategyPerformance[];
  buyAndHoldResult?: BacktestResult;
  showComparison?: boolean;
}

/**
 * ビューモード
 */
export type ViewMode = 'overview' | 'detailed' | 'comparison';

/**
 * ヒストグラムのビン
 */
export interface HistogramBin {
  min: number;
  max: number;
  count: number;
}

/**
 * チャートデータの共通オプション
 */
export interface ChartOptions {
  responsive: boolean;
  maintainAspectRatio: boolean;
  scales?: Record<string, unknown>;
  plugins?: Record<string, unknown>;
}
