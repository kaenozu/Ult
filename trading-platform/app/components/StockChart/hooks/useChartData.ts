import { useMemo } from 'react';
import { OHLCV, Signal } from '@/app/types';
import { FORECAST_CONE } from '@/app/lib/constants';
import { reduceDataPoints, shouldReduceData, calculateOptimalDataPoints, findDateIndex } from '@/app/lib/chart-utils';

export const useChartData = (
  data: OHLCV[],
  signal: Signal | null,
  indexData: OHLCV[] = [],
  chartWidth?: number
) => {
  const optimizedData = useMemo(() => {
    // dataが配列でない、または空の場合は空配列を返す
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

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

    if (optimizedData.length === 0) {
      return { extendedLabels: [], forecastPrices: [] };
    }

    // Only generate extension if we have a proper signal
    if (!signal) {
      return { extendedLabels: actualData.labels, forecastPrices: [] };
    }

    // Use the provided signal
    const activeSignal = signal;

    // Always generate extension to prevent "gap" issues
    const extendedLabels = [...actualData.labels];
    const forecastPrices = [];

    const lastDate = new Date(optimizedData[optimizedData.length - 1].date);
    const basePrice = optimizedData[optimizedData.length - 1].close;
    const seedBase = lastDate.getTime();

    // Use default STEPS if not defined
    const steps = FORECAST_CONE.STEPS || 60;

    for (let i = 1; i <= steps; i++) {
      const future = new Date(lastDate);
      future.setDate(lastDate.getDate() + i);
      const futureDateStr = future.toISOString().split('T')[0];
      extendedLabels.push(futureDateStr);

      const timeRatio = i / steps;
      // useForecastLayers と一貫性のある強調された傾きを使用
      let momentum = activeSignal.predictedChange ? (activeSignal.predictedChange / 100) * 2.0 : 0;
      
      // 絶対ガード: 0または極小でも傾きを出す
      if (Math.abs(momentum) < 0.01) {
        const seed = (activeSignal.symbol || 'ULT').charCodeAt(0);
        momentum = seed % 2 === 0 ? 0.01 : -0.01;
      }
      
      const seed = seedBase + (i * 1000) + (activeSignal.type === 'BUY' ? 1 : activeSignal.type === 'SELL' ? 2 : 3);
      const jitter = ((Math.sin(seed) + 1) / 2) * 0.003; 
      
      const forecastPrice = basePrice * (1 + (momentum * timeRatio) + (jitter * timeRatio));

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

  // Memoize start date to stabilize search
  const chartStartDate = optimizedData[0]?.date;

  // Use binary search to find start index efficiently (O(log N)) instead of linear scan (O(N))
  // This is Memoized based on chartStartDate, so it won't re-run if optimizedData updates but start date is same
  const indexStartIndex = useMemo(() => {
    if (!chartStartDate || !indexData || indexData.length === 0) return -1;
    return findDateIndex(indexData, chartStartDate);
  }, [indexData, chartStartDate]);

  const normalizedIndexData = useMemo(() => {
    if (!indexData || indexData.length < 10 || optimizedData.length === 0) return [];

    const stockStartPrice = optimizedData[0].close;

    // Use the pre-calculated efficient index
    let indexStartPoint = indexData[0];
    if (indexStartIndex !== -1) {
      indexStartPoint = indexData[indexStartIndex];
    }

    const indexStartPrice = indexStartPoint.close;

    const ratio = stockStartPrice / indexStartPrice;

    return actualData.labels.map(label => {
      const idxClose = indexMap.get(label);
      return idxClose !== undefined ? idxClose * ratio : NaN;
    });
  }, [optimizedData, indexData, actualData, indexMap, indexStartIndex]);

     const extendedData = useMemo(() => ({
       labels: forecastExtension.extendedLabels,  // 予測期間を含む拡張ラベルを使用
       prices: [...actualData.prices, ...Array(Math.max(0, forecastExtension.extendedLabels.length - actualData.prices.length)).fill(null)]  // 予測部分はnullで埋めて別途レイヤーで描画
     }), [forecastExtension, actualData]);
   return useMemo(() => ({
     actualData,           // 実際の価格データのみ
     optimizedData,        // 最適化済みデータ（Forecast用）
     forecastExtension,    // 予測用の拡張データ
     normalizedIndexData,
     extendedData
   }), [actualData, optimizedData, forecastExtension, normalizedIndexData, extendedData]);
};