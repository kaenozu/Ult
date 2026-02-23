/**
 * useChartIndicators.ts
 * 
 * テクニカル指標（SMA, Bollinger Bands）の計算と表示を管理
 */

import { useRef, useEffect } from 'react';
import { IChartApi, ISeriesApi, LineSeries, Time } from 'lightweight-charts';
import { OHLCV } from '@/app/types';
import { SMA_CONFIG } from '@/app/constants';
import { technicalIndicatorService } from '@/app/lib/TechnicalIndicatorService';

export function useChartIndicators(
  chartRef: React.RefObject<IChartApi | null>,
  data: OHLCV[],
  showSMA: boolean,
  showBollinger: boolean
) {
  const smaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const upperBandRef = useRef<ISeriesApi<'Line'> | null>(null);
  const lowerBandRef = useRef<ISeriesApi<'Line'> | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (showSMA) {
      const smaSeries = chartRef.current.addSeries(LineSeries, {
        color: '#f59e0b',
        lineWidth: 1,
      });
      smaSeriesRef.current = smaSeries as unknown as ISeriesApi<'Line'>;
    }

    if (showBollinger) {
      const upperBand = chartRef.current.addSeries(LineSeries, {
        color: 'rgba(147, 51, 234, 0.5)',
        lineWidth: 1,
        lineStyle: 2,
      });
      const lowerBand = chartRef.current.addSeries(LineSeries, {
        color: 'rgba(147, 51, 234, 0.5)',
        lineWidth: 1,
        lineStyle: 2,
      });
      upperBandRef.current = upperBand as unknown as ISeriesApi<'Line'>;
      lowerBandRef.current = lowerBand as unknown as ISeriesApi<'Line'>;
    }
  }, [chartRef, showSMA, showBollinger]);

  useEffect(() => {
    if (data.length === 0) return;

    if (smaSeriesRef.current && showSMA) {
      const period = SMA_CONFIG.MEDIUM_PERIOD || 20;
      const smaData = [];
      if (data.length >= period) {
        for (let i = period - 1; i < data.length; i++) {
          let sum = 0;
          for (let j = 0; j < period; j++) {
            sum += data[i - j].close;
          }
          smaData.push({
            time: data[i].date as Time,
            value: sum / period,
          });
        }
      }
      smaSeriesRef.current.setData(smaData);
    }

    if (upperBandRef.current && lowerBandRef.current && showBollinger) {
      const period = 20;
      const stdDev = 2;
      const prices = data.map(d => d.close);
      const { upper, lower } = technicalIndicatorService.calculateBollingerBands(prices, period, stdDev);
      
      const upperData = [];
      const lowerData = [];

      for (let i = 0; i < data.length; i++) {
        if (!isNaN(upper[i])) {
          const time = data[i].date as Time;
          upperData.push({ time, value: upper[i] });
          lowerData.push({ time, value: lower[i] });
        }
      }
      upperBandRef.current.setData(upperData);
      lowerBandRef.current.setData(lowerData);
    }
  }, [data, showSMA, showBollinger]);

  return { smaSeriesRef, upperBandRef, lowerBandRef };
}
