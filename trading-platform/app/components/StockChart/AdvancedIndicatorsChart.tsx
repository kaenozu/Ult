'use client';

import { memo } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { OHLCV } from '@/app/types';
import { advancedTechnicalIndicators } from '@/app/lib/AdvancedTechnicalIndicators';
import { cn } from '@/app/lib/utils';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface AdvancedIndicatorsChartProps {
  data: OHLCV[];
  showStochastic?: boolean;
  showADX?: boolean;
  showWilliamsR?: boolean;
  height?: number;
}

export const AdvancedIndicatorsChart = memo(function AdvancedIndicatorsChart({
  data,
  showStochastic = false,
  showADX = false,
  showWilliamsR = false,
  height = 120,
}: AdvancedIndicatorsChartProps) {
  if (data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-[#92adc9]/50 text-xs">
        データなし
      </div>
    );
  }

  const labels = data.map(d => d.date);

  // Stochastic Oscillatorの計算
  const stochasticResult = advancedTechnicalIndicators.calculateStochastic(data, 14, 3);
  const stochasticK = stochasticResult.k.map(v => v || 0);
  const stochasticD = stochasticResult.d.map(v => v || 0);

  // ADXの計算
  const adxResult = advancedTechnicalIndicators.calculateADX(data, 14);
  const adx = adxResult.adx.map(v => v || 0);
  const plusDI = adxResult.plusDI.map(v => v || 0);
  const minusDI = adxResult.minusDI.map(v => v || 0);

  // Williams %Rの計算
  const williamsRResult = advancedTechnicalIndicators.calculateWilliamsR(data, 14);
  const williamsR = williamsRResult.williamsR.map(v => v || 0);

  // Stochasticチャートデータ
  const stochasticChartData = {
    labels,
    datasets: [
      {
        label: '%K',
        data: stochasticK,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 1,
        pointRadius: 0,
        tension: 0.1,
        fill: false,
      },
      {
        label: '%D',
        data: stochasticD,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderWidth: 1,
        pointRadius: 0,
        tension: 0.1,
        fill: false,
      },
    ],
  };

  // ADXチャートデータ
  const adxChartData = {
    labels,
    datasets: [
      {
        label: 'ADX',
        data: adx,
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.1,
        fill: true,
      },
      {
        label: '+DI',
        data: plusDI,
        borderColor: '#22c55e',
        backgroundColor: 'transparent',
        borderWidth: 1,
        pointRadius: 0,
        tension: 0.1,
        fill: false,
      },
      {
        label: '-DI',
        data: minusDI,
        borderColor: '#ef4444',
        backgroundColor: 'transparent',
        borderWidth: 1,
        pointRadius: 0,
        tension: 0.1,
        fill: false,
      },
    ],
  };

  // Williams %Rチャートデータ
  const williamsRChartData = {
    labels,
    datasets: [
      {
        label: 'Williams %R',
        data: williamsR,
        borderColor: '#ec4899',
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.1,
        fill: true,
      },
    ],
  };

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        labels: {
          color: '#92adc9',
          font: { size: 10 },
          boxWidth: 12,
          padding: 8,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(26, 38, 50, 0.95)',
        titleColor: '#ffffff',
        bodyColor: '#92adc9',
        borderColor: '#233648',
        borderWidth: 1,
        padding: 10,
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 11 },
        displayColors: true,
        boxPadding: 4,
      },
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        display: true,
        grid: {
          color: 'rgba(35, 54, 72, 0.3)',
          drawBorder: false,
        },
        ticks: {
          color: '#92adc9',
          font: { size: 10 },
          maxTicksLimit: 5,
        },
      },
    },
  };

  const stochasticOptions = {
    ...commonOptions,
    scales: {
      ...commonOptions.scales,
      y: {
        ...commonOptions.scales.y,
        min: 0,
        max: 100,
        ticks: {
          ...commonOptions.scales.y.ticks,
          callback: (value: number) => value + '%',
        },
      },
    },
    plugins: {
      ...commonOptions.plugins,
      annotation: {
        annotations: {
          overbought: {
            type: 'line' as const,
            yMin: 80,
            yMax: 80,
            borderColor: 'rgba(239, 68, 68, 0.5)',
            borderWidth: 1,
            borderDash: [5, 5],
          },
          oversold: {
            type: 'line' as const,
            yMin: 20,
            yMax: 20,
            borderColor: 'rgba(34, 197, 94, 0.5)',
            borderWidth: 1,
            borderDash: [5, 5],
          },
        },
      },
    },
  };

  const adxOptions = {
    ...commonOptions,
    scales: {
      ...commonOptions.scales,
      y: {
        ...commonOptions.scales.y,
        min: 0,
        max: 100,
      },
    },
  };

  const williamsROptions = {
    ...commonOptions,
    scales: {
      ...commonOptions.scales,
      y: {
        ...commonOptions.scales.y,
        min: -100,
        max: 0,
      },
    },
  };

  return (
    <div className="w-full flex flex-col gap-1">
      {/* Stochastic Oscillator */}
      {showStochastic && (
        <div className="relative border border-[#233648] rounded bg-[#131b23]" style={{ height }}>
          <div className="absolute top-1 left-2 text-[10px] font-bold text-[#92adc9] uppercase tracking-wider">
            Stochastic Oscillator
          </div>
          <Line data={stochasticChartData} options={stochasticOptions} />
        </div>
      )}

      {/* ADX (トレンド強度) */}
      {showADX && (
        <div className="relative border border-[#233648] rounded bg-[#131b23]" style={{ height }}>
          <div className="absolute top-1 left-2 text-[10px] font-bold text-[#92adc9] uppercase tracking-wider">
            ADX (トレンド強度)
          </div>
          <Line data={adxChartData} options={adxOptions} />
        </div>
      )}

      {/* Williams %R */}
      {showWilliamsR && (
        <div className="relative border border-[#233648] rounded bg-[#131b23]" style={{ height }}>
          <div className="absolute top-1 left-2 text-[10px] font-bold text-[#92adc9] uppercase tracking-wider">
            Williams %R
          </div>
          <Line data={williamsRChartData} options={williamsROptions} />
        </div>
      )}
    </div>
  );
});
