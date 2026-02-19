import { useMemo, useCallback, useRef, useEffect } from 'react';
import { ChartOptions } from 'chart.js';
import { OHLCV, Signal } from '@/app/types';
import { formatCurrency } from '@/app/lib/utils';
import { calculateChartMinMax } from '@/app/lib/chart-utils';
import { CHART_GRID, CHART_CONFIG } from '@/app/constants';
import { VolumeProfilePluginOptions } from '../types';

interface UseChartOptionsProps {
  data: OHLCV[];
  extendedData: { labels: string[]; prices: number[] };
  market: 'japan' | 'usa';
  hoveredIdx: number | null;
  setHoveredIndex: (idx: number | null) => void;
  signal?: Signal | null;
  priceRange?: { min: number; max: number } | null;
  supplyDemandLevels?: { price: number; strength: number }[];
  showVolume?: boolean;
}

interface ChartContext {
  index: number;
  tick?: { value?: number };
}

// Type-safe annotation configuration
interface AnnotationLine {
  type: 'line';
  xMin: number;
  xMax: number;
  borderColor: string;
  borderWidth: number;
  borderDash: number[];
  yMin: number;
  yMax: number;
  scaleID: string;
}

interface AnnotationPluginOptions {
  annotation: {
    annotations: Record<string, AnnotationLine>;
  };
}

// Throttle interval for hover updates (ms)
const HOVER_THROTTLE_MS = 16; // ~60fps

export const useChartOptions = ({
  data,
  extendedData: _extendedData,
  market,
  hoveredIdx,
  setHoveredIndex,
  signal,
  priceRange: propPriceRange,
  supplyDemandLevels,
  showVolume = true
}: UseChartOptionsProps) => {
  // Ref for throttling hover updates
  const lastHoverUpdateRef = useRef<number>(0);
  const currentHoveredIdxRef = useRef<number | null>(null);

  // Keep ref in sync with state in an effect
  useEffect(() => {
    currentHoveredIdxRef.current = hoveredIdx;
  }, [hoveredIdx]);

  // Y-axis range calculation (static - doesn't depend on hoveredIdx)
  const yAxisRange = useMemo(() => {
    // Use external range if provided
    if (propPriceRange) {
      const range = propPriceRange.max - propPriceRange.min;
      // Add margin (5%)
      const margin = range * 0.05;
      return {
        min: propPriceRange.min - margin,
        max: propPriceRange.max + margin
      };
    }

    if (data.length === 0) return { min: 0, max: 100 };

    // Include forecast data in range calculation to ensure all data points are visible
    const { min: minPrice, max: maxPrice } = calculateChartMinMax(data);
    const priceRange = maxPrice - minPrice;

    // Dynamically set margin based on price range (10%, 15%, 20%)
    const marginPercentage = priceRange > 1000 ? 0.05 : priceRange > 5000 ? 0.03 : 0.02;
    const margin = priceRange * marginPercentage;

    return {
      min: minPrice - margin,
      max: maxPrice + margin,
    };
  }, [data, propPriceRange]);

  // Stable onHover callback with throttling
  const handleHover = useCallback((_event: unknown, elements: { index: number }[]) => {
    const now = Date.now();
    const newIdx = elements.length > 0 ? elements[0].index : null;
    
    // Throttle updates to prevent excessive re-renders
    if (now - lastHoverUpdateRef.current < HOVER_THROTTLE_MS) {
      return;
    }
    
    // Only update if index actually changed
    if (newIdx !== currentHoveredIdxRef.current) {
      lastHoverUpdateRef.current = now;
      setHoveredIndex(newIdx);
    }
  }, [setHoveredIndex]);

  // Static chart options (don't depend on hoveredIdx)
  const staticOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 15,
        bottom: 5,
        left: 20,
        right: 20
      }
    },
    interaction: {
      mode: 'index' as const,
      intersect: false
    },
    plugins: {
      decimation: {
        enabled: true,
        algorithm: 'min-max' as const,
      },
      legend: {
        display: true,
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          color: '#92adc9',
          font: {
            size: 12,
            family: 'Inter, sans-serif',
            weight: 500
          },
          usePointStyle: true,
          boxWidth: 8,
          boxHeight: 8,
          padding: 12,
          borderRadius: 4,
          background: 'rgba(25, 38, 51, 0.8)',
          border: '1px solid rgba(35, 54, 72, 0.5)'
        }
      },
      tooltip: {
        enabled: false // Using custom tooltip
      },
      volumeProfile: {
        enabled: true,
        data: signal?.volumeResistance || supplyDemandLevels,
        currentPrice: data.length > 0 ? data[data.length - 1].close : 0
      } as VolumeProfilePluginOptions
    },
    scales: {
      x: {
        grid: {
          // These will be overridden by dynamic options
          drawBorder: false
        },
        ticks: {
          maxTicksLimit: 15,
          font: {
            size: CHART_GRID.LABEL_FONT_SIZE,
            family: 'Inter, sans-serif'
          },
          padding: 8
        }
      },
      y: {
        min: yAxisRange.min,
        max: yAxisRange.max,
        grid: {
          drawBorder: false
        },
        ticks: {
          color: '#92adc9',
          callback: (v: string | number) => formatCurrency(Number(v), market === 'japan' ? 'JPY' : 'USD'),
          font: {
            size: CHART_GRID.LABEL_FONT_SIZE,
            family: 'Inter, sans-serif'
          },
          padding: 12,
          // Dynamic tick count based on price range
          count: yAxisRange.max - yAxisRange.min > 10000 ? 10 :
            yAxisRange.max - yAxisRange.min > 5000 ? 8 :
              yAxisRange.max - yAxisRange.min > 1000 ? 6 : 4
        }
      },
      yVolume: {
        display: showVolume !== false,
        position: 'right' as const,
        grid: {
          drawBorder: false,
          color: 'rgba(146, 173, 201, 0.1)'
        },
        ticks: {
          color: '#92adc9',
          font: {
            size: 10,
            family: 'Inter, sans-serif'
          },
          callback: (v: number | string) => {
            const num = typeof v === 'string' ? parseInt(v) : v;
            if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
            if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
            return num.toString();
          }
        }
      }
    },
    elements: {
      point: {
        hoverRadius: 6,
        radius: 0
      },
      line: {
        tension: CHART_CONFIG.TENSION,
        borderWidth: 2
      }
    },
    animation: {
      duration: 300,
      easing: 'easeOutQuart' as const
    }
  }), [yAxisRange, market, showVolume, signal, data, supplyDemandLevels]);

  // Dynamic options that depend on hoveredIdx (separate for performance)
  const dynamicGridOptions = useMemo(() => ({
    x: {
      grid: {
        color: (ctx: ChartContext) => {
          // Highlight vertical grid line at hovered position
          if (ctx.index === hoveredIdx) {
            return 'rgba(59, 130, 246, 0.9)';
          }
          return ctx.index >= data.length
            ? CHART_GRID.FUTURE_AREA_COLOR
            : CHART_GRID.MAIN_COLOR;
        },
        lineWidth: (ctx: ChartContext) => {
          if (ctx.index === hoveredIdx) {
            return CHART_GRID.HOVER_LINE_WIDTH;
          }
          return ctx.index === data.length - 1
            ? CHART_GRID.CURRENT_PRICE_LINE_WIDTH
            : 0.5;
        },
      },
      ticks: {
        color: (ctx: ChartContext) => {
          if (ctx.index === hoveredIdx) {
            return '#fff';
          }
          return ctx.index >= data.length ? '#3b82f6' : '#92adc9';
        },
      }
    },
    y: {
      grid: {
        color: (ctx: ChartContext) => {
          // Highlight horizontal grid at hovered Y position
          if (ctx.tick?.value && hoveredIdx !== null && data[hoveredIdx]) {
            const price = data[hoveredIdx].close;
            // Check if this tick is approximately the current price
            const tickValue = ctx.tick?.value as number;
            const priceDiff = Math.abs(tickValue - price);
            const priceRange = yAxisRange.max - yAxisRange.min;
            if (priceDiff / priceRange < 0.02) {
              return 'rgba(59, 130, 246, 0.8)';
            }
          }
          return CHART_GRID.MAIN_COLOR;
        },
        lineWidth: (ctx: ChartContext) => {
          if (ctx.tick?.value && hoveredIdx !== null && data[hoveredIdx]) {
            const price = data[hoveredIdx].close;
            const tickValue = ctx.tick?.value as number;
            const priceRange = yAxisRange.max - yAxisRange.min;
            if (Math.abs(tickValue - price) / priceRange < 0.02) {
              return CHART_GRID.HOVER_LINE_WIDTH;
            }
          }
          return 0.5;
        },
      }
    }
  }), [hoveredIdx, data, yAxisRange]);

  // Annotation options (depend on hoveredIdx)
  const annotationOptions = useMemo((): AnnotationPluginOptions => ({
    annotation: {
      annotations: {
        line1: {
          type: 'line',
          xMin: hoveredIdx ?? 0,
          xMax: hoveredIdx ?? 0,
          borderColor: 'rgba(59, 130, 246, 0.6)',
          borderWidth: 1,
          borderDash: [4, 4],
          yMin: 0,
          yMax: 1,
          scaleID: 'x'
        }
      }
    }
  }), [hoveredIdx]);

  // Merge all options
  const options: ChartOptions<'line'> = useMemo(() => ({
    ...staticOptions,
    onHover: handleHover,
    plugins: {
      ...staticOptions.plugins,
      ...annotationOptions,
    },
    scales: {
      ...staticOptions.scales,
      x: {
        ...staticOptions.scales.x,
        grid: {
          ...staticOptions.scales.x.grid,
          ...dynamicGridOptions.x.grid,
        },
        ticks: {
          ...staticOptions.scales.x.ticks,
          color: dynamicGridOptions.x.ticks.color,
        }
      },
      y: {
        ...staticOptions.scales.y,
        grid: {
          ...staticOptions.scales.y.grid,
          ...dynamicGridOptions.y.grid,
        },
      },
    }
  }), [staticOptions, handleHover, annotationOptions, dynamicGridOptions]);

  return options;
};