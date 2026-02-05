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
    // 最新100日分を常に表示（過去データを優先）
    const recentData = data.slice(-100);
    
    if (!shouldReduceData(data.length)) {
      return recentData;
    }

    const targetPoints = chartWidth
      ? calculateOptimalDataPoints(chartWidth, recentData.length)
      : recentData.length;

    // まだデータが多い場合は削減、なければそのまま使用
    return targetPoints < recentData.length
      ? reduceDataPoints(recentData, {
          targetPoints,
          algorithm: 'lttb',
          preserveExtremes: true,
        })
      : recentData;
  }, [data, chartWidth]);

// 実際の価格データのみ（予測を含まない）
  const actualData = useMemo(() => {
    const labels = optimizedData.map(d => d.date);
    const prices = optimizedData.map(d => d.close);
    return { labels, prices };
  }, [optimizedData]);

  // 予測データ用の拡張ラベルと価格
  const forecastExtension = useMemo(() => {
    if (!signal || optimizedData.length === 0) {
      return { extendedLabels: actualData.labels, forecastPrices: [] };
    }

    const extendedLabels = [...actualData.labels];
    const forecastPrices = [];

    const lastDate = new Date(optimizedData[optimizedData.length - 1].date);
    const basePrice = optimizedData[optimizedData.length - 1].close;
    const seedBase = lastDate.getTime();

    for (let i = 1; i <= FORECAST_CONE.STEPS; i++) {
      const future = new Date(lastDate);
      future.setDate(lastDate.getDate() + i);
      extendedLabels.push(future.toISOString().split('T')[0]);

      const seed = seedBase + (i * 1000) + (signal.type === 'BUY' ? 1 : signal.type === 'SELL' ? 2 : 3);
      const jitter = (Math.sin(seed) + 1) / 2;
      const forecastPrice = signal.type === 'BUY'
        ? basePrice * (1.05 + jitter * 0.02)
        : signal.type === 'SELL'
        ? basePrice * (0.95 - jitter * 0.02)
        : basePrice * (1 + (jitter - 0.5) * 0.03);

      forecastPrices.push(forecastPrice);
    }

    return { extendedLabels, forecastPrices };
  }, [optimizedData, signal, actualData]);

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

    return actualData.labels.map(label => {
      const idxClose = indexMap.get(label);
      return idxClose !== undefined ? idxClose * ratio : NaN;
    });
  }, [optimizedData, indexData, actualData, indexMap]);

  return { 
    actualData,           // 実際の価格データのみ
    forecastExtension,    // 予測用の拡張データ
    normalizedIndexData,
    extendedData: {
      labels: actualData.labels,  // 実データのラベルのみ
      prices: actualData.prices  // 実データの価格のみ
    }
  };
};