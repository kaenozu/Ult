/**
 * CumulativeReturnChart Component
 * 
 * 累積リターン曲線（対数スケール）を表示
 */

import React, { useMemo, memo } from 'react';
import { Line } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { TrendingUp } from 'lucide-react';
import { StrategyPerformance } from '../types';
import { BacktestResult } from '@/app/lib/backtest/AdvancedBacktestEngine';

interface CumulativeReturnChartProps {
  strategies: StrategyPerformance[];
  buyAndHoldResult?: BacktestResult;
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      type: 'logarithmic' as const,
      ticks: {
        color: '#94a3b8',
        callback: (value: number | string) => {
          if (typeof value === 'number') {
            return value.toLocaleString();
          }
          return value;
        },
      },
      grid: {
        color: '#334155',
      },
    },
    x: {
      ticks: {
        color: '#94a3b8',
      },
      grid: {
        color: '#334155',
      },
    },
  },
  plugins: {
    legend: {
      labels: {
        color: '#e2e8f0',
      },
    },
    tooltip: {
      mode: 'index' as const,
      intersect: false,
    },
  },
};

/**
 * 累積リターン曲線コンポーネント
 */
export const CumulativeReturnChart = memo(function CumulativeReturnChart({
  strategies,
  buyAndHoldResult,
}: CumulativeReturnChartProps) {
  const chartData = useMemo(() => {
    const datasets = strategies.map(strategy => ({
      label: strategy.name,
      data: strategy.result.equityCurve,
      borderColor: strategy.color,
      backgroundColor: strategy.color + '20',
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.1,
    }));

    if (buyAndHoldResult) {
      datasets.push({
        label: 'Buy & Hold',
        data: buyAndHoldResult.equityCurve,
        borderColor: '#94a3b8',
        backgroundColor: '#94a3b820',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1,
      });
    }

    return {
      labels: Array.from({ length: strategies[0]?.result.equityCurve.length || 0 }, (_, i) => i),
      datasets,
    };
  }, [strategies, buyAndHoldResult]);

  if (strategies.length === 0) {
    return null;
  }

  return (
    <Card className="bg-[#1e293b] border-[#334155]">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-400" />
          累積リターン曲線（対数スケール）
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <Line data={chartData} options={chartOptions} />
        </div>
      </CardContent>
    </Card>
  );
});
