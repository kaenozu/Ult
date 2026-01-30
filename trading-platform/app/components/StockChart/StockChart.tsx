'use client';

import { useRef, memo, useState, useMemo } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { OHLCV, Signal } from '@/app/types';
import { CANDLESTICK, SMA_CONFIG, BOLLINGER_BANDS, CHART_CONFIG } from '@/app/lib/constants';
import { volumeProfilePlugin } from './plugins/volumeProfile';
export { volumeProfilePlugin };
import { useChartData } from './hooks/useChartData';
import { useTechnicalIndicators } from './hooks/useTechnicalIndicators';
import { useForecastLayers } from './hooks/useForecastLayers';
import { useChartOptions } from './hooks/useChartOptions';
import { ChartTooltip } from './ChartTooltip';
import { ChartLoading } from './ChartLoading';
import { ChartError } from './ChartError';
import { ChartVolume } from './ChartVolume';

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
  const dynamicHeight = propHeight ?? 500;

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
        borderColor: '#60a5fa',
        backgroundColor: 'rgba(96, 165, 250, 0.05)',
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
  if (error) return <ChartError error={error} height={dynamicHeight} />;
  if (loading || data.length === 0) return <ChartLoading height={dynamicHeight} />;

  return (
    <div className="relative w-full group" style={{ height: dynamicHeight }}>
      <ChartTooltip
        hoveredIdx={hoveredIdx}
        data={data}
        labels={extendedData.labels}
        market={market}
      />
      <Line ref={chartRef} data={chartData} options={options} />
      {showVolume && <ChartVolume data={data} labels={extendedData.labels} />}
    </div>
  );
});
