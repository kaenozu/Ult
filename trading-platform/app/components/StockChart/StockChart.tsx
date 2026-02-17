'use client';

import { useRef, memo, useState, useMemo, useEffect, useCallback } from 'react';
import { usePerformanceMonitor } from '@/app/hooks/usePerformanceMonitor';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler, Decimation,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { OHLCV, Signal } from '@/app/types';
import { SMA_CONFIG, CHART_COLORS, CHART_DIMENSIONS, CHART_THEME } from '@/app/constants';
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
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler, Decimation, volumeProfilePlugin);

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
  const [settledIdx, setSettledIdx] = useState<number | null>(null); // For heavy layers
  const isMountedRef = useRef(true);
  const settledTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Performance monitoring for the chart
  const { trackInteraction } = usePerformanceMonitor({
    slowRenderThreshold: 50, // Charts are more complex, allow more time
    enableMemoryTracking: true,
    onSlowRender: (metrics) => {
      console.warn(`📈 StockChart Performance Issues:`, metrics);
    }
  });

  // 1. Data Preparation Hooks
  const { actualData, optimizedData, normalizedIndexData, extendedData, forecastExtension } = useChartData(data, signal, indexData);
  const { sma20, upper, lower } = useTechnicalIndicators(extendedData.prices);
  
  // Performance Optimization: Debounce the heavy forecast layer calculation
  // Increased debounce interval to 100ms for better performance
  useEffect(() => {
    if (settledTimerRef.current) clearTimeout(settledTimerRef.current);
    
    if (hoveredIdx === null) {
      setSettledIdx(null);
      return;
    }

    // Update the heavy layer only if mouse settles for 150ms
    // This significantly reduces calculation frequency during fast mouse movements
    settledTimerRef.current = setTimeout(() => {
      setSettledIdx(hoveredIdx);
    }, 150);

    return () => {
      if (settledTimerRef.current) clearTimeout(settledTimerRef.current);
    };
  }, [hoveredIdx]);

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
    hoveredIdx: settledIdx, // Use debounced/settled index for heavy calculations!
    accuracyData: memoizedAccuracyData,
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
  const lastUpdateRef = useRef<number>(0);

  // Use callback to ensure stable reference for useChartOptions
  const handleMouseHover = useCallback((idx: number | null) => {
    // If keyboard navigation is active (mouse blocked), ignore small mouse-driven hover updates
    if (mouseBlockRef.current && idx !== null) {
      return;
    }

    // Performance Optimization: Throttle updates to ~60fps (16ms)
    const now = Date.now();
    if (idx !== null && now - lastUpdateRef.current < 16) {
      return;
    }
    
    lastUpdateRef.current = now;
    setHoveredIndex(idx);
  }, []);

  const lastMousePos = useRef({ x: 0, y: 0 });

  const actualDataRef = useRef(actualData);
  useEffect(() => {
    actualDataRef.current = actualData;
  }, [actualData]);

  // Keyboard navigation for chart
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focus is in an input or textarea
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        document.activeElement instanceof HTMLSelectElement
      ) {
        return;
      }

      const isArrowLeft = e.key === 'ArrowLeft';
      const isArrowRight = e.key === 'ArrowRight';

      if (!isArrowLeft && !isArrowRight) return;

      // Force block mouse updates
      mouseBlockRef.current = true;
      e.preventDefault();

      if (mouseBlockTimer.current) clearTimeout(mouseBlockTimer.current);
      mouseBlockTimer.current = setTimeout(() => {
        mouseBlockRef.current = false;
      }, 1500); 

      setHoveredIndex(prev => {
        const maxIdx = actualDataRef.current.prices.length - 1;
        const currentIdx = prev === null ? maxIdx : prev;
        
        let nextIdx = currentIdx;
        if (isArrowLeft) nextIdx = Math.max(0, currentIdx - 1);
        if (isArrowRight) nextIdx = Math.min(maxIdx, currentIdx + 1);
        
        // Performance: For keyboard navigation, we can update settledIdx faster
        // because it's a deliberate step action
        if (nextIdx !== currentIdx) {
          if (settledTimerRef.current) clearTimeout(settledTimerRef.current);
          setSettledIdx(nextIdx);
        }
        
        return nextIdx;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (mouseBlockTimer.current) clearTimeout(mouseBlockTimer.current);
    };
  }, []); // Static dependency array

  // Release mouse block on intentional mouse movement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (mouseBlockRef.current) {
        const dx = Math.abs(e.clientX - lastMousePos.current.x);
        const dy = Math.abs(e.clientY - lastMousePos.current.y);
        
        // Block only intentional moves (> 10px)
        if (dx > 10 || dy > 10) {
          mouseBlockRef.current = false;
          if (mouseBlockTimer.current) clearTimeout(mouseBlockTimer.current);
        }
      }
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Ref for requestAnimationFrame to cancel pending frames
  const rafRef = useRef<number | null>(null);

  // Sync Chart.js active elements with hoveredIdx to visually move the points
  useEffect(() => {
    // Cancel any pending animation frame
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    // Schedule the update for the next animation frame
    rafRef.current = requestAnimationFrame(() => {
      const chart = chartRef.current;
      // Basic safety checks
      if (!chart || hoveredIdx === null || !chart.data || !chart.data.datasets) return;

      const activeElements: { datasetIndex: number; index: number }[] = [];

      try {
        // Find elements for the hovered index across all visible datasets
        chart.data.datasets.forEach((dataset, datasetIndex) => {
          // Validation: dataset must exist and have data
          if (!dataset || !dataset.data) return;

          const dataLength = dataset.data.length;
          
          // Ensure:
          // 1. Dataset is visible
          // 2. Index is within data bounds
          // 3. Chart internal metadata for this dataset exists
          if (
            chart.isDatasetVisible(datasetIndex) && 
            hoveredIdx >= 0 &&
            hoveredIdx < dataLength &&
            chart.getDatasetMeta(datasetIndex)
          ) {
            activeElements.push({ datasetIndex, index: hoveredIdx });
          }
        });

        if (activeElements.length > 0) {
          chart.setActiveElements(activeElements);
          chart.update('none'); 
        } else {
          chart.setActiveElements([]);
          chart.update('none');
        }
      } catch (err) {
        // Ignore errors during synchronization to prevent app crash
        console.warn('[StockChart] Sync failed:', err);
      }
    });

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [hoveredIdx]);

  // Get current SMA value for tooltip
  const currentSmaValue = useMemo(() => {
    if (!showSMA || !sma20 || sma20.length === 0 || hoveredIdx === null) return undefined;
    
    // Boundary check for async data
    if (hoveredIdx < 0 || hoveredIdx >= sma20.length) return undefined;
    
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
    // 実際の価格と未来の予測価格を結合して一本の線にする
    data: [...actualData.prices, ...forecastExtension.forecastPrices],
    borderColor: CHART_COLORS.PRICE.LINE,
    backgroundColor: CHART_COLORS.PRICE.BACKGROUND,
    borderWidth: 2,
    pointRadius: 0,
    pointHoverRadius: 4,
    fill: true,
    tension: 0.1,
    yAxisID: 'y',
    // 過去と未来の境界を視覚的に分けるためのセグメント設定（Chart.js機能）
    segment: {
      borderDash: (ctx: any) => {
        const x = ctx.p0?.parsed?.x;
        return typeof x === 'number' && x >= actualData.prices.length - 1 ? [5, 5] : undefined;
      },
      borderColor: (ctx: any) => {
        const x = ctx.p0?.parsed?.x;
        return typeof x === 'number' && x >= actualData.prices.length - 1 ? 'rgba(146, 173, 201, 0.8)' : undefined;
      }
    }
  }), [actualData.prices, forecastExtension.forecastPrices, market]);

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
  const chartData = useMemo(() => {
    const datasets = [
      priceDataset,
      ...(smaDataset ? [smaDataset] : []),
      ...bollingerDatasets,
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
