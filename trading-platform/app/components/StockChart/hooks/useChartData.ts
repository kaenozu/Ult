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
    // データポイント削減の適用（6ヶ月分のデータを優先）
  const optimizedData = useMemo(() => {
    if (!shouldReduceData(data.length)) {
      return data;
    }

    // 最新の30件を優先して表示（今日に近いデータを確保）
    const recentData = data.slice(-30);
    const olderData = data.slice(0, -30);
    
    // チャート幅に基づいて最適なデータポイント数を計算
    const targetPoints = chartWidth 
      ? calculateOptimalDataPoints(chartWidth, Math.min(recentData.length, 50))
      : Math.min(recentData.length, 50); // デフォルト値

    // 最新データは全件、古いデータはサンプリング
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
        
        // 未来の予測価格を生成（シグナル基準）
        const basePrice = optimizedData[optimizedData.length - 1].close;
        const forecastPrice = signal.type === 'BUY' 
          ? basePrice * (1.05 + Math.random() * 0.02) // 上昇予測
          : signal.type === 'SELL'
          ? basePrice * (0.95 - Math.random() * 0.02) // 下降予測
          : basePrice * (1 + (Math.random() - 0.5) * 0.03); // 横ばい
        
        prices.push(forecastPrice);
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
