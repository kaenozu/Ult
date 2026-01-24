'use client';

import { useRef, useMemo, memo, useState } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler, ChartOptions
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { OHLCV, Signal } from '@/app/types';
import { formatCurrency, calculateSMA, calculateBollingerBands } from '@/app/lib/utils';
import { analyzeStock } from '@/app/lib/analysis';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

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
  data, height = 400, showVolume = true, showSMA = true, showBollinger = false, loading = false, error = null, market = 'usa', signal = null,
}: StockChartProps) {
  const chartRef = useRef<ChartJS<'line'>>(null);
  const [hoveredIdx, setHoveredIndex] = useState<number | null>(null);

  // 1. 基本データと未来予測用のラベル拡張
  const extendedData = useMemo(() => {
    const labels = data.map(d => d.date);
    const prices = data.map(d => d.close);
    if (signal && data.length > 0) {
      const lastDate = new Date(data[data.length - 1].date);
      for (let i = 1; i <= 5; i++) {
        const future = new Date(lastDate);
        future.setDate(lastDate.getDate() + i);
        labels.push(future.toISOString().split('T')[0]);
        prices.push(NaN);
      }
    }
    return { labels, prices };
  }, [data, signal]);

  const sma20 = useMemo(() => calculateSMA(extendedData.prices, 20), [extendedData.prices]);
  const { upper, lower } = useMemo(() => calculateBollingerBands(extendedData.prices, 20, 2), [extendedData.prices]);

  // 2. AI Time Travel: Ghost Cloud (過去の予測再現)
  const ghostForecastDatasets = useMemo(() => {
    if (hoveredIdx === null || hoveredIdx >= data.length || data.length < 50) return [];
    const pastSignal = analyzeStock(data[0].symbol || '', data.slice(0, hoveredIdx + 1), market);
    if (!pastSignal) return [];

    const targetArr = new Array(extendedData.labels.length).fill(NaN);
    const stopArr = new Array(extendedData.labels.length).fill(NaN);
    const currentPrice = data[hoveredIdx].close;
    targetArr[hoveredIdx] = stopArr[hoveredIdx] = currentPrice;

    const stockATR = pastSignal.atr || (currentPrice * 0.02);
    const confidenceFactor = (110 - pastSignal.confidence) / 25;
    const momentum = pastSignal.predictedChange / 100;

    for (let i = 1; i <= 5; i++) {
      if (hoveredIdx + i < extendedData.labels.length) {
        const timeRatio = i / 5;
        const centerPrice = currentPrice * (1 + (momentum * timeRatio));
        const spread = (stockATR * timeRatio) * confidenceFactor;
        targetArr[hoveredIdx + i] = centerPrice + spread;
        stopArr[hoveredIdx + i] = centerPrice - spread;
      }
    }

    const color = pastSignal.type === 'BUY' ? '34, 197, 94' : pastSignal.type === 'SELL' ? '239, 68, 68' : '100, 116, 139';
    return [
      { label: '過去予測(上)', data: targetArr, borderColor: `rgba(${color}, 0.3)`, backgroundColor: `rgba(${color}, 0.08)`, borderWidth: 1, borderDash: [3, 3], pointRadius: 0, fill: '+1', order: -2 },
      { label: '過去予測(下)', data: stopArr, borderColor: `rgba(${color}, 0.1)`, borderWidth: 1, pointRadius: 0, fill: false, order: -2 }
    ];
  }, [hoveredIdx, data, market, extendedData.labels.length]);

  // 3. 需給の壁 (Volume Profile Resistance/Support)
  const wallDatasets = useMemo(() => {
    if (!signal?.volumeResistance || data.length === 0) return [];
    const currentPrice = data[data.length - 1].close;
    return signal.volumeResistance.map((wall, i) => {
      const isAbove = wall.price > currentPrice;
      const color = isAbove ? '239, 68, 68' : '34, 197, 94';
      return {
        label: `壁 ${i}`, data: new Array(extendedData.labels.length).fill(wall.price),
        borderColor: `rgba(${color}, ${wall.strength * 0.3})`,
        borderWidth: Math.max(1, wall.strength * 4),
        pointRadius: 0, fill: false, order: 5, borderDash: [5, 5],
      };
    });
  }, [signal, data, extendedData.labels.length]);

  // 4. 未来予測の予報円 (Forecast Cone)
  const forecastDatasets = useMemo(() => {
    if (!signal || data.length === 0) return [];
    const lastIdx = data.length - 1;
    const currentPrice = data[lastIdx].close;
    const targetArr = new Array(extendedData.labels.length).fill(NaN);
    const stopArr = new Array(extendedData.labels.length).fill(NaN);
    
    const stockATR = signal.atr || (currentPrice * 0.02);
    const confidenceFactor = ((110 - signal.confidence) / 25) * (signal.predictionError || 1.0);
    
    let target = signal.targetPrice, stop = signal.stopLoss;
    if (signal.type === 'HOLD') {
      target = currentPrice + (stockATR * confidenceFactor);
      stop = currentPrice - (stockATR * confidenceFactor);
    } else {
      const uncertainty = (stockATR * 0.5) * confidenceFactor;
      target += (signal.type === 'BUY' ? 1 : -1) * uncertainty;
      stop -= (signal.type === 'BUY' ? 1 : -1) * uncertainty;
    }

    targetArr[lastIdx] = stopArr[lastIdx] = currentPrice;
    const steps = extendedData.labels.length - 1 - lastIdx;
    for (let i = 1; i <= steps; i++) {
      const ratio = i / steps;
      targetArr[lastIdx + i] = currentPrice + (target - currentPrice) * ratio;
      stopArr[lastIdx + i] = currentPrice + (stop - currentPrice) * ratio;
    }

    const color = signal.type === 'BUY' ? '16, 185, 129' : signal.type === 'SELL' ? '239, 68, 68' : '146, 173, 201';
    return [
      { label: 'ターゲット', data: targetArr, borderColor: `rgba(${color}, 0.8)`, backgroundColor: `rgba(${color}, 0.25)`, borderWidth: 2, borderDash: [6, 4], pointRadius: 0, fill: '+1', order: -1 },
      { label: 'リスク', data: stopArr, borderColor: `rgba(${color}, 0.4)`, borderWidth: 2, borderDash: [6, 4], pointRadius: 0, fill: false, order: -1 }
    ];
  }, [signal, data, extendedData]);

  const chartData = useMemo(() => ({
    labels: extendedData.labels,
    datasets: [
      { label: '現在価格', data: extendedData.prices, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.1, pointRadius: 0, pointHoverRadius: 4, borderWidth: 2, order: 1 },
      ...forecastDatasets, ...ghostForecastDatasets, ...wallDatasets,
      ...(showSMA ? [{ label: 'SMA (20)', data: sma20, borderColor: '#fbbf24', borderWidth: 1.5, pointRadius: 0, tension: 0.1, fill: false, order: 2 }] : []),
      ...(showBollinger ? [
        { label: 'BB Upper', data: upper, borderColor: 'rgba(59, 130, 246, 0.5)', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderWidth: 1, pointRadius: 0, tension: 0.1, fill: '+1', order: 3 },
        { label: 'BB Lower', data: lower, borderColor: 'rgba(59, 130, 246, 0.5)', borderWidth: 1, pointRadius: 0, tension: 0.1, fill: false, order: 4 }
      ] : []),
    ],
  }), [extendedData, sma20, upper, lower, showSMA, showBollinger, forecastDatasets, ghostForecastDatasets, wallDatasets]);

  const options: ChartOptions<'line'> = useMemo(() => ({
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    onHover: (_, elements) => setHoveredIndex(elements.length > 0 ? elements[0].index : null),
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: {
      x: {
        min: extendedData.labels.length > 105 ? extendedData.labels[extendedData.labels.length - 105] : undefined,
        grid: { color: (c) => c.index === hoveredIdx ? 'rgba(59, 130, 246, 0.8)' : (c.index! >= data.length ? 'rgba(59, 130, 246, 0.2)' : 'rgba(35, 54, 72, 0.3)'), lineWidth: (c) => c.index === hoveredIdx ? 2 : (c.index === data.length - 1 ? 3 : 1) },
        ticks: { color: (c) => c.index === hoveredIdx ? '#fff' : (c.index! >= data.length ? '#3b82f6' : '#92adc9'), maxTicksLimit: 15 }
      },
      y: { grid: { color: 'rgba(35, 54, 72, 0.3)' }, ticks: { color: '#92adc9', callback: (v) => formatCurrency(Number(v), market === 'japan' ? 'JPY' : 'USD') } }
    },
  }), [market, data.length, extendedData.labels, hoveredIdx]);

  if (error) return (
    <div className="relative w-full flex items-center justify-center bg-red-500/10 border border-red-500/50 rounded" style={{ height }}>
      <div className="text-center p-4">
        <p className="text-red-400 font-bold">データの取得に失敗しました</p>
        <p className="text-red-300 text-sm mt-1">{error}</p>
      </div>
    </div>
  );
  if (loading || data.length === 0) return (
    <div className="relative w-full bg-[#131b23] border border-[#233648] rounded animate-pulse" style={{ height }}>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="h-8 w-8 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin mb-2"></div>
        <p className="text-xs text-[#92adc9]">データを取得中...</p>
      </div>
    </div>
  );

  return (
    <div className="relative w-full group" style={{ height }}>
      {hoveredIdx !== null && hoveredIdx < data.length && (
        <div className="absolute top-2 left-2 z-20 bg-[#1a2632]/90 border border-[#233648] p-2 rounded shadow-xl pointer-events-none backdrop-blur-sm">
          <div className="text-[10px] font-black text-primary uppercase border-b border-[#233648] pb-1 mb-1">{extendedData.labels[hoveredIdx]}</div>
          <div className="text-xs font-bold text-white">{formatCurrency(data[hoveredIdx].close, market === 'japan' ? 'JPY' : 'USD')}</div>
        </div>
      )}
      <Line ref={chartRef} data={chartData} options={options} />
      {showVolume && (
        <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none">
          <Bar data={{
            labels: extendedData.labels,
            datasets: [{
              data: data.map(d => d.volume),
              backgroundColor: data.map((d, i) => i === 0 || d.close >= data[i - 1].close ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)')
            }]
          }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } } }} />
        </div>
      )}
    </div>
  );
});