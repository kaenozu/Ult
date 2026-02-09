/**
 * PerformanceMetricsGrid Component
 * 
 * パフォーマンスメトリクスグリッド表示
 */

import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { StrategyPerformance } from '../types';
import { BacktestResult } from '@/app/lib/backtest/AdvancedBacktestEngine';
import { MetricRow } from './MetricRow';

interface PerformanceMetricsGridProps {
  strategies: StrategyPerformance[];
  buyAndHoldResult?: BacktestResult;
}

/**
 * パフォーマンスメトリクスグリッド
 */
export const PerformanceMetricsGrid = memo(function PerformanceMetricsGrid({
  strategies,
  buyAndHoldResult,
}: PerformanceMetricsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {strategies.map(strategy => (
        <Card key={strategy.name} className="bg-[#1e293b] border-[#334155]">
          <CardHeader>
            <CardTitle className="text-sm text-gray-300 flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: strategy.color }}
              />
              {strategy.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <MetricRow
                label="Total Return"
                value={`${strategy.result.metrics.totalReturn.toFixed(2)}%`}
                positive={strategy.result.metrics.totalReturn > 0}
              />
              <MetricRow
                label="Sharpe Ratio"
                value={strategy.result.metrics.sharpeRatio.toFixed(2)}
                positive={strategy.result.metrics.sharpeRatio > 1}
              />
              <MetricRow
                label="Max Drawdown"
                value={`${strategy.result.metrics.maxDrawdown.toFixed(2)}%`}
                positive={false}
              />
              <MetricRow
                label="Win Rate"
                value={`${strategy.result.metrics.winRate.toFixed(1)}%`}
                positive={strategy.result.metrics.winRate > 50}
              />
              {buyAndHoldResult && (
                <div className="pt-2 border-t border-gray-700">
                  <p className="text-xs text-gray-400">
                    vs Buy & Hold:{' '}
                    <span
                      className={
                        strategy.result.metrics.totalReturn > buyAndHoldResult.metrics.totalReturn
                          ? 'text-green-400'
                          : 'text-red-400'
                      }
                    >
                      {strategy.result.metrics.totalReturn > buyAndHoldResult.metrics.totalReturn
                        ? '勝'
                        : '負'}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
});
