import { useMemo } from 'react';
import { OHLCV, Signal } from '@/app/types';
import { FORECAST_CONE } from '@/app/lib/constants';
import { reduceDataPoints, shouldReduceData, calculateOptimalDataPoints } from '@/app/lib/chart-utils';

export const useChartData = (
  data: OHLCV[],
  signal: Signal | null,
  indexData: OHLCV[] = [],
  chartWidth?: number
) => {
  const optimizedData = useMemo(() => {
    if (!shouldReduceData(data.length)) {
      return data;
    }

    const recentData = data.slice(-30);
    const olderData = data.slice(0, -30);

    const targetPoints = chartWidth
      ? calculateOptimalDataPoints(chartWidth, Math.min(recentData.length, 50))
      : Math.min(recentData.length, 50);

    const finalData = [...recentData];
    if (olderData.length > 0) {
      const sampledOlderData = reduceDataPoints(olderData, {
        targetPoints: Math.max(0, 50 - recentData.length),
        algorithm: 'lttb',
        preserveExtremes: true,
      });
      finalData.push(...sampledOlderData);
    }

    return finalData;
  }, [data, chartWidth]);

  const extendedData = useMemo(() => {
    const labels = optimizedData.map(d => d.date);
    const prices = optimizedData.map(d => d.close);

    if (signal && optimizedData.length > 0) {
      const lastDate = new Date(optimizedData[optimizedData.length - 1].date);
      const basePrice = optimizedData[optimizedData.length - 1].close;
      const seedBase = lastDate.getTime();

      for (let i = 1; i <= FORECAST_CONE.STEPS; i++) {
        const future = new Date(lastDate);
        future.setDate(lastDate.getDate() + i);
        labels.push(future.toISOString().split('T')[0]);

        const seed = seedBase + (i * 1000) + (signal.type === 'BUY' ? 1 : signal.type === 'SELL' ? 2 : 3);
        const jitter = (Math.sin(seed) + 1) / 2;
        const forecastPrice = signal.type === 'BUY'
          ? basePrice * (1.05 + jitter * 0.02)
          : signal.type === 'SELL'
          ? basePrice * (0.95 - jitter * 0.02)
          : basePrice * (1 + (jitter - 0.5) * 0.03);

        prices.push(forecastPrice);
      }
    }

    return { labels, prices };
  }, [optimizedData, signal]);

  const indexMap = useMemo(() => {
    if (!indexData || indexData.length === 0) return new Map();
    const map = new Map<string, number>();
    for (const d of indexData) {
      map.set(d.date, d.close);
    }
    return map;
  }, [indexData]);

  const normalizedIndexData = useMemo(() => {
    if (!indexData || indexData.length < 10 || optimizedData.length === 0) return [];

    const stockStartPrice = optimizedData[0].close;
    const targetDate = optimizedData[0].date;
    const indexStartPoint = indexData.find(d => d.date >= targetDate) || indexData[0];
    const indexStartPrice = indexStartPoint.close;

    const ratio = stockStartPrice / indexStartPrice;

    return extendedData.labels.map(label => {
      const idxClose = indexMap.get(label);
      return idxClose !== undefined ? idxClose * ratio : NaN;
    });
  }, [optimizedData, indexData, extendedData, indexMap]);

  return { extendedData, normalizedIndexData };
};