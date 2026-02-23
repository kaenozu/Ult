/**
 * useChartData.ts
 * 
 * ローソク足と出来高データの更新を管理
 */

import { useRef, useEffect, useCallback } from 'react';
import { IChartApi, ISeriesApi, CandlestickSeries, HistogramSeries, Time } from 'lightweight-charts';
import { OHLCV } from '@/app/types';

export function useChartData(
  chartRef: React.RefObject<IChartApi | null>,
  data: OHLCV[],
  showVolume: boolean
) {
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const candleSeries = chartRef.current.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderDownColor: '#ef4444',
      borderUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      wickUpColor: '#22c55e',
    });
    candleSeriesRef.current = candleSeries as unknown as ISeriesApi<'Candlestick'>;

    if (showVolume) {
      const volumeSeries = chartRef.current.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });
      chartRef.current.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });
      volumeSeriesRef.current = volumeSeries as unknown as ISeriesApi<'Histogram'>;
    }

    return () => {
      // Series are removed when chart is removed in useChartInstance
    };
  }, [chartRef, showVolume]);

  useEffect(() => {
    if (!candleSeriesRef.current || data.length === 0) return;

    const lwcData = data.map((d) => ({
      time: d.date as Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));
    candleSeriesRef.current.setData(lwcData);

    if (volumeSeriesRef.current && showVolume) {
      const volumeData = data.map((d) => ({
        time: d.date as Time,
        value: d.volume,
        color: d.close >= d.open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
      }));
      volumeSeriesRef.current.setData(volumeData);
    }
  }, [data, showVolume]);

  return { candleSeriesRef, volumeSeriesRef };
}
