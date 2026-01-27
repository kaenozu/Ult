'use client';

import { useRef, useMemo, memo, useState } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler, ChartOptions, Chart
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { OHLCV, Signal } from '@/app/types';
import { formatCurrency } from '@/app/lib/utils';
import {
  VOLUME_PROFILE,
  CANDLESTICK,
  CHART_GRID,
  CHART_CONFIG,
  SMA as SMA_CONFIG,
  BOLLINGER_BANDS,
} from '@/app/constants';
import { useChartAnalysis } from '@/app/hooks/useChartAnalysis';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

interface VolumeProfilePluginOptions {
  enabled: boolean;
  data: { price: number; strength: number }[];
  currentPrice: number;
}

interface ChartContext {
  index: number;
}

// 需給の壁 (Volume Profile) Plugin
export const volumeProfilePlugin = {
  id: 'volumeProfile',
  afterDatasetsDraw: (chart: Chart, _args: unknown, options: VolumeProfilePluginOptions) => {
    if (!options.enabled || !options.data || options.data.length === 0) return;

    const { ctx, chartArea: { right, width, top, bottom } } = chart;
    const yAxis = chart.scales.y;
    const currentPrice = options.currentPrice;

    ctx.save();
    ctx.shadowBlur = 0;

    options.data.forEach((wall) => {
      const yPos = yAxis.getPixelForValue(wall.price);
      if (yPos === undefined || yPos < top || yPos > bottom) return;

      const isAbove = wall.price > currentPrice;
      const color = isAbove ? '239, 68, 68' : '34, 197, 94';
      const barWidth = width * VOLUME_PROFILE.MAX_BAR_WIDTH_RATIO * wall.strength;
      const barHeight = (bottom - top) / VOLUME_PROFILE.HEIGHT_DIVISOR;

      const gradient = ctx.createLinearGradient(right - barWidth, 0, right, 0);
      gradient.addColorStop(0, `rgba(${color}, 0)`);
      gradient.addColorStop(1, `rgba(${color}, ${VOLUME_PROFILE.BASE_ALPHA + wall.strength * VOLUME_PROFILE.STRENGTH_ALPHA_ADD})`);

      ctx.fillStyle = gradient;
      ctx.fillRect(right - barWidth, yPos - barHeight / 2, barWidth, barHeight);

      ctx.fillStyle = `rgba(${color}, ${VOLUME_PROFILE.BASE_ALPHA})`;
      ctx.fillRect(right - 2, yPos - barHeight / 2, 2, barHeight);
    });
    ctx.restore();
  }
};

ChartJS.register(volumeProfilePlugin);

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

export const StockChart = memo(function StockChart({
  data, indexData = [], height = 400, showVolume = true, showSMA = true, showBollinger = false, loading = false, error = null, market = 'usa', signal = null,
}: StockChartProps) {
  const chartRef = useRef<ChartJS<'line'>>(null);
  const [hoveredIdx, setHoveredIndex] = useState<number | null>(null);

  // Use the new hook for heavy calculations
  const {
    extendedData,
    normalizedIndexData,
    sma20,
    upperBollinger,
    lowerBollinger,
    ghostForecastDatasets,
    forecastDatasets,
  } = useChartAnalysis({
    data,
    indexData,
    market,
    signal,
    hoveredIdx,
    showSMA,
    showBollinger,
  });

  const chartData = useMemo(() => ({
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
          data: upperBollinger,
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
          data: lowerBollinger,
          borderColor: BOLLINGER_BANDS.LOWER_COLOR,
          borderWidth: 1,
          pointRadius: 0,
          tension: CHART_CONFIG.TENSION,
          fill: false,
          order: 4
        }
      ] : []),
    ],
  }), [extendedData, normalizedIndexData, sma20, upperBollinger, lowerBollinger, showSMA, showBollinger, forecastDatasets, ghostForecastDatasets, market]);

  const yAxisRange = useMemo(() => {
    if (data.length === 0) return { min: 0, max: 100 };
    const prices = data.map(d => d.close);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const currentPrice = data[data.length - 1].close;
    const range = maxPrice - minPrice;

    const minRange = currentPrice * 0.06;
    const adjustedRange = Math.max(range, minRange);

    return {
      min: currentPrice - adjustedRange / 2,
      max: currentPrice + adjustedRange / 2,
    };
  }, [data]);

  const options: ChartOptions<'line'> = useMemo(() => ({
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    onHover: (_, elements) => setHoveredIndex(elements.length > 0 ? elements[0].index : null),
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: {
          color: '#92adc9',
          font: { size: 11 },
          usePointStyle: true,
          boxWidth: 8,
          padding: 10,
        }
      },
      tooltip: { enabled: false },
      volumeProfile: {
        enabled: true,
        data: signal?.volumeResistance,
        currentPrice: data.length > 0 ? data[data.length - 1].close : 0
      }
    },
    scales: {
      x: {
        min: extendedData.labels.length > 105 ? extendedData.labels[extendedData.labels.length - 105] : undefined,
        grid: {
          color: (c: ChartContext) => c.index === hoveredIdx
            ? CHART_GRID.HOVER_COLOR
            : (c.index >= data.length ? CHART_GRID.FUTURE_AREA_COLOR : CHART_GRID.MAIN_COLOR),
          lineWidth: (c: ChartContext) => c.index === hoveredIdx
            ? CHART_GRID.HOVER_LINE_WIDTH
            : (c.index === data.length - 1 ? CHART_GRID.CURRENT_PRICE_LINE_WIDTH : 1)
        },
        ticks: {
          color: (c: ChartContext) => c.index === hoveredIdx ? '#fff' : (c.index >= data.length ? '#3b82f6' : '#92adc9'),
          maxTicksLimit: 15,
          font: { size: CHART_GRID.LABEL_FONT_SIZE }
        }
      },
      y: {
        min: yAxisRange.min,
        max: yAxisRange.max,
        grid: { color: CHART_GRID.MAIN_COLOR },
        ticks: {
          color: '#92adc9',
          callback: (v) => formatCurrency(Number(v), market === 'japan' ? 'JPY' : 'USD'),
          font: { size: CHART_GRID.LABEL_FONT_SIZE }
        }
      }
    },
  }), [market, data.length, extendedData.labels, hoveredIdx, yAxisRange, signal?.volumeResistance]);

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