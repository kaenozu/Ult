/**
 * BacktestPanel.tsx
 * 
 * バックテストパネルコンポーネント
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Play, BarChart3 } from 'lucide-react';
import { usePerformanceMonitor } from '@/app/lib/performance';

export function BacktestPanel() {
  const { measureAsync } = usePerformanceMonitor('BacktestPanel');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runBacktest = () => {
    setIsRunning(true);
    // Simulate backtest
    measureAsync('simulateBacktest', async () => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setResults({
        totalReturn: 25.5,
        sharpeRatio: 1.8,
        maxDrawdown: 12.3,
        winRate: 58.2,
        totalTrades: 156,
      });
      setIsRunning(false);
    });
  };

  return (
    <Card className="bg-[#1e293b] border-[#334155]">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-400" />
          Backtest Engine
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-[#0f172a] rounded-lg">
              <p className="text-xs text-gray-400">Strategy</p>
              <p className="text-sm font-medium text-white">RSI Mean Reversion</p>
            </div>
            <div className="p-3 bg-[#0f172a] rounded-lg">
              <p className="text-xs text-gray-400">Period</p>
              <p className="text-sm font-medium text-white">2023-01-01 to 2023-12-31</p>
            </div>
          </div>

          <Button
            onClick={runBacktest}
            disabled={isRunning}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            <Play className="w-4 h-4 mr-2" />
            {isRunning ? 'Running Backtest...' : 'Run Backtest'}
          </Button>

          {results && (
            <div className="mt-4 space-y-3">
              <h4 className="text-sm font-medium text-gray-300">Results</h4>
              <div className="grid grid-cols-2 gap-3">
                <ResultMetric label="Total Return" value={`${results.totalReturn}%`} positive={results.totalReturn > 0} />
                <ResultMetric label="Sharpe Ratio" value={results.sharpeRatio.toFixed(2)} positive={results.sharpeRatio > 1} />
                <ResultMetric label="Max Drawdown" value={`${results.maxDrawdown}%`} positive={false} />
                <ResultMetric label="Win Rate" value={`${results.winRate}%`} positive={results.winRate > 50} />
              </div>
              <p className="text-xs text-gray-400 text-center">
                Total Trades: {results.totalTrades}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ResultMetric({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive: boolean;
}) {
  return (
    <div className="p-3 bg-[#0f172a] rounded-lg text-center">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-lg font-bold ${positive ? 'text-green-400' : 'text-red-400'}`}>
        {value}
      </p>
    </div>
  );
}

export default BacktestPanel;
