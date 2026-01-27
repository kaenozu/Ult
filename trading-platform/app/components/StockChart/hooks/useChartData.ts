import { useMemo } from 'react';
import { OHLCV, Signal } from '@/app/types';
import { FORECAST_CONE } from '@/app/constants';

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

  // 1.5 市場指数の正規化 (Normalizing Index to Stock scale)
  const normalizedIndexData = useMemo(() => {
    if (!indexData || indexData.length < 10 || data.length === 0) return [];

    // 表示期間の開始価格を基準に倍率を計算
    const stockStartPrice = data[0].close;
    // indexDataからdata[0].dateに最も近い日の価格を探す
    const targetDate = data[0].date;
    const indexStartPoint = indexData.find(d => d.date >= targetDate) || indexData[0];
    const indexStartPrice = indexStartPoint.close;

    const ratio = stockStartPrice / indexStartPrice;

    // data[i].date に合わせて indexData をマッピング
    return extendedData.labels.map(label => {
      const idxPoint = indexData.find(d => d.date === label);
      return idxPoint ? idxPoint.close * ratio : NaN;
    });
  }, [data, indexData, extendedData.labels]);

  return { extendedData, normalizedIndexData };
};
