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
  ChartOptions,
  TooltipItem,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { OHLCV, Signal } from '@/app/types';
import { formatCurrency, calculateSMA, calculateBollingerBands } from '@/app/lib/utils';

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
  showSMA?: boolean;
  showBollinger?: boolean;
  loading?: boolean;
  error?: string | null;
  market?: 'japan' | 'usa';
  signal?: Signal | null;
}

// Memoize component to prevent re-renders from parent updates if props are unchanged
export const StockChart = memo(function StockChart({
  data, 
  height = 400, 
  showVolume = true, 
  showSMA = true,
  showBollinger = false,
  loading = false, 
  error = null,
  market = 'usa',
  signal = null,
}: StockChartProps) {
  const chartRef = useRef<ChartJS<'line'>>(null);

  // Extend labels and data for forecast (5 days)
  const extendedData = useMemo(() => {
    const labels = data.map(d => d.date);
    const prices = data.map(d => d.close);
    
    if (signal) {
      // Add 5 future slots with explicit labels
      const lastDate = data.length > 0 ? new Date(data[data.length - 1].date) : new Date();
      for (let i = 1; i <= 5; i++) {
        const futureDate = new Date(lastDate);
        futureDate.setDate(lastDate.getDate() + i);
        labels.push(futureDate.toISOString().split('T')[0]);
        prices.push(NaN); // No real price yet
      }
    }
    
    return { labels, prices };
  }, [data, signal]);

  const volumes = useMemo(() => data.map(d => d.volume), [data]);
  const sma20 = useMemo(() => calculateSMA(extendedData.prices, 20), [extendedData.prices]);
  const { upper, lower } = useMemo(() => calculateBollingerBands(extendedData.prices, 20, 2), [extendedData.prices]);

  // Build Forecast Cloud datasets
  const forecastDatasets = useMemo(() => {
    if (!signal || data.length === 0) return [];

    const lastIdx = data.length - 1;
    const currentPrice = data[lastIdx].close;
    
    const targetArr = new Array(extendedData.labels.length).fill(NaN);
    const stopArr = new Array(extendedData.labels.length).fill(NaN);
    
    // Determine target/stop levels using ATR and Confidence
    const stockATR = signal.atr || (currentPrice * 0.02);
    const confidenceFactor = (110 - signal.confidence) / 30; // High confidence = narrower cloud
    
    let target = signal.targetPrice;
    let stop = signal.stopLoss;

    if (signal.type === 'HOLD') {
      target = currentPrice + (stockATR * confidenceFactor);
      stop = currentPrice - (stockATR * confidenceFactor);
    } else {
      // For BUY/SELL, the 'width' of the cloud reflects uncertainty
      const uncertainty = (stockATR * 0.5) * confidenceFactor;
      if (signal.type === 'BUY') {
        target = signal.targetPrice + uncertainty;
        stop = signal.targetPrice - uncertainty;
      } else {
        target = signal.targetPrice - uncertainty;
        stop = signal.targetPrice + uncertainty;
      }
    }

    // Connect from current price
    targetArr[lastIdx] = currentPrice;
    stopArr[lastIdx] = currentPrice;
    
    // Smoothly interpolate to the target over 5 days
    const steps = extendedData.labels.length - 1 - lastIdx;
    for (let i = 1; i <= steps; i++) {
      const ratio = i / steps;
      targetArr[lastIdx + i] = currentPrice + (target - currentPrice) * ratio;
      stopArr[lastIdx + i] = currentPrice + (stop - currentPrice) * ratio;
    }

    const isBuy = signal.type === 'BUY';
    const isSell = signal.type === 'SELL';
    
    // Vivid colors for high visibility
    const cloudColor = isBuy ? 'rgba(16, 185, 129' : isSell ? 'rgba(239, 68, 68' : 'rgba(146, 173, 201';
    const borderOpacity = signal.type === 'HOLD' ? 0.3 : 0.8;
    const fillOpacity = signal.type === 'HOLD' ? 0.05 : 0.25;

    return [
      {
        label: 'AI予測ターゲット',
        data: targetArr,
        borderColor: `${cloudColor}, ${borderOpacity})`,
        backgroundColor: `${cloudColor}, ${fillOpacity})`,
        borderWidth: 2,
        borderDash: [6, 4],
        pointRadius: 0,
        fill: '+1',
        order: -1,
      },
      {
        label: 'AI予測リスク',
        data: stopArr,
        borderColor: `${cloudColor}, ${borderOpacity * 0.5})`,
        borderWidth: 2,
        borderDash: [6, 4],
        pointRadius: 0,
        fill: false,
        order: -1,
      }
    ];
  }, [signal, data, extendedData]);

  // Memoize chart configuration
  const chartData = useMemo(() => ({
    labels: extendedData.labels,
    datasets: [
      {
        label: '現在価格',
        data: extendedData.prices,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
        order: 1,
      },
      ...forecastDatasets,
      ...(showSMA ? [{
        label: 'SMA (20)',
        data: sma20,
        borderColor: '#fbbf24', // Yellow
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.1,
        fill: false,
        order: 2,
      }] : []),
      ...(showBollinger ? [
        {
          label: 'BB Upper',
          data: upper,
          borderColor: 'rgba(59, 130, 246, 0.5)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 1,
          pointRadius: 0,
          tension: 0.1,
          fill: '+1' as const,
          order: 3,
        },
        {
          label: 'BB Lower',
          data: lower,
          borderColor: 'rgba(59, 130, 246, 0.5)',
          borderWidth: 1,
          pointRadius: 0,
          tension: 0.1,
          fill: false,
          order: 4,
        }
      ] : []),
    ],
  }), [extendedData, sma20, upper, lower, showSMA, showBollinger, forecastDatasets]);

  const options: ChartOptions<'line'> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { right: 40 } // Extra padding for the future labels
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a2632',
        titleColor: '#fff',
        bodyColor: '#92adc9',
        borderColor: '#233648',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (context: TooltipItem<'line'>) => {
            const value = context.parsed.y ?? 0;
            const isForecast = context.dataIndex >= data.length;
            const prefix = isForecast ? '【予測】' : '';
            return `${prefix}${context.dataset.label}: ${formatCurrency(value, market === 'japan' ? 'JPY' : 'USD')}`;
          },
        },
      },
    },
    scales: {
      x: {
        // Default zoom to show only recent data + future for clarity
        min: extendedData.labels.length > 105 ? extendedData.labels[extendedData.labels.length - 105] : undefined,
        grid: {
          color: (context) => context.index >= data.length ? 'rgba(59, 130, 246, 0.2)' : 'rgba(35, 54, 72, 0.3)',
          lineWidth: (context) => context.index === data.length - 1 ? 3 : 1,
        },
        ticks: {
          color: (context) => (context.index >= data.length ? '#3b82f6' : '#92adc9'),
          maxTicksLimit: 15,
        },
      },
      y: {
        grid: { color: 'rgba(35, 54, 72, 0.3)' },
        ticks: {
          color: '#92adc9',
          callback: (value) => formatCurrency(Number(value), market === 'japan' ? 'JPY' : 'USD'),
        },
      },
    },
  }), [market, data.length, extendedData.labels]);

  const volumeData = useMemo(() => ({
    labels: extendedData.labels,
    datasets: [
      {
        label: '出来高',
        data: volumes,
        backgroundColor: volumes.map((_, i) => {
          if (i === 0) return 'rgba(239, 68, 68, 0.5)';
          const currentPrice = data[i]?.close || 0;
          const prevPrice = data[i - 1]?.close || currentPrice;
          return currentPrice >= prevPrice ? 'rgba(239, 68, 68, 0.5)' : 'rgba(16, 185, 129, 0.5)';
        }),
        borderWidth: 0,
      },
    ],
  }), [extendedData.labels, volumes, data]);

  const volumeOptions: ChartOptions<'bar'> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
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
      <Line ref={chartRef} data={chartData} options={options} />

      {showVolume && (
        <div className="absolute bottom-0 left-0 right-0 h-16">
          <Bar data={volumeData} options={volumeOptions} />
        </div>
      )}
    </div>
  );
});