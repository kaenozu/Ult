'use client';

import { useRef, useMemo, memo } from 'react';
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
  TooltipItem,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { OHLCV } from '@/app/types';
import { formatCurrency, calculateSMA, calculateBollingerBands, calculateMACD } from '@/app/lib/utils';

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
  height?: number;
  showVolume?: boolean;
  showIndicators?: boolean;
  showSMA?: boolean;
  showBollinger?: boolean;
  showMACD?: boolean;
  loading?: boolean;
  error?: string | null;
  market?: 'japan' | 'usa';
  currentPrice?: number;
}

// Memoize component to prevent re-renders from parent updates if props are unchanged
export const StockChart = memo(function StockChart({
  data, 
  height = 400, 
  showVolume = true, 
  showIndicators = true, 
  showSMA = true,
  showBollinger = false,
  showMACD = false,
  loading = false, 
  error = null,
  market = 'usa',
  currentPrice
}: StockChartProps) {
  const chartRef = useRef<ChartJS<'line'>>(null);

  // Memoize derived data arrays to prevent unnecessary mapping on every render
  const labels = useMemo(() => data.map(d => d.date), [data]);
  const prices = useMemo(() => data.map(d => d.close), [data]);
  const volumes = useMemo(() => data.map(d => d.volume), [data]);

  const sma20 = useMemo(() => calculateSMA(prices, 20), [prices]);
  const { upper, lower } = useMemo(() => calculateBollingerBands(prices, 20, 2), [prices]);
  const macdData = useMemo(() => calculateMACD(prices), [prices]);

  // Memoize chart configuration
  const chartData = useMemo(() => ({
    labels,
    datasets: [
      {
        label: '価格',
        data: prices,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
        order: 1,
        yAxisID: 'y',
      },
      ...(showSMA ? [{
        label: 'SMA (20)',
        data: sma20,
        borderColor: '#fbbf24',
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.1,
        fill: false,
        order: 2,
        yAxisID: 'y',
      }] : []),
      ...(showBollinger ? [
        {
          label: 'ボリバン+2σ',
          data: upper,
          borderColor: 'rgba(59, 130, 246, 0.5)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 1,
          pointRadius: 0,
          tension: 0.1,
          fill: '+1',
          order: 3,
          yAxisID: 'y',
        },
        {
          label: 'ボリバン-2σ',
          data: lower,
          borderColor: 'rgba(59, 130, 246, 0.5)',
          borderWidth: 1,
          pointRadius: 0,
          tension: 0.1,
          fill: false,
          order: 4,
          yAxisID: 'y',
        }
      ] : []),
      ...(showMACD ? [
        {
          label: 'MACD',
          data: macdData.macd,
          borderColor: '#3b82f6',
          borderWidth: 1.5,
          pointRadius: 0,
          yAxisID: 'yMACD',
          order: 10,
        },
        {
          label: 'シグナル',
          data: macdData.signal,
          borderColor: '#f43f5e',
          borderWidth: 1.5,
          pointRadius: 0,
          yAxisID: 'yMACD',
          order: 11,
        }
      ] : []),
    ],
  }), [labels, prices, sma20, upper, lower, macdData, showSMA, showBollinger, showMACD]);

  const options = useMemo(() => ({
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
          label: (context: TooltipItem<'line'>) => {
            if (context.parsed.y !== null) {
              return `${context.dataset.label}: ${formatCurrency(context.parsed.y, market === 'japan' ? 'JPY' : 'USD')}`;
            }
            return '';
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
        position: 'right' as const,
        grid: {
          color: 'rgba(35, 54, 72, 0.3)',
        },
        ticks: {
          color: '#92adc9',
          callback: (value: string | number) => {
            if (typeof value === 'number') {
              return formatCurrency(value, market === 'japan' ? 'JPY' : 'USD');
            }
            return value;
          },
        },
      },
      yMACD: {
        display: showMACD,
        position: 'left' as const,
        grid: {
          display: false,
        },
        ticks: {
          display: false,
        }
      }
    },
  }), [market, showMACD]);

  const volumeData = useMemo(() => ({
    labels,
    datasets: [
      {
        label: '出来高',
        data: volumes,
        backgroundColor: volumes.map((_, i) => {
          if (i === 0) return 'rgba(239, 68, 68, 0.5)';
          return prices[i] >= prices[i - 1]
            ? 'rgba(16, 185, 129, 0.5)'
            : 'rgba(239, 68, 68, 0.5)';
        }),
        borderWidth: 0,
      },
    ],
  }), [labels, volumes, prices]);

  const volumeOptions = useMemo(() => ({
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
      x: { display: false },
      y: { display: false },
    },
  }), []);

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
      <Line ref={chartRef} data={chartData} options={options as any} />

      {showVolume && (
        <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none opacity-50">
          <Bar data={volumeData} options={volumeOptions as any} />
        </div>
      )}
    </div>
  );
});
