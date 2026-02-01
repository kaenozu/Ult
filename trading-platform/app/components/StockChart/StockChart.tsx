'use client';

import { useRef, memo, useState, useMemo } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { OHLCV, Signal } from '@/app/types';
import { formatCurrency } from '@/app/lib/utils';
import { CANDLESTICK, SMA_CONFIG, BOLLINGER_BANDS, CHART_CONFIG, CHART_COLORS, CHART_DIMENSIONS } from '@/app/lib/constants';
import { volumeProfilePlugin } from './plugins/volumeProfile';
export { volumeProfilePlugin };
import { useChartData } from './hooks/useChartData';
import { useTechnicalIndicators } from './hooks/useTechnicalIndicators';
import { useForecastLayers } from './hooks/useForecastLayers';
import { useChartOptions } from './hooks/useChartOptions';

// Register ChartJS components and custom plugin
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler, volumeProfilePlugin);

export interface StockChartProps {
  data: OHLCV[];
  indexData?: OHLCV[];
  height?: number;
  showVolume?: boolean;
  showSMA?: boolean;
  showBollinger?: boolean;
  loading?: boolean;
  error?: string | null;
  market?: 'japan' | 'usa';
  signal?: Signal | null;
}

// 価格変動幅に基づいてチャート高さを計算（固定高さ）
function calculateOptimalHeight(data: OHLCV[], defaultHeight: number): number {
  // 常に固定高さを返す
  return defaultHeight;
}

export const StockChart = memo(function StockChart({
  data, indexData = [], height: propHeight, showVolume = true, showSMA = true, showBollinger = false, loading = false, error = null, market = 'usa', signal = null,
}: StockChartProps) {
  const chartRef = useRef<ChartJS<'line'>>(null);
  const [hoveredIdx, setHoveredIndex] = useState<number | null>(null);

  // 固定高さを使用
  const dynamicHeight = propHeight ?? CHART_DIMENSIONS.DEFAULT_HEIGHT;

  // 1. Data Preparation Hooks
  const { extendedData, normalizedIndexData } = useChartData(data, signal, indexData);
  const { sma20, upper, lower } = useTechnicalIndicators(extendedData.prices);
  const { ghostForecastDatasets, forecastDatasets } = useForecastLayers({
    data,
    extendedData,
    signal,
    market,
    hoveredIdx
  });

  // 2. Chart Options Hook
  const options = useChartOptions({
    data,
    extendedData,
    market,
    hoveredIdx,
    setHoveredIndex,
    signal
  });

  // 3. Assemble Chart Data
  const chartData = {
    labels: extendedData.labels,
    datasets: [
      {
        label: market === 'japan' ? '日経平均 (相対)' : 'NASDAQ (相対)',
        data: normalizedIndexData,
        borderColor: CHART_COLORS.INDEX_LINE,
        backgroundColor: CHART_COLORS.INDEX_FILL,
        fill: false,
        pointRadius: 0,
        borderWidth: 1,
        tension: CHART_CONFIG.TENSION,
        order: 10
      },
      {
        label: '現在価格',
        data: extendedData.prices,
        borderColor: CANDLESTICK.MAIN_LINE_COLOR,
        fill: false,
        tension: CHART_CONFIG.TENSION,
        pointRadius: 0,
        pointHoverRadius: CANDLESTICK.HOVER_RADIUS,
        borderWidth: CANDLESTICK.MAIN_LINE_WIDTH,
        order: 1
      },
      ...forecastDatasets,
      ...ghostForecastDatasets,
      ...(showSMA ? [{
        label: `SMA (${SMA_CONFIG.SHORT_PERIOD})`,
        data: sma20,
        borderColor: SMA_CONFIG.COLOR,
        borderWidth: SMA_CONFIG.LINE_WIDTH,
        pointRadius: 0,
        tension: CHART_CONFIG.TENSION,
        fill: false,
        order: 2
      }] : []),
      ...(showBollinger ? [
        {
          label: 'BB Upper',
          data: upper,
          borderColor: BOLLINGER_BANDS.UPPER_COLOR,
          backgroundColor: BOLLINGER_BANDS.UPPER_BACKGROUND,
          borderWidth: 1,
          pointRadius: 0,
          tension: CHART_CONFIG.TENSION,
          fill: '+1',
          order: 3
        },
        {
          label: 'BB Lower',
          data: lower,
          borderColor: BOLLINGER_BANDS.LOWER_COLOR,
          borderWidth: 1,
          pointRadius: 0,
          tension: CHART_CONFIG.TENSION,
          fill: false,
          order: 4
        }
      ] : []),
    ],
  };

  // 4. Loading / Error States
  if (error) return (
    <div className="relative w-full flex items-center justify-center bg-red-500/10 border border-red-500/50 rounded" style={{ height: dynamicHeight }}>
      <div className="text-center p-4">
        <p className="text-red-400 font-bold">データの取得に失敗しました</p>
        <p className="text-red-300 text-sm mt-1">{error}</p>
      </div>
    </div>
  );
  if (loading || data.length === 0) return (
    <div className="relative w-full bg-[#131b23] border border-[#233648] rounded animate-pulse" style={{ height: dynamicHeight }}>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="h-8 w-8 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin mb-2"></div>
        <p className="text-xs text-[#92adc9]">データを取得中...</p>
      </div>
    </div>
  );

  return (
    <div className="relative w-full group" style={{ height: dynamicHeight }}>
      {hoveredIdx !== null && hoveredIdx < data.length && (
        <div className="absolute top-2 left-2 z-20 bg-[#1a2632]/90 border border-[#233648] p-3 rounded shadow-xl pointer-events-none backdrop-blur-sm">
          <div className="text-xs font-black text-primary uppercase border-b border-[#233648] pb-1 mb-1">{extendedData.labels[hoveredIdx]}</div>
          <div className="text-sm font-bold text-white">{formatCurrency(data[hoveredIdx].close, market === 'japan' ? 'JPY' : 'USD')}</div>
        </div>
      )}
      <Line ref={chartRef} data={chartData} options={options} />
      {showVolume && (
        <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none">
          <Bar data={{
            labels: extendedData.labels,
            datasets: [{
              data: data.map(d => d.volume),
              backgroundColor: data.map((d, i) =>
                i === 0 || d.close >= data[i - 1].close ? CANDLESTICK.BULL_COLOR : CANDLESTICK.BEAR_COLOR
              )
            }]
          }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } } }} />
        </div>
      )}
    </div>
  );
});
