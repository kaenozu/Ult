'use client';

import { useRef, memo, useState, useMemo, useEffect } from 'react';
import { usePerformanceMonitor } from '@/app/hooks/usePerformanceMonitor';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { OHLCV, Signal } from '@/app/types';
import { SMA_CONFIG, CHART_COLORS, CHART_DIMENSIONS, CHART_THEME } from '@/app/lib/constants';
import { calculateChartMinMax } from '@/app/lib/chart-utils';
import { volumeProfilePlugin } from './plugins/volumeProfile';
import { useChartData } from './hooks/useChartData';
import { useTechnicalIndicators } from './hooks/useTechnicalIndicators';
import { useForecastLayers } from './hooks/useForecastLayers';
import { useChartOptions } from './hooks/useChartOptions';
import { useSupplyDemandAnalysis } from './hooks/useSupplyDemandAnalysis';
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
  const isMountedRef = useRef(true);

  // Performance monitoring for the chart
  const { trackInteraction } = usePerformanceMonitor({
    slowRenderThreshold: 50, // Charts are more complex, allow more time
    enableMemoryTracking: true,
    onSlowRender: (metrics) => {
      console.warn(`📈 StockChart Performance Issues:`, metrics);
    }
  });

  // Enhanced cleanup with performance monitoring
  useEffect(() => {
    return () => {
      // Cleanup Chart.js instance
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }

      isMountedRef.current = false;
    };
  }, []);

  const mouseBlockRef = useRef(false);
  const mouseBlockTimer = useRef<NodeJS.Timeout | undefined>(undefined);

  // Use callback to ensure stable reference for useChartOptions
  const handleMouseHover = (idx: number | null) => {
    if (!mouseBlockRef.current) {
      setHoveredIndex(idx);
    }
  };

  // Keyboard navigation for chart
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (hoveredIdx === null) return;

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();

        // Block mouse updates temporarily
        mouseBlockRef.current = true;
        if (mouseBlockTimer.current) {
          clearTimeout(mouseBlockTimer.current);
          mouseBlockTimer.current = null;
        }
        mouseBlockTimer.current = setTimeout(() => {
          mouseBlockRef.current = false;
          mouseBlockTimer.current = null;
        }, 300);

        setHoveredIndex(prev => {
          if (prev === null) return prev;
          if (e.key === 'ArrowLeft') {
            return prev > 0 ? prev - 1 : prev;
          } else {
            return prev < data.length - 1 ? prev + 1 : prev;
          }
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (mouseBlockTimer.current) {
        clearTimeout(mouseBlockTimer.current);
        mouseBlockTimer.current = null;
      }
    };
  }, [hoveredIdx, data.length]);

  // Sync Chart.js active elements with hoveredIdx to visualy move the points
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || hoveredIdx === null) return;

    // Force sync specifically when keyboard navigation is active (indicated by mouse block)
    // or just generally to ensure state consistency
    if (mouseBlockRef.current) {
      const activeElements: { datasetIndex: number; index: number }[] = [];

      // Find elements for the hovered index across all visible datasets
      chart.data.datasets.forEach((_, datasetIndex) => {
        if (chart.isDatasetVisible(datasetIndex)) {
          activeElements.push({ datasetIndex, index: hoveredIdx });
        }
      });

      if (activeElements.length > 0) {
        chart.setActiveElements(activeElements);
        chart.update(); // Update to render the active elements
      }
    }
  }, [hoveredIdx]);

  // Release mouse block on intentional mouse movement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // If blocked, check for significant movement to release block
      if (mouseBlockRef.current) {
        // Using movementX/Y to detect physical movement, filtering out micro-tremors
        if (Math.abs(e.movementX) > 2 || Math.abs(e.movementY) > 2) {
          mouseBlockRef.current = false;
          if (mouseBlockTimer.current) clearTimeout(mouseBlockTimer.current);
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // 1. Data Preparation Hooks
  const { actualData, optimizedData, normalizedIndexData, extendedData } = useChartData(data, signal, indexData);
  const { sma20, upper, lower } = useTechnicalIndicators(extendedData.prices);
  const { chartLevels } = useSupplyDemandAnalysis(data);
  // Memoize accuracyData object to prevent unnecessary re-renders in useForecastLayers
  const memoizedAccuracyData = useMemo(() => accuracyData ? {
    predictionError: accuracyData.predictionError || 1.0
  } : null, [accuracyData]);

  const { ghostForecastDatasets, forecastDatasets } = useForecastLayers({
    data: optimizedData, // Use optimized/reduced data for correct index alignment
    extendedData,
    signal,
    market,
    hoveredIdx,
    accuracyData: memoizedAccuracyData
  });

  // Get current SMA value for tooltip
  const currentSmaValue = useMemo(() => {
    if (!showSMA || !sma20 || sma20.length === 0 || hoveredIdx === null) return undefined;
    return sma20[hoveredIdx];
  }, [sma20, hoveredIdx, showSMA]);

  // Performance-optimized: Cache price range calculations
  const priceRange = useMemo(() => {
    if (!data || data.length === 0) return { min: 0, max: 0 };

    const { min, max } = calculateChartMinMax(data, {
      sma: showSMA ? sma20 : undefined,
      upper: showBollinger ? upper : undefined,
      lower: showBollinger ? lower : undefined,
    });

    return { min, max };
  }, [data, sma20, upper, lower, showSMA, showBollinger]);

  // 2. Chart Options Hook
  const options = useChartOptions({
    data,
    extendedData,
    market,
    hoveredIdx,
    setHoveredIndex: handleMouseHover,
    signal,
    priceRange,
    supplyDemandLevels: chartLevels,
    showVolume
  });

  // 3. Performance-optimized: Split datasets for better rendering
  const priceDataset = useMemo(() => ({
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
  }), [actualData.prices, market]);

  // Volume dataset
  const volumeDataset = useMemo(() => showVolume && data.length > 0 ? {
    label: 'Volume',
    data: data.map(d => d.volume),
    backgroundColor: data.map(d => d.close >= d.open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'),
    borderWidth: 0,
    yAxisID: 'yVolume',
    order: 10,
  } : null, [showVolume, data]);

  const smaDataset = useMemo(() => showSMA && sma20.length > 0 ? {
    label: `SMA (${SMA_CONFIG.PERIOD})`,
    data: sma20,
    borderColor: CHART_COLORS.INDICATORS.SMA,
    borderWidth: 1.5,
    pointRadius: 0,
    fill: false,
    tension: 0.1,
    yAxisID: 'y',
  } : null, [showSMA, sma20]);

  const bollingerDatasets = useMemo(() => showBollinger && upper.length > 0 && lower.length > 0 ? [
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
  ] : [], [showBollinger, upper, lower]);

  const indexDataset = useMemo(() => normalizedIndexData ? {
    label: market === 'japan' ? '日経平均 (正規化)' : 'S&P 500 (Normalized)',
    data: normalizedIndexData,
    borderColor: CHART_COLORS.INDEX.LINE,
    borderWidth: 1,
    pointRadius: 0,
    fill: false,
    tension: 0.1,
    yAxisID: 'yIndex',
  } : null, [normalizedIndexData, market]);

  // 4. Assemble Chart Data with optimized memoization
  const forecastLineDataset = useMemo(() => signal ? {
    label: 'AI予測',
    data: [...new Array(actualData.prices.length - 1).fill(NaN), actualData.prices[actualData.prices.length - 1], ...forecastExtension.forecastPrices],
    borderColor: signal.type === 'BUY' ? '#10b981' : signal.type === 'SELL' ? '#ef4444' : '#92adc9',
    borderWidth: 3,
    borderDash: [5, 5],
    pointRadius: 0,
    fill: false,
    tension: 0.1,
    yAxisID: 'y',
    order: 0,
  } : null, [forecastExtension.forecastPrices, signal, actualData.prices]);

  const chartData = useMemo(() => {
    const datasets: any[] = [
      priceDataset,
      ...(smaDataset ? [smaDataset] : []),
      ...bollingerDatasets,
      forecastLineDataset,
      ...forecastDatasets,
      ...ghostForecastDatasets,
      ...(indexDataset ? [indexDataset] : []),
      ...(volumeDataset ? [volumeDataset] : []),
    ].filter(Boolean);

    return {
      labels: extendedData.labels,
      datasets
    };
  }, [
    extendedData.labels,
    priceDataset,
    smaDataset,
    bollingerDatasets,
    forecastDatasets,
    ghostForecastDatasets,
    indexDataset,
    volumeDataset
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

        <Line
          ref={chartRef}
          data={chartData}
          options={options}
          onMouseDown={trackInteraction}
          onMouseMove={trackInteraction}
          onTouchStart={trackInteraction}
        />
        {showVolume && (
          <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none">
            <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } } }} />
          </div>
        )}
      </div>
    </div>
  );
});
