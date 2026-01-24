'use client';

import { useRef, useMemo, memo, useState } from 'react';
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
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { OHLCV, Signal } from '@/app/types';
import { formatCurrency, calculateSMA, calculateBollingerBands } from '@/app/lib/utils';
import { analyzeStock } from '@/app/lib/analysis';

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
  const [hoveredIdx, setHoveredIndex] = useState<number | null>(null);

  const extendedData = useMemo(() => {
    const labels = data.map(d => d.date);
    const prices = data.map(d => d.close);
    if (signal) {
      const lastDate = data.length > 0 ? new Date(data[data.length - 1].date) : new Date();
      for (let i = 1; i <= 5; i++) {
        const futureDate = new Date(lastDate);
        futureDate.setDate(lastDate.getDate() + i);
        labels.push(futureDate.toISOString().split('T')[0]);
        prices.push(NaN);
      }
    }
    return { labels, prices };
  }, [data, signal]);

  const volumes = useMemo(() => data.map(d => d.volume), [data]);
  const sma20 = useMemo(() => calculateSMA(extendedData.prices, 20), [extendedData.prices]);
  const { upper, lower } = useMemo(() => calculateBollingerBands(extendedData.prices, 20, 2), [extendedData.prices]);

  // AI Time Travel: Ghost Cloud
  const ghostForecastDatasets = useMemo(() => {
    if (hoveredIdx === null || hoveredIdx >= data.length || data.length < 50) return [];
    const historicalSlice = data.slice(0, hoveredIdx + 1);
    const symbol = data[0].symbol || '';
    const pastSignal = analyzeStock(symbol, historicalSlice, market);
    if (!pastSignal) return [];

    const targetArr = new Array(extendedData.labels.length).fill(NaN);
    const stopArr = new Array(extendedData.labels.length).fill(NaN);
    const currentPrice = data[hoveredIdx].close;
    targetArr[hoveredIdx] = currentPrice;
    stopArr[hoveredIdx] = currentPrice;

    // Determine target/stop for ghost cloud using "Searchlight Cone" geometry
    const stockATR = pastSignal.atr || (currentPrice * 0.02);
    const confidenceFactor = (110 - pastSignal.confidence) / 25;
    const momentum = (pastSignal.predictedChange / 100); // Directional slope

    const steps = 5;
    for (let i = 1; i <= steps; i++) {
      if (hoveredIdx + i < extendedData.labels.length) {
        const timeRatio = i / steps;
        
        // The center path follows the predicted momentum
        const centerPrice = currentPrice * (1 + (momentum * timeRatio));
        
        // The spread (width) expands as we go further into the future (Searchlight effect)
        // High confidence = tighter beam, Low confidence = wider beam
        const spread = (stockATR * timeRatio) * confidenceFactor;
        
        targetArr[hoveredIdx + i] = centerPrice + spread;
        stopArr[hoveredIdx + i] = centerPrice - spread;
      }
    }

    const isBuy = pastSignal.type === 'BUY';
    const isSell = pastSignal.type === 'SELL';
    // Use slightly different ghost colors to distinguish from "Future" cloud
    const color = isBuy ? 'rgba(34, 197, 94' : isSell ? 'rgba(239, 68, 68' : 'rgba(100, 116, 139';
    
    return [
      {
        label: '過去の予測範囲(上)',
        data: targetArr,
        borderColor: `${color}, 0.3)`,
        backgroundColor: `${color}, 0.08)`,
        borderWidth: 1,
        borderDash: [3, 3],
        pointRadius: 0,
        fill: '+1',
        order: -2,
      },
      {
        label: '過去の予測範囲(下)',
        data: stopArr,
        borderColor: `${color}, 0.1)`,
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
        order: -2,
      }
    ];
  }, [hoveredIdx, data, market, extendedData.labels.length]);

  const forecastDatasets = useMemo(() => {
    if (!signal || data.length === 0) return [];
    const lastIdx = data.length - 1;
    const currentPrice = data[lastIdx].close;
    const targetArr = new Array(extendedData.labels.length).fill(NaN);
    const stopArr = new Array(extendedData.labels.length).fill(NaN);
    // Determine target/stop levels using ATR, Confidence, and Self-Correction Error
    const stockATR = signal.atr || (currentPrice * 0.02);
    const errorFactor = signal.predictionError || 1.0;
    const confidenceFactor = ((110 - signal.confidence) / 25) * errorFactor; // Error factor expands the cone
    
    let target = signal.targetPrice;
    let stop = signal.stopLoss;
    if (signal.type === 'HOLD') {
      target = currentPrice + (stockATR * confidenceFactor);
      stop = currentPrice - (stockATR * confidenceFactor);
    } else {
      const uncertainty = (stockATR * 0.5) * confidenceFactor;
      if (signal.type === 'BUY') { target = signal.targetPrice + uncertainty; stop = signal.targetPrice - uncertainty; }
      else { target = signal.targetPrice - uncertainty; stop = signal.targetPrice + uncertainty; }
    }

    targetArr[lastIdx] = currentPrice;
    stopArr[lastIdx] = currentPrice;
    const steps = extendedData.labels.length - 1 - lastIdx;
    for (let i = 1; i <= steps; i++) {
      const ratio = i / steps;
      targetArr[lastIdx + i] = currentPrice + (target - currentPrice) * ratio;
      stopArr[lastIdx + i] = currentPrice + (stop - currentPrice) * ratio;
    }

    const cloudColor = signal.type === 'BUY' ? 'rgba(16, 185, 129' : signal.type === 'SELL' ? 'rgba(239, 68, 68' : 'rgba(146, 173, 201';
    return [
      {
        label: 'AI予測ターゲット',
        data: targetArr,
        borderColor: `${cloudColor}, 0.8)`,
        backgroundColor: `${cloudColor}, 0.25)`,
        borderWidth: 2,
        borderDash: [6, 4],
        pointRadius: 0,
        fill: '+1',
        order: -1,
      },
      {
        label: 'AI予測リスク',
        data: stopArr,
        borderColor: `${cloudColor}, 0.4)`,
        borderWidth: 2,
        borderDash: [6, 4],
        pointRadius: 0,
        fill: false,
        order: -1,
      }
    ];
  }, [signal, data, extendedData]);

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
      ...ghostForecastDatasets,
      ...(showSMA ? [{
        label: 'SMA (20)',
        data: sma20,
        borderColor: '#fbbf24',
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
  }), [extendedData, sma20, upper, lower, showSMA, showBollinger, forecastDatasets, ghostForecastDatasets]);

  const options: ChartOptions<'line'> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { right: 40 } },
    interaction: { mode: 'index' as const, intersect: false },
    onHover: (event, elements) => {
      if (elements && elements.length > 0) {
        setHoveredIndex(elements[0].index);
      } else {
        setHoveredIndex(null);
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: false, // Disable default tooltip to prevent overlap
      },
    },
    scales: {
      x: {
        // ... grid settings ...
        min: extendedData.labels.length > 105 ? extendedData.labels[extendedData.labels.length - 105] : undefined,
        grid: {
          color: (context) => {
            // Show a special vertical line at the hovered index (Crosshair)
            if (context.index === hoveredIdx) return 'rgba(59, 130, 246, 0.8)';
            const isFuture = context.index >= data.length;
            return isFuture ? 'rgba(59, 130, 246, 0.2)' : 'rgba(35, 54, 72, 0.3)';
          },
          lineWidth: (context) => (context.index === hoveredIdx ? 2 : context.index === data.length - 1 ? 3 : 1),
          drawTicks: true,
        },
        ticks: {
          color: (context) => (context.index === hoveredIdx ? '#fff' : context.index >= data.length ? '#3b82f6' : '#92adc9'),
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
  }), [market, data.length, extendedData.labels, hoveredIdx]);

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
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: { x: { display: false }, y: { display: false } },
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
    <div className="relative w-full group" style={{ height }}>
      {/* Floating HUD for Hover Data */}
      {hoveredIdx !== null && hoveredIdx < data.length && (
        <div className="absolute top-2 left-2 z-20 bg-[#1a2632]/90 border border-[#233648] p-2 rounded shadow-xl pointer-events-none backdrop-blur-sm transition-opacity duration-200">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 border-b border-[#233648] pb-1 mb-1">
              <span className="text-[10px] font-black text-primary uppercase">Point Analysis</span>
              <span className="text-[10px] text-[#92adc9]">{extendedData.labels[hoveredIdx]}</span>
            </div>
            <div className="flex gap-4">
              <div>
                <div className="text-[9px] text-[#92adc9] uppercase font-bold">Price</div>
                <div className="text-xs font-bold text-white">{formatCurrency(data[hoveredIdx].close, market === 'japan' ? 'JPY' : 'USD')}</div>
              </div>
              {/* If it's a ghost cloud point, show reproduced prediction */}
              {ghostForecastDatasets.length > 0 && (
                <div className="border-l border-[#233648] pl-3">
                  <div className="text-[9px] text-blue-400 uppercase font-bold">Reproduced Prediction</div>
                  <div className="text-xs font-bold text-blue-300">当時のAI予測を再現中</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Line ref={chartRef} data={chartData} options={options} />
      {showVolume && (
        <div className="absolute bottom-0 left-0 right-0 h-16">
          <Bar data={volumeData} options={volumeOptions} />
        </div>
      )}
    </div>
  );
});
