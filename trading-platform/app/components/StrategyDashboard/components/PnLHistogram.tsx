/**
 * PnLHistogram Component
 * 
 * PnLヒストグラムを表示
 */

import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { Bar } from 'react-chartjs-2';
import { StrategyPerformance } from '../types';
import { createHistogramBins } from '../utils';

interface PnLHistogramProps {
  strategies: StrategyPerformance[];
}

const histogramChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      ticks: {
        color: '#94a3b8',
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
  },
};

/**
 * PnLヒストグラム
 */
export const PnLHistogram = memo(function PnLHistogram({
  strategies,
}: PnLHistogramProps) {
  if (strategies.length === 0) {
    return null;
  }

  const strategy = strategies[0]; // 最初の戦略のみ表示
  const pnls = strategy.result.trades.map(t => t.pnlPercent);
  
  // ヒストグラムのビンを作成
  const bins = createHistogramBins(pnls, 20);

  const chartData = {
    labels: bins.map((b: { min: number; max: number; count: number }) => `${b.min.toFixed(1)}%`),
    datasets: [
      {
        label: '取引回数',
        data: bins.map((b: { min: number; max: number; count: number }) => b.count),
        backgroundColor: strategy.color + '80',
        borderColor: strategy.color,
        borderWidth: 1,
      },
    ],
  };

  return (
    <Card className="bg-[#1e293b] border-[#334155]">
      <CardHeader>
        <CardTitle className="text-white">PnL分布</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <Bar data={chartData} options={histogramChartOptions} />
        </div>
      </CardContent>
    </Card>
  );
});
