import { useMemo } from 'react';
import { ChartOptions, ChartTypeRegistry, TooltipItem } from 'chart.js';
import { OHLCV, Signal } from '@/app/types';
import { formatCurrency } from '@/app/lib/utils';
import { CHART_GRID, CHART_CONFIG } from '@/app/lib/constants';
import { VolumeProfilePluginOptions } from '../types';

interface UseChartOptionsProps {
  data: OHLCV[];
  extendedData: { labels: string[]; prices: number[] };
  market: 'japan' | 'usa';
  hoveredIdx: number | null;
  setHoveredIndex: (idx: number | null) => void;
  signal: Signal | null;
}

interface ChartContext {
  index: number;
}

export const useChartOptions = ({
  data,
  extendedData,
  market,
  hoveredIdx,
  setHoveredIndex,
  signal
}: UseChartOptionsProps) => {
  // Y軸の範囲を計算（価格変動を見やすくするため）
  const yAxisRange = useMemo(() => {
    if (data.length === 0) return { min: 0, max: 100 };
    const prices = data.map(d => d.close);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const currentPrice = data[data.length - 1].close;
    const range = maxPrice - minPrice;

    // 価格変動が小さい場合、範囲を制限して変動を見やすくする
    // 最小範囲は現在価格の±3%、最大範囲はデータの最小値〜最大値
    const minRange = currentPrice * 0.06; // ±3%
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
      // Custom plugin handling needs type casting if TypeScript complains about custom properties
      // @ts-expect-error - VolumeProfile plugin options
      volumeProfile: {
        enabled: true,
        data: signal?.volumeResistance,
        currentPrice: data.length > 0 ? data[data.length - 1].close : 0
      } as VolumeProfilePluginOptions
    },
    scales: {
      x: {
        min: extendedData.labels.length > 105 ? extendedData.labels[extendedData.labels.length - 105] : undefined,
        grid: {
          color: (c: unknown) => {
            const ctx = c as ChartContext;
            return ctx.index === hoveredIdx
              ? CHART_GRID.HOVER_COLOR
              : (ctx.index >= data.length ? CHART_GRID.FUTURE_AREA_COLOR : CHART_GRID.MAIN_COLOR);
          },
          lineWidth: (c: unknown) => {
            const ctx = c as ChartContext;
            return ctx.index === hoveredIdx
              ? CHART_GRID.HOVER_LINE_WIDTH
              : (ctx.index === data.length - 1 ? CHART_GRID.CURRENT_PRICE_LINE_WIDTH : 1);
          }
        },
        ticks: {
          color: (c: unknown) => {
            const ctx = c as ChartContext;
            return ctx.index === hoveredIdx ? '#fff' : (ctx.index >= data.length ? '#3b82f6' : '#92adc9');
          },
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
  }), [market, data.length, extendedData.labels, hoveredIdx, yAxisRange, setHoveredIndex, signal, data, extendedData]);

  return options;
};
