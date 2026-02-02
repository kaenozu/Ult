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
  // データポイント削減の適用
  const optimizedData = useMemo(() => {
    if (!shouldReduceData(data.length)) {
      return data;
    }

    // チャート幅に基づいて最適なデータポイント数を計算
    const targetPoints = chartWidth 
      ? calculateOptimalDataPoints(chartWidth, data.length)
      : 500; // デフォルト値

    return reduceDataPoints(data, {
      targetPoints,
      algorithm: 'lttb', // Largest Triangle Three Bucketsアルゴリズムを使用
      preserveExtremes: true,
    });
  }, [data, chartWidth]);

  // 1. 基本データと未来予測用のラベル拡張
  const extendedData = useMemo(() => {
    const labels = optimizedData.map(d => d.date);
    const prices = optimizedData.map(d => d.close);
    if (signal && optimizedData.length > 0) {
      const lastDate = new Date(optimizedData[optimizedData.length - 1].date);
      for (let i = 1; i <= FORECAST_CONE.STEPS; i++) {
        const future = new Date(lastDate);
        future.setDate(lastDate.getDate() + i);
        labels.push(future.toISOString().split('T')[0]);
        prices.push(NaN);
      }
    }
    return { labels, prices };
  }, [optimizedData, signal]);

  // 1.5 市場指数のマップ作成（indexData のみ依存）
  const indexMap = useMemo(() => {
    if (!indexData || indexData.length === 0) return new Map();
    const map = new Map<string, number>();
    for (const d of indexData) {
      map.set(d.date, d.close);
    }
    return map;
  }, [indexData]);

  // 1.6 市場指数の正規化 (Normalizing Index to Stock scale)
  const normalizedIndexData = useMemo(() => {
    if (!indexData || indexData.length < 10 || optimizedData.length === 0) return [];

    // 表示期間の開始価格を基準に倍率を計算
    const stockStartPrice = optimizedData[0].close;
    // indexDataからdata[0].dateに最も近い日の価格を探す
    const targetDate = optimizedData[0].date;
    const indexStartPoint = indexData.find(d => d.date >= targetDate) || indexData[0];
    const indexStartPrice = indexStartPoint.close;

    const ratio = stockStartPrice / indexStartPrice;

    // data[i].date に合わせて indexData をマッピング
    return extendedData.labels.map(label => {
      const idxClose = indexMap.get(label);
      return idxClose !== undefined ? idxClose * ratio : NaN;
    });
  }, [optimizedData, indexData, extendedData, indexMap]);

  return { extendedData, normalizedIndexData };
};
