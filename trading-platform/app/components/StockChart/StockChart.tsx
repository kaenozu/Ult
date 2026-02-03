'use client';

import { useRef, memo, useState, useMemo } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { OHLCV, Signal } from '@/app/types';
import { formatCurrency } from '@/app/lib/utils';
import { CANDLESTICK, SMA_CONFIG, BOLLINGER_BANDS, CHART_CONFIG, CHART_COLORS, CHART_DIMENSIONS, CHART_THEME } from '@/app/lib/constants';
import { volumeProfilePlugin } from './plugins/volumeProfile';
import { useChartData } from './hooks/useChartData';
import { useTechnicalIndicators } from './hooks/useTechnicalIndicators';
import { useForecastLayers } from './hooks/useForecastLayers';
import { useChartOptions } from './hooks/useChartOptions';
import { ChartTooltip } from './ChartTooltip';
import { AccuracyBadge } from '@/app/components/AccuracyBadge';

export { volumeProfilePlugin };

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
  accuracyData?: {
    hitRate: number;
    totalTrades: number;
    predictionError?: number;
    loading?: boolean;
  } | null;
}

export const StockChart = memo(function StockChart({
  data, indexData = [], height: propHeight, showVolume = true, showSMA = true, showBollinger = false, loading = false, error = null, market = 'usa', signal = null, accuracyData = null,
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
    hoveredIdx,
    accuracyData: accuracyData ? {
      predictionError: accuracyData.predictionError || 1.0
    } : null
  });

  // Get current SMA value for tooltip
  const currentSmaValue = useMemo(() => {
    if (!showSMA || !sma20 || sma20.length === 0 || hoveredIdx === null) return undefined;
    return sma20[hoveredIdx];
  }, [sma20, hoveredIdx, showSMA]);

  // 2. Chart Options Hook
  const options = useChartOptions({
    data,
    extendedData,
    market,
    hoveredIdx,
    setHoveredIndex,
    signal
  });

  // 3. Assemble Chart Data with memoization for performance
  const chartData = useMemo(() => ({
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
  }), [
    extendedData.labels,
    extendedData.prices,
    normalizedIndexData,
    forecastDatasets,
    ghostForecastDatasets,
    sma20,
    upper,
    lower,
    showSMA,
    showBollinger,
    market
  ]);

  // 4. Loading / Error States
  if (error) return (
    <div className={`relative w-full flex items-center justify-center ${CHART_THEME.ERROR.BACKGROUND} border ${CHART_THEME.ERROR.BORDER} rounded`} style={{ height: dynamicHeight }}>
      <div className="text-center p-4">
        <p className={`${CHART_THEME.ERROR.TEXT_TITLE} font-bold`}>データの取得に失敗しました</p>
        <p className={`${CHART_THEME.ERROR.TEXT_DESC} text-sm mt-1`}>{error}</p>
      </div>
    </div>
  );
  if (loading || data.length === 0) return (
<<<<<<< HEAD
    <div className={`relative w-full ${CHART_THEME.LOADING.BACKGROUND} border ${CHART_THEME.LOADING.BORDER} rounded animate-pulse`} style={{ height: dynamicHeight }}>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className={`h-8 w-8 border-2 ${CHART_THEME.LOADING.SPINNER_BORDER} border-t-transparent rounded-full animate-spin mb-2`}></div>
        <p className={`text-xs ${CHART_THEME.LOADING.TEXT}`}>データを取得中...</p>
=======
    <div className="relative w-full bg-[#131b23] border border-[#233648] rounded overflow-hidden" style={{ height: dynamicHeight }}>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="relative w-12 h-12 mb-4">
          <div className="absolute inset-0 border-2 border-primary/30 rounded-full"></div>
          <div className="absolute inset-0 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-sm text-[#92adc9] animate-pulse">チャートデータを読み込み中...</p>
>>>>>>> refactoring/major-codebase-cleanup
      </div>
    </div>
  );

  return (
    <div className="relative w-full group" style={{ height: dynamicHeight }}>
      {/* Accuracy Badge Overlay */}
      {accuracyData && (
        <div className="absolute top-2 right-2 z-20 pointer-events-none animate-fade-in">
          <AccuracyBadge
            hitRate={accuracyData.hitRate}
            totalTrades={accuracyData.totalTrades}
            predictionError={accuracyData.predictionError}
            loading={accuracyData.loading}
          />
        </div>
      )}
      
<<<<<<< HEAD
      {hoveredIdx !== null && hoveredIdx < data.length && (
        <div className={`absolute top-2 left-2 z-20 ${CHART_THEME.TOOLTIP.BACKGROUND} border ${CHART_THEME.TOOLTIP.BORDER} p-3 rounded shadow-xl pointer-events-none backdrop-blur-sm`}>
          <div className={`text-xs font-black ${CHART_THEME.TOOLTIP.TEXT_TITLE} uppercase border-b ${CHART_THEME.TOOLTIP.BORDER} pb-1 mb-1`}>{extendedData.labels[hoveredIdx]}</div>
          <div className={`text-sm font-bold ${CHART_THEME.TOOLTIP.TEXT_VALUE}`}>{formatCurrency(data[hoveredIdx].close, market === 'japan' ? 'JPY' : 'USD')}</div>
        </div>
      )}
=======
      {/* Custom Tooltip */}
      <ChartTooltip
        hoveredIdx={hoveredIdx}
        data={data}
        labels={extendedData.labels}
        market={market}
        signal={signal}
        showSMA={showSMA}
        smaValue={currentSmaValue}
      />
      
>>>>>>> refactoring/major-codebase-cleanup
      <Line ref={chartRef} data={chartData} options={options} />
      {showVolume && (
        <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none">
           <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } } }} />
        </div>
      )}
    </div>
  );
});
