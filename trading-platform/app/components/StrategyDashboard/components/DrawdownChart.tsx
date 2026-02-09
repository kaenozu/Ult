/**
 * DrawdownChart Component
 * 
 * ドローダウンチャートを表示
 */

import React, { useMemo, memo } from 'react';
import { Line } from 'react-chartjs-2';
import { TooltipItem } from 'chart.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { TrendingDown } from 'lucide-react';
import { StrategyPerformance } from '../types';
import { calculateDrawdowns } from '../utils';

interface DrawdownChartProps {
  strategies: StrategyPerformance[];
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      reverse: true,
      ticks: {
        color: '#94a3b8',
        callback: (value: number | string) => {
          if (typeof value === 'number') {
            return `${value.toFixed(1)}%`;
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
      callbacks: {
        label: (context: TooltipItem<'line'>) => {
          const yValue = context.parsed.y;
          return `${context.dataset.label}: ${yValue !== null ? yValue.toFixed(2) : 'N/A'}%`;
        },
      },
    },
  },
};

/**
 * ドローダウンチャートコンポーネント
 */
export const DrawdownChart = memo(function DrawdownChart({
  strategies,
}: DrawdownChartProps) {
  const chartData = useMemo(() => {
    const datasets = strategies.map(strategy => {
      const drawdowns = calculateDrawdowns(strategy.result.equityCurve);
      return {
        label: strategy.name,
        data: drawdowns,
        borderColor: strategy.color,
        backgroundColor: strategy.color + '40',
        fill: true,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1,
      };
    });

    return {
      labels: Array.from({ length: strategies[0]?.result.equityCurve.length || 0 }, (_, i) => i),
      datasets,
    };
  }, [strategies]);

  if (strategies.length === 0) {
    return null;
  }

  return (
    <Card className="bg-[#1e293b] border-[#334155]">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-red-400" />
          ドローダウンチャート
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <Line data={chartData} options={chartOptions} />
        </div>
      </CardContent>
    </Card>
  );
});
