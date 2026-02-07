'use client';

import { useRef, memo, useState, useMemo, useEffect } from 'react';
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

// Register ChartJS components and custom plugins
// Removed zoomPlugin to resolve resetZoom runtime errors
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
  const { actualData, optimizedData, forecastExtension, normalizedIndexData, extendedData } = useChartData(data, signal, indexData);
  const { sma20, upper, lower } = useTechnicalIndicators(extendedData.prices);
  const { ghostForecastDatasets, forecastDatasets } = useForecastLayers({
    data: optimizedData, // Use optimized/reduced data for correct index alignment
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

  // Calculate global min/max for Y-axis scaling
  const priceRange = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;

    // 1. Current Price
    if (data.length > 0) {
      const lows = data.map(d => d.low);
      const highs = data.map(d => d.high);
      min = Math.min(min, ...lows);
      max = Math.max(max, ...highs);
    }

    // 2. SMA
    if (showSMA && sma20.length > 0) {
      const validSma = sma20.filter((v): v is number => typeof v === 'number' && !isNaN(v));
      if (validSma.length > 0) {
        min = Math.min(min, ...validSma);
        max = Math.max(max, ...validSma);
      }
    }

    // 3. Bollinger Bands
    if (showBollinger && upper.length > 0 && lower.length > 0) {
      const validUpper = upper.filter((v): v is number => typeof v === 'number' && !isNaN(v));
      const validLower = lower.filter((v): v is number => typeof v === 'number' && !isNaN(v));
      if (validUpper.length > 0) max = Math.max(max, ...validUpper);
      if (validLower.length > 0) min = Math.min(min, ...validLower);
    }

    // Fallback if no data
    if (min === Infinity) return { min: 0, max: 100 };

    // Add 5% padding
    const padding = (max - min) * 0.05;
    return { min: min - padding, max: max + padding };
  }, [data, sma20, upper, lower, showSMA, showBollinger]);

  // 2. Chart Configuration
  const options = useChartOptions({
    data,
    extendedData,
    market,
    hoveredIdx,
    setHoveredIndex,
    signal,
    priceRange
  });

  const chartData = useMemo(() => ({
     labels: extendedData.labels,
     datasets: [
       {
         label: `${market === 'japan' ? '株価' : 'Stock Price'}`,
         data: actualData.prices,
         borderColor: CHART_COLORS.PRICE.LINE,
         backgroundColor: CHART_COLORS.PRICE.BACKGROUND,
         borderWidth: 2,
         pointRadius: 0,
         pointHoverRadius: 4,
         fill: true,
         tension: 0.1,
         yAxisID: 'y',
       },
       ...(showSMA && sma20.length > 0 ? [
         {
           label: `SMA (${SMA_CONFIG.MEDIUM_PERIOD})`,
           data: sma20,
           borderColor: CHART_COLORS.INDICATORS.SMA,
           borderWidth: 1.5,
           pointRadius: 0,
           fill: false,
           tension: 0.1,
           yAxisID: 'y',
         }
       ] : []),
       ...(showBollinger && upper.length > 0 && lower.length > 0 ? [
         {
           label: 'Bollinger Upper',
           data: upper,
           borderColor: CHART_COLORS.INDICATORS.BOLLINGER,
           borderWidth: 1,
           borderDash: [5, 5],
           pointRadius: 0,
           fill: false,
           yAxisID: 'y',
         },
         {
           label: 'Bollinger Lower',
           data: lower,
           borderColor: CHART_COLORS.INDICATORS.BOLLINGER,
           borderWidth: 1,
           borderDash: [5, 5],
           pointRadius: 0,
           fill: '-1',
           backgroundColor: CHART_COLORS.INDICATORS.BOLLINGER_FILL,
           yAxisID: 'y',
         }
       ] : []),
       ...forecastDatasets,
       ...ghostForecastDatasets,
       ...(normalizedIndexData ? [
         {
           label: market === 'japan' ? '日経平均 (正規化)' : 'S&P 500 (Normalized)',
           data: normalizedIndexData,
           borderColor: CHART_COLORS.INDEX.LINE,
           borderWidth: 1,
           pointRadius: 0,
           fill: false,
           tension: 0.1,
           yAxisID: 'yIndex',
         }
       ] : []),
     ],
   }), [
     extendedData.labels,
     normalizedIndexData,
     forecastDatasets,
     ghostForecastDatasets,
     sma20,
     upper,
     lower,
     showSMA,
     showBollinger,
     market,
     actualData.prices,
   ]);

  // 4. Loading / Error States
  if (error) {
    return (
      <div className={`relative w-full flex items-center justify-center ${CHART_THEME.ERROR.BACKGROUND} border ${CHART_THEME.ERROR.BORDER} rounded`} style={{ height: propHeight || CHART_DIMENSIONS.DEFAULT_HEIGHT }}>
        <div className="text-center p-4">
          <p className={`${CHART_THEME.ERROR.TEXT_TITLE} font-bold`}>データの取得に失敗しました</p>
          <p className={`${CHART_THEME.ERROR.TEXT_DESC} text-sm mt-1`}>{error}</p>
        </div>
      </div>
    );
  }
  if (loading || data.length === 0) {
    return (
      <div className="relative w-full bg-[#131b23] border border-[#233648] rounded overflow-hidden" style={{ height: propHeight || CHART_DIMENSIONS.DEFAULT_HEIGHT }}>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="relative w-12 h-12 mb-4">
            <div className="absolute inset-0 border-2 border-primary/30 rounded-full"></div>
            <div className="absolute inset-0 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-sm text-[#92adc9] animate-pulse">チャートデータを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full" style={{ height: propHeight || CHART_DIMENSIONS.DEFAULT_HEIGHT, minHeight: '300px', maxHeight: '600px' }}>
      {/* Header Toolbar */}
      <div className="flex items-center justify-end px-4 py-2 border-b border-[#233648] bg-[#1a2632]">
        <AccuracyBadge
          hitRate={accuracyData?.hitRate || 0}
          totalTrades={accuracyData?.totalTrades || 0}
          predictionError={accuracyData?.predictionError}
          loading={accuracyData?.loading}
        />
      </div>

      {/* Main Chart Area */}
      <div className="relative flex-1 w-full overflow-hidden">
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

        <Line ref={chartRef} data={chartData} options={options} />
        {showVolume && (
          <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none">
            <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } } }} />
          </div>
        )}
      </div>
    </div>
  );
});