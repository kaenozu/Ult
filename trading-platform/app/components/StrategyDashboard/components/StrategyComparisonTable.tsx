/**
 * StrategyComparisonTable Component
 * 
 * 戦略比較テーブルを表示
 */

import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { 
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { StrategyPerformance } from '../types';
import { BacktestResult } from '@/app/lib/backtest/AdvancedBacktestEngine';

interface StrategyComparisonTableProps {
  strategies: StrategyPerformance[];
  buyAndHoldResult?: BacktestResult;
}

/**
 * 戦略比較テーブル
 */
export const StrategyComparisonTable = memo(function StrategyComparisonTable({
  strategies,
  buyAndHoldResult,
}: StrategyComparisonTableProps) {
  return (
    <Card className="bg-[#1e293b] border-[#334155]">
      <CardHeader>
        <CardTitle className="text-white">戦略比較</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left text-gray-400 p-3">戦略</th>
                <th className="text-right text-gray-400 p-3">Total Return</th>
                <th className="text-right text-gray-400 p-3">Sharpe</th>
                <th className="text-right text-gray-400 p-3">Sortino</th>
                <th className="text-right text-gray-400 p-3">Max DD</th>
                <th className="text-right text-gray-400 p-3">Win Rate</th>
                <th className="text-right text-gray-400 p-3">Trades</th>
                <th className="text-center text-gray-400 p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {strategies.map(strategy => {
                const beatsBuyHold = buyAndHoldResult
                  ? strategy.result.metrics.totalReturn > buyAndHoldResult.metrics.totalReturn
                  : false;

                return (
                  <tr key={strategy.name} className="border-b border-gray-800">
                    <td className="p-3 text-white font-medium">{strategy.name}</td>
                    <td className={`p-3 text-right ${strategy.result.metrics.totalReturn > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {strategy.result.metrics.totalReturn.toFixed(2)}%
                    </td>
                    <td className="p-3 text-right text-gray-300">
                      {strategy.result.metrics.sharpeRatio.toFixed(2)}
                    </td>
                    <td className="p-3 text-right text-gray-300">
                      {strategy.result.metrics.sortinoRatio.toFixed(2)}
                    </td>
                    <td className="p-3 text-right text-red-400">
                      {strategy.result.metrics.maxDrawdown.toFixed(2)}%
                    </td>
                    <td className="p-3 text-right text-gray-300">
                      {strategy.result.metrics.winRate.toFixed(1)}%
                    </td>
                    <td className="p-3 text-right text-gray-300">
                      {strategy.result.metrics.totalTrades}
                    </td>
                    <td className="p-3 text-center">
                      {beatsBuyHold ? (
                        <CheckCircle className="w-5 h-5 text-green-400 mx-auto" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400 mx-auto" />
                      )}
                    </td>
                  </tr>
                );
              })}
              {buyAndHoldResult && (
                <tr className="border-b border-gray-700 bg-gray-800/50">
                  <td className="p-3 text-gray-400 font-medium">Buy & Hold</td>
                  <td className={`p-3 text-right ${buyAndHoldResult.metrics.totalReturn > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {buyAndHoldResult.metrics.totalReturn.toFixed(2)}%
                  </td>
                  <td className="p-3 text-right text-gray-400">
                    {buyAndHoldResult.metrics.sharpeRatio.toFixed(2)}
                  </td>
                  <td className="p-3 text-right text-gray-400">
                    {buyAndHoldResult.metrics.sortinoRatio.toFixed(2)}
                  </td>
                  <td className="p-3 text-right text-red-400">
                    {buyAndHoldResult.metrics.maxDrawdown.toFixed(2)}%
                  </td>
                  <td className="p-3 text-right text-gray-400">-</td>
                  <td className="p-3 text-right text-gray-400">-</td>
                  <td className="p-3 text-center">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 mx-auto" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
});
