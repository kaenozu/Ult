import { useMemo } from 'react';
import { OHLCV, Signal } from '@/app/types';
import { FORECAST_CONE } from '@/app/lib/constants';

export const useChartData = (
  data: OHLCV[],
  signal: Signal | null,
  indexData: OHLCV[] = []
) => {
  // 1. 基本データと未来予測用のラベル拡張
  const extendedData = useMemo(() => {
    const labels = data.map(d => d.date);
    const prices = data.map(d => d.close);
    if (signal && data.length > 0) {
      const lastDate = new Date(data[data.length - 1].date);
      for (let i = 1; i <= FORECAST_CONE.STEPS; i++) {
        const future = new Date(lastDate);
        future.setDate(lastDate.getDate() + i);
        labels.push(future.toISOString().split('T')[0]);
        prices.push(NaN);
      }
    }
    return { labels, prices };
  }, [data, signal]);

  // 1.5 市場指数のマップ作成（indexData のみ依存）
  const indexMap = useMemo(() => {
    if (!indexData || indexData.length === 0) return new Map();
    const map = new Map<string, number>();
    for (const d of indexData) {
      map.set(d.date, d.close);
    }
    return map;
  }, [indexData]);

  // 1.5.1 市場指数の日付配列作成（二分探索用）
  const indexDates = useMemo(() => {
    if (!indexData || indexData.length === 0) return [];
    return indexData.map(d => d.date);
  }, [indexData]);

  // 1.6 市場指数の正規化 (Normalizing Index to Stock scale)
  const normalizedIndexData = useMemo(() => {
    if (!indexData || indexData.length < 10 || data.length === 0) return [];

    // 表示期間の開始価格を基準に倍率を計算
    const stockStartPrice = data[0].close;
    // indexDataからdata[0].dateに最も近い日の価格を探す（二分探索でO(log M)）
    const targetDate = data[0].date;
    
    // 二分探索でtargetDate以上の最初の要素を見つける
    let left = 0;
    let right = indexDates.length - 1;
    let foundIndex = 0;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (indexDates[mid] >= targetDate) {
        foundIndex = mid;
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }
    
    const indexStartPrice = indexMap.get(indexDates[foundIndex]) || indexData[0].close;

    const ratio = stockStartPrice / indexStartPrice;

    // data[i].date に合わせて indexData をマッピング
    return extendedData.labels.map(label => {
      const idxClose = indexMap.get(label);
      return idxClose !== undefined ? idxClose * ratio : NaN;
    });
  }, [data, indexData, extendedData, indexMap, indexDates]);

  return { extendedData, normalizedIndexData };
};
