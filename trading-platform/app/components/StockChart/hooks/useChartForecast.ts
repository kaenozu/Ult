/**
 * useChartForecast.ts
 * 
 * AI予測コーンの表示を管理
 */

import { useRef, useEffect } from 'react';
import { IChartApi, ISeriesApi, LineSeries, Time } from 'lightweight-charts';
import { OHLCV, Signal } from '@/app/types';
import { GHOST_FORECAST, FORECAST_CONE } from '@/app/constants';

export function useChartForecast(
  chartRef: React.RefObject<IChartApi | null>,
  data: OHLCV[],
  signal: Signal | null,
  predictionError: number = 1.0
) {
  const forecastUpperRef = useRef<ISeriesApi<'Line'> | null>(null);
  const forecastLowerRef = useRef<ISeriesApi<'Line'> | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const forecastUpper = chartRef.current.addSeries(LineSeries, {
      color: 'rgba(59, 130, 246, 0.8)',
      lineWidth: 2,
      lineStyle: 2,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    const forecastLower = chartRef.current.addSeries(LineSeries, {
      color: 'rgba(59, 130, 246, 0.8)',
      lineWidth: 2,
      lineStyle: 2,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    forecastUpperRef.current = forecastUpper as unknown as ISeriesApi<'Line'>;
    forecastLowerRef.current = forecastLower as unknown as ISeriesApi<'Line'>;
  }, [chartRef]);

  useEffect(() => {
    if (data.length === 0 || !signal || !forecastUpperRef.current || !forecastLowerRef.current) return;

    const lastData = data[data.length - 1];
    const forecastSteps = Math.min(FORECAST_CONE.STEPS || 30, 30);
    const atr = signal.atr || lastData.close * (GHOST_FORECAST.DEFAULT_ATR_RATIO || 0.02);
    const spreadMultiplier = 3.0 * predictionError;
    
    const forecastUpperData = [];
    const forecastLowerData = [];
    
    const baseDate = new Date(lastData.date);
    
    for (let i = 0; i <= forecastSteps; i++) {
      const timeRatio = i / forecastSteps;
      const momentum = signal.predictedChange ? signal.predictedChange / 100 : 0;
      const centerPrice = lastData.close * (1 + momentum * timeRatio);
      const spread = atr * timeRatio * spreadMultiplier;
      
      const futureDate = new Date(baseDate);
      futureDate.setDate(futureDate.getDate() + i);
      const timeStr = futureDate.toISOString().split('T')[0] as Time;
      
      forecastUpperData.push({ time: timeStr, value: centerPrice + spread });
      forecastLowerData.push({ time: timeStr, value: centerPrice - spread });
    }
    
    forecastUpperRef.current.setData(forecastUpperData);
    forecastLowerRef.current.setData(forecastLowerData);
    
    if (chartRef.current) {
      chartRef.current.timeScale().scrollToRealTime();
    }
  }, [data, signal, predictionError, chartRef]);

  return { forecastUpperRef, forecastLowerRef };
}
