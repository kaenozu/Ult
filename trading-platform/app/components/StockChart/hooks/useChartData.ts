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
    // 全データを常に使用（1年分の過去データを表示）
    const allData = data;

    if (!shouldReduceData(data.length)) {
      return allData;
    }

    const targetPoints = chartWidth
      ? calculateOptimalDataPoints(chartWidth, allData.length)
      : allData.length;

    // まだデータが多い場合は削減、なければそのまま使用
    return targetPoints < allData.length
      ? reduceDataPoints(allData, {
        targetPoints,
        algorithm: 'lttb',
        preserveExtremes: true,
      })
      : allData;
  }, [data, chartWidth]);

  // 実際の価格データのみ（予測を含まない）
  const actualData = useMemo(() => {
    const labels = optimizedData.map(d => d.date);
    const prices = optimizedData.map(d => d.close);
    return { labels, prices };
  }, [optimizedData]);

  // 予測データ用の拡張ラベルと価格
  const forecastExtension = useMemo(() => {
    console.log('[forecastExtension] === START ===');
    console.log('[forecastExtension] signal:', signal);
    console.log('[forecastExtension] signal is null:', signal === null);
    console.log('[forecastExtension] optimizedData.length:', optimizedData.length);
    console.log('[forecastExtension] actualData.labels.length:', actualData.labels.length);
    console.log('[forecastExtension] actualData.prices.length:', actualData.prices.length);
    
    if (!signal || optimizedData.length === 0) {
      console.log('[forecastExtension] No signal or data, returning actual data only');
      return { extendedLabels: actualData.labels, forecastPrices: [] };
    }

    const extendedLabels = [...actualData.labels];
    const forecastPrices = [];

    const lastDate = new Date(optimizedData[optimizedData.length - 1].date);
    const basePrice = optimizedData[optimizedData.length - 1].close;
    const seedBase = lastDate.getTime();

    console.log('[forecastExtension] Adding forecast days. Last actual date:', lastDate.toISOString().split('T')[0]);
    console.log('[forecastExtension] basePrice:', basePrice);
    console.log('[forecastExtension] signal.type:', signal.type);
    console.log('[forecastExtension] FORECAST_CONE.STEPS:', FORECAST_CONE.STEPS);
    for (let i = 1; i <= FORECAST_CONE.STEPS; i++) {
      const future = new Date(lastDate);
      future.setDate(lastDate.getDate() + i);
      const futureDateStr = future.toISOString().split('T')[0];
      extendedLabels.push(futureDateStr);
      console.log('[forecastExtension] Added day', i, ':', futureDateStr);

      const seed = seedBase + (i * 1000) + (signal.type === 'BUY' ? 1 : signal.type === 'SELL' ? 2 : 3);
      const jitter = (Math.sin(seed) + 1) / 2;
      const forecastPrice = signal.type === 'BUY'
        ? basePrice * (1.05 + jitter * 0.02)
        : signal.type === 'SELL'
          ? basePrice * (0.95 - jitter * 0.02)
          : basePrice * (1 + (jitter - 0.5) * 0.03);

      forecastPrices.push(forecastPrice);
    }

    console.log('[forecastExtension] Final extendedLabels length:', extendedLabels.length, 'actual data length:', actualData.labels.length);
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
      labels: forecastExtension.extendedLabels,  // 予測期間を含む拡張ラベルを使用
      prices: [...actualData.prices, ...Array(forecastExtension.extendedLabels.length - actualData.prices.length).fill(null)]  // 予測部分はnullで埋めて別途レイヤーで描画
    }
  };
};