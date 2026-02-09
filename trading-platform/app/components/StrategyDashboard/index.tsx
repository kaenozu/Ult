/**
 * StrategyDashboard
 * 
 * 戦略評価ダッシュボード - 複数戦略の包括的な比較・分析
 * 
 * 【表示項目】
 * - 累積リターン曲線（対数スケール）
 * - ドローダウンチャート
 * - 月次・年次リターンヒートマップ
 * - シャープレート推移
 * - 勝率分布（PnLヒストグラム）
 * - 相関マトリックス
 * - 特徴量重要度
 */

'use client';

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LogarithmicScale,
} from 'chart.js';

import { StrategyDashboardProps } from './types';
import { useStrategyData } from './hooks/useStrategyData';
import {
  StrategySelector,
  PerformanceMetricsGrid,
  CumulativeReturnChart,
  DrawdownChart,
  ReturnHeatmap,
  SharpeRatioProgressChart,
  PnLHistogram,
  CorrelationMatrix,
  StrategyComparisonTable,
} from './components';

// ChartJSのコンポーネントを登録
ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

/**
 * 戦略評価ダッシュボードコンポーネント
 * 
 * @param props - ダッシュボードのプロパティ
 * @returns ダッシュボードコンポーネント
 */
export function StrategyDashboard({
  strategies,
  buyAndHoldResult,
  showComparison = true,
}: StrategyDashboardProps) {
  const {
    selectedStrategies,
    viewMode,
    filteredStrategies,
    toggleStrategy,
    setViewMode,
  } = useStrategyData(strategies);

  return (
    <div className="space-y-6">
      {/* ヘッダー（戦略選択・ビューモード切替） */}
      <StrategySelector
        strategies={strategies}
        selectedStrategies={selectedStrategies}
        viewMode={viewMode}
        showComparison={showComparison}
        onToggleStrategy={toggleStrategy}
        onViewModeChange={setViewMode}
      />

      {/* 概要モード */}
      {viewMode === 'overview' && (
        <>
          <PerformanceMetricsGrid
            strategies={filteredStrategies}
            buyAndHoldResult={buyAndHoldResult}
          />
          <CumulativeReturnChart
            strategies={filteredStrategies}
            buyAndHoldResult={buyAndHoldResult}
          />
          <DrawdownChart strategies={filteredStrategies} />
        </>
      )}

      {/* 詳細モード */}
      {viewMode === 'detailed' && (
        <>
          <ReturnHeatmap strategies={filteredStrategies} />
          <SharpeRatioProgressChart strategies={filteredStrategies} />
          <PnLHistogram strategies={filteredStrategies} />
        </>
      )}

      {/* 比較モード */}
      {viewMode === 'comparison' && (
        <>
          <CorrelationMatrix strategies={filteredStrategies} />
          <StrategyComparisonTable
            strategies={filteredStrategies}
            buyAndHoldResult={buyAndHoldResult}
          />
        </>
      )}
    </div>
  );
}

// 型を再エクスポート
export type { StrategyPerformance, StrategyDashboardProps, ViewMode } from './types';
