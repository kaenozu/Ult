import { useMemo } from 'react';
import { ChartOptions } from 'chart.js';
import { OHLCV, Signal } from '@/app/types';
import { formatCurrency } from '@/app/lib/utils';
import { calculateChartMinMax } from '@/app/lib/chart-utils';
import { CHART_GRID, CHART_CONFIG } from '@/app/lib/constants';
import { VolumeProfilePluginOptions } from '../types';

interface UseChartOptionsProps {
  data: OHLCV[];
  extendedData: { labels: string[]; prices: number[] };
  market: 'japan' | 'usa';
  hoveredIdx: number | null;
  setHoveredIndex: (idx: number | null) => void;
  signal?: Signal | null;
  priceRange?: { min: number, max: number } | null;
  supplyDemandLevels?: { price: number; strength: number }[];
}

interface ChartContext {
  index: number;
  tick?: { value?: number };
}

export const useChartOptions = ({
  data,
  extendedData: _extendedData,
  market,
  hoveredIdx,
  setHoveredIndex,
  signal,
  priceRange: propPriceRange,
  supplyDemandLevels
}: UseChartOptionsProps) => {
  // Y軸の範囲を計算（価格に応じて動的に調整）
  const yAxisRange = useMemo(() => {
    // 外部から範囲が指定されている場合はそれを使用
    if (propPriceRange) {
      const range = propPriceRange.max - propPriceRange.min;
      // 余裕を持たせる (5%)
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

    // 価格範囲に基づいて動的にマージンを設定（10%, 15%, 20%）
    const marginPercentage = priceRange > 1000 ? 0.05 : priceRange > 5000 ? 0.03 : 0.02;
    const margin = priceRange * marginPercentage;

    return {
      min: minPrice - margin,
      max: maxPrice + margin,
    };
  }, [data, propPriceRange]);

  const options: ChartOptions<'line'> = useMemo(() => ({
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
      mode: 'index',
      intersect: false
    },
    onHover: (_, elements) => {
      setHoveredIndex(elements.length > 0 ? elements[0].index : null);
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
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
      // Custom plugin for crosshair
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
      } as any,
      volumeProfile: {
        enabled: true,
        data: signal?.volumeResistance || supplyDemandLevels,
        currentPrice: data.length > 0 ? data[data.length - 1].close : 0
      } as VolumeProfilePluginOptions
    },
    scales: {
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
          drawBorder: false
        },
        ticks: {
          color: (ctx: ChartContext) => {
            if (ctx.index === hoveredIdx) {
              return '#fff';
            }
            return ctx.index >= data.length ? '#3b82f6' : '#92adc9';
          },
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
          drawBorder: false
        },
        ticks: {
          color: '#92adc9',
          callback: (v) => formatCurrency(Number(v), market === 'japan' ? 'JPY' : 'USD'),
          font: {
            size: CHART_GRID.LABEL_FONT_SIZE,
            family: 'Inter, sans-serif'
          },
          padding: 12,
          // 動的目盛り数：価格範囲に応じて調整
          count: yAxisRange.max - yAxisRange.min > 10000 ? 10 :
            yAxisRange.max - yAxisRange.min > 5000 ? 8 :
              yAxisRange.max - yAxisRange.min > 1000 ? 6 : 4
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
      easing: 'easeOutQuart'
    }
  }), [
    market,
    hoveredIdx,
    yAxisRange,
    setHoveredIndex,
    signal,
    data,
    supplyDemandLevels
  ]);

  return options;
};