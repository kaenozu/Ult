'use client';

import { useEffect, useState, useRef } from 'react';
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
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { OHLCV, Signal } from '@/app/types';
import { cn, formatCurrency } from '@/app/lib/utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export interface StockChartProps {
  data: OHLCV[];
  signal?: Signal;
  height?: number;
  showVolume?: boolean;
  showIndicators?: boolean;
  loading?: boolean;
  error?: string | null;
  market?: 'japan' | 'usa';
  currentPrice?: number;
}

export function StockChart({ 
  data, 
  signal, 
  height = 400, 
  showVolume = true, 
  showIndicators = false, 
  loading = false, 
  error = null,
  market = 'usa',
  currentPrice
}: StockChartProps) {
  const chartRef = useRef<ChartJS<'line'>>(null);

  const labels = data.map(d => d.date);
  const prices = data.map(d => d.close);
  const volumes = data.map(d => d.volume);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Price',
        data: prices,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#1a2632',
        titleColor: '#fff',
        bodyColor: '#92adc9',
        borderColor: '#233648',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (context: { parsed: { y: number } }) => {
            return `Price: ${formatCurrency(context.parsed.y)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(35, 54, 72, 0.3)',
        },
        ticks: {
          color: '#92adc9',
          maxTicksLimit: 10,
        },
      },
      y: {
        grid: {
          color: 'rgba(35, 54, 72, 0.3)',
        },
        ticks: {
          color: '#92adc9',
          callback: (value: number) => formatCurrency(value),
        },
      },
    },
  };

  const volumeData = {
    labels,
    datasets: [
      {
        label: 'Volume',
        data: volumes,
        backgroundColor: volumes.map((_, i) => {
          if (i === 0) return 'rgba(239, 68, 68, 0.5)';
          return prices[i] >= prices[i - 1]
            ? 'rgba(239, 68, 68, 0.5)'
            : 'rgba(16, 185, 129, 0.5)';
        }),
        borderWidth: 0,
      },
    ],
  };

  const volumeOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
      },
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        display: false,
      },
    },
  };

  if (error) {
    return (
      <div className="relative w-full flex items-center justify-center bg-red-500/10 border border-red-500/50 rounded overflow-hidden" style={{ height }}>
        <div className="text-center p-4">
          <svg className="w-12 h-12 text-red-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-400 font-bold">データの取得に失敗しました</p>
          {error && <p className="text-red-300 text-sm mt-1">{error}</p>}
        </div>
      </div>
    );
  }

  if (loading || data.length === 0) {
    return (
      <div className="relative w-full bg-[#131b23] border border-[#233648] rounded overflow-hidden" style={{ height }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-full animate-pulse flex flex-col p-4">
            <div className="h-2/3 bg-[#192633] rounded w-full mb-4"></div>
            <div className="h-1/3 bg-[#192633]/50 rounded w-full"></div>
          </div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="h-8 w-8 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin mb-2"></div>
            <p className="text-xs text-[#92adc9] animate-pulse">データを取得中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ height }}>
      <Line ref={chartRef as any} data={chartData} options={options as any} />

      {signal && (
        <div className="absolute top-4 right-4 z-10">
          <div
            className={cn(
              'px-3 py-1.5 rounded-lg border backdrop-blur-sm',
              signal.type === 'BUY' && 'bg-green-500/20 border-green-500/50',
              signal.type === 'SELL' && 'bg-red-500/20 border-red-500/50',
              signal.type === 'HOLD' && 'bg-gray-500/20 border-gray-500/50'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={cn(
                  'text-2xl font-bold',
                  signal.type === 'BUY' && 'text-green-500',
                  signal.type === 'SELL' && 'text-red-500',
                  signal.type === 'HOLD' && 'text-gray-400'
                )}>
                  {signal.type}
                </span>
                <span className={cn(
                  'text-sm px-2 py-0.5 rounded',
                  signal.type === 'BUY' && 'bg-green-500/20 text-green-400',
                  signal.type === 'SELL' && 'bg-red-500/20 text-red-400',
                  signal.type === 'HOLD' && 'bg-gray-500/20 text-gray-400'
                )}>
                  {signal.predictedChange > 0 ? '+' : ''}{signal.predictedChange}%
                </span>
              </div>
              <div className="text-right">
                <div className="text-xs text-[#92adc9]">Target</div>
                <div className="text-white font-bold">
                  {market === 'japan' ? formatCurrency(signal.targetPrice, 'JPY') : formatCurrency(signal.targetPrice, 'USD')}
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-[#233648]/50">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-xs text-[#92adc9]">Stop Loss</div>
                  <div className="text-white font-medium">
                    {market === 'japan' ? formatCurrency(signal.stopLoss, 'JPY') : formatCurrency(signal.stopLoss, 'USD')}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#92adc9]">Current</div>
                  <div className="text-white font-medium">
                    {currentPrice ? (market === 'japan' ? formatCurrency(currentPrice, 'JPY') : formatCurrency(currentPrice, 'USD')) : '-'}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 text-xs text-[#92adc9]">
              <span className="font-medium text-white">理由:</span> {signal.reason}
            </div>
          </div>
        </div>
      )}

      {showVolume && (
        <div className="absolute bottom-0 left-0 right-0 h-16">
          <Bar data={volumeData} options={volumeOptions as any} />
        </div>
      )}
    </div>
  );
}
