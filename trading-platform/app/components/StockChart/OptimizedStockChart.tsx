'use client';

import { memo, useMemo, useCallback, useRef, useEffect, useState } from 'react';
import type { OHLCV } from '@/app/types';

/**
 * OptimizedStockChart - Chart Performance Optimization
 * 
 * Key optimizations:
 * - Memoization with React.memo to prevent unnecessary re-renders
 * - Virtualization for large datasets (only render visible items)
 * - useMemo for expensive calculations
 * - useCallback for stable callback references
 */

// ============================================================================
// Types
// ============================================================================

export interface OptimizedStockChartProps {
  /** OHLCV data array */
  data: OHLCV[];
  /** Chart width in pixels */
  width: number;
  /** Chart height in pixels */
  height: number;
  /** Technical indicators to display */
  indicators?: string[];
  /** Zoom range [start, end] indices */
  visibleRange?: [number, number];
  /** Callback when zoom changes */
  onZoom?: (range: [number, number]) => void;
  /** Theme mode */
  theme?: 'dark' | 'light';
}

// ============================================================================
// Virtualization Hook
// ============================================================================

interface VirtualizationState {
  visibleStart: number;
  visibleEnd: number;
  totalHeight: number;
}

/**
 * Custom hook for chart virtualization
 * Only renders visible data points to improve performance
 */
function useChartVirtualization(
  data: OHLCV[],
  containerHeight: number,
  itemHeight: number,
  overscan: number = 5
): VirtualizationState {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleStart = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleEnd = Math.min(
    data.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  return {
    visibleStart,
    visibleEnd,
    totalHeight: data.length * itemHeight,
  };
}

// ============================================================================
// Data Processing Utilities
// ============================================================================

/**
 * Process OHLCV data for chart rendering
 * Memoized to avoid recalculation on every render
 */
function processDataForRendering(
  data: OHLCV[],
  visibleRange: [number, number]
): OHLCV[] {
  return data.slice(visibleRange[0], visibleRange[1]);
}

/**
 * Calculate visible range based on zoom level
 */
function calculateVisibleRange(
  totalLength: number,
  zoomLevel: number,
  centerIndex?: number
): [number, number] {
  const visibleCount = Math.max(10, Math.floor(totalLength * zoomLevel));
  let start: number;

  if (centerIndex !== undefined) {
    start = Math.max(0, Math.min(centerIndex - visibleCount / 2, totalLength - visibleCount));
  } else {
    start = Math.max(0, totalLength - visibleCount);
  }

  return [start, Math.min(start + visibleCount, totalLength)];
}

// ============================================================================
// Chart Skeleton Component
// ============================================================================

/**
 * Skeleton loader for chart component
 */
const ChartSkeleton = memo(function ChartSkeleton({ 
  height, 
  width 
}: { 
  height: number; 
  width: number;
}) {
  return (
    <div 
      className="animate-pulse bg-gray-700 rounded"
      style={{ width, height }}
      role="status"
      aria-label="Loading chart"
    >
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Loading chart data...
      </div>
    </div>
  );
});

// ============================================================================
// Main Optimized Chart Component
// ============================================================================

export const OptimizedStockChart = memo(function OptimizedStockChart({
  data,
  width,
  height,
  indicators = [],
  visibleRange: propVisibleRange,
  onZoom,
  theme = 'dark',
}: OptimizedStockChartProps) {
  // ==========================================================================
  // State
  // ==========================================================================
  
  const [localVisibleRange, setLocalVisibleRange] = useState<[number, number]>([0, 100]);
  const containerRef = useRef<HTMLDivElement>(null);

  // ==========================================================================
  // Virtualization
  // ==========================================================================
  
  const visibleRange = propVisibleRange || localVisibleRange;
  const virtualization = useChartVirtualization(data, height, 20, 5);
  
  // ==========================================================================
  // Memoized Calculations
  // ==========================================================================
  
  // Extract visible range values for stable dependencies
  const visibleStart = visibleRange[0];
  const visibleEnd = visibleRange[1];

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return processDataForRendering(data, [visibleStart, visibleEnd]);
  }, [data, visibleStart, visibleEnd]);

  const visibleData = useMemo(() => {
    return data.slice(virtualization.visibleStart, virtualization.visibleEnd);
  }, [data, virtualization.visibleStart, virtualization.visibleEnd]);

  const chartStats = useMemo(() => {
    if (!data || data.length === 0) return null;
    
    const prices = data.map(d => d.close);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    
    return {
      minPrice,
      maxPrice,
      avgPrice,
      priceRange: maxPrice - minPrice,
      dataLength: data.length,
    };
  }, [data]);

  // ==========================================================================
  // Callbacks
  // ==========================================================================
  
  const handleZoomIn = useCallback(() => {
    const [currentStart, currentEnd] = visibleRange;
    const newRange: [number, number] = calculateVisibleRange(
      data.length, 
      0.5, 
      currentStart + (currentEnd - currentStart) / 2
    );
    if (onZoom) {
      onZoom(newRange);
    } else {
      setLocalVisibleRange(newRange);
    }
  }, [data.length, visibleRange, onZoom]);

  const handleZoomOut = useCallback(() => {
    const newRange: [number, number] = calculateVisibleRange(data.length, 1.0);
    if (onZoom) {
      onZoom(newRange);
    } else {
      setLocalVisibleRange(newRange);
    }
  }, [data.length, onZoom]);

  const handleReset = useCallback(() => {
    const newRange: [number, number] = [0, Math.min(100, data.length)];
    if (onZoom) {
      onZoom(newRange);
    } else {
      setLocalVisibleRange(newRange);
    }
  }, [data.length, onZoom]);

  // ==========================================================================
  // Effects
  // ==========================================================================
  
  useEffect(() => {
    if (!propVisibleRange && data.length > 0) {
      setTimeout(() => {
        setLocalVisibleRange([Math.max(0, data.length - 100), data.length]);
      }, 0);
    }
  }, [data.length, propVisibleRange]);

  // ==========================================================================
  // Render
  // ==========================================================================
  
  // Handle empty state
  if (!data || data.length === 0) {
    return <ChartSkeleton height={height} width={width} />;
  }

  // Handle loading state
  if (data.length === 0) {
    return <ChartSkeleton height={height} width={width} />;
  }

  const themeClass = theme === 'dark' ? 'bg-gray-900' : 'bg-white';
  const textClass = theme === 'dark' ? 'text-gray-300' : 'text-gray-700';

  return (
    <div 
      ref={containerRef}
      className={`optimized-stock-chart ${themeClass}`}
      style={{ width, height }}
      role="img"
      aria-label={`Stock chart for ${data[0]?.symbol || 'Unknown'}`}
    >
      {/* Toolbar */}
      <div className={`chart-toolbar flex gap-2 p-2 ${textClass}`}>
        <button
          onClick={handleZoomIn}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
          aria-label="Zoom out"
        >
          -
        </button>
        <button
          onClick={handleReset}
          className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-sm transition-colors"
          aria-label="Reset zoom"
        >
          Reset
        </button>
        <span className="ml-auto text-sm">
          Showing {visibleData.length} of {data.length} data points
        </span>
      </div>

      {/* Chart Canvas Area */}
      <div className="chart-content relative" style={{ height: height - 50 }}>
        {/* Price Scale */}
        <div className="price-scale absolute left-0 top-0 h-full w-16 border-r border-gray-600 p-1">
          {chartStats && (
            <>
              <div className="text-xs text-right text-gray-400">
                {chartStats.maxPrice.toFixed(2)}
              </div>
              <div className="text-xs text-right text-gray-400 mt-auto">
                {chartStats.minPrice.toFixed(2)}
              </div>
            </>
          )}
        </div>

        {/* Data Canvas */}
        <div 
          className="data-canvas ml-16 h-full overflow-hidden"
          style={{ width: width - 80 }}
        >
          {/* Render visible data points */}
          {visibleData.map((item, index) => {
            const globalIndex = virtualization.visibleStart + index;
            const pricePercent = chartStats 
              ? (item.close - chartStats.minPrice) / chartStats.priceRange 
              : 0;
            const yPosition = (1 - pricePercent) * 100;

            return (
              <div
                key={`${item.date}-${globalIndex}`}
                className="data-point absolute w-1 h-0.5 bg-blue-500"
                style={{
                  left: `${(globalIndex / data.length) * 100}%`,
                  top: `${yPosition}%`,
                }}
                title={`${item.date}: ${item.close}`}
              />
            );
          })}

          {/* Volume Bars */}
          <div className="volume-bars absolute bottom-0 left-16 right-0 h-16 border-t border-gray-600">
            {visibleData.map((item, index) => {
              const globalIndex = virtualization.visibleStart + index;
              const volumePercent = Math.min(100, (item.volume / 1000000) * 100);

              return (
                <div
                  key={`volume-${item.date}-${globalIndex}`}
                  className="volume-bar absolute bottom-0 w-0.5 bg-gray-500"
                  style={{
                    left: `${(globalIndex / data.length) * 100}%`,
                    height: `${volumePercent}%`,
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className={`status-bar flex justify-between px-4 py-2 text-xs ${textClass} border-t border-gray-600`}>
        <span>
          Range: {visibleRange[0]} - {visibleRange[1]} of {data.length}
        </span>
        <span>
          {chartStats && `Avg: ${chartStats.avgPrice.toFixed(2)}`}
        </span>
      </div>
    </div>
  );
});

// ============================================================================
// Export utilities for testing
// ============================================================================

export { calculateVisibleRange, processDataForRendering };
