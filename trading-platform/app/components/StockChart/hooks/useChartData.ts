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
    // 繝・・繧ｿ繝昴う繝ｳ繝亥炎貂帙・驕ｩ逕ｨ・・繝ｶ譛亥・縺ｮ繝・・繧ｿ繧貞━蜈茨ｼ・  const optimizedData = useMemo(() => {
    if (!shouldReduceData(data.length)) {
      return data;
    }

    // 譛譁ｰ縺ｮ30莉ｶ繧貞━蜈医＠縺ｦ陦ｨ遉ｺ・井ｻ頑律縺ｫ霑代＞繝・・繧ｿ繧堤｢ｺ菫晢ｼ・    const recentData = data.slice(-30);
    const olderData = data.slice(0, -30);
    
    // 繝√Ε繝ｼ繝亥ｹ・↓蝓ｺ縺･縺・※譛驕ｩ縺ｪ繝・・繧ｿ繝昴う繝ｳ繝域焚繧定ｨ育ｮ・    const targetPoints = chartWidth 
      ? calculateOptimalDataPoints(chartWidth, Math.min(recentData.length, 50))
      : Math.min(recentData.length, 50); // 繝・ヵ繧ｩ繝ｫ繝亥､

    // 譛譁ｰ繝・・繧ｿ縺ｯ蜈ｨ莉ｶ縲∝商縺・ョ繝ｼ繧ｿ縺ｯ繧ｵ繝ｳ繝励Μ繝ｳ繧ｰ
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

    // 1. 蝓ｺ譛ｬ繝・・繧ｿ縺ｨ譛ｪ譚･莠域ｸｬ逕ｨ縺ｮ繝ｩ繝吶Ν諡｡蠑ｵ
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

  // 1.5 蟶ょｴ謖・焚縺ｮ繝槭ャ繝嶺ｽ懈・・・ndexData 縺ｮ縺ｿ萓晏ｭ假ｼ・  const indexMap = useMemo(() => {
    if (!indexData || indexData.length === 0) return new Map();
    const map = new Map<string, number>();
    for (const d of indexData) {
      map.set(d.date, d.close);
    }
    return map;
  }, [indexData]);

  // 1.6 蟶ょｴ謖・焚縺ｮ豁｣隕丞喧 (Normalizing Index to Stock scale)
  const normalizedIndexData = useMemo(() => {
    if (!indexData || indexData.length < 10 || optimizedData.length === 0) return [];

    // 陦ｨ遉ｺ譛滄俣縺ｮ髢句ｧ倶ｾ｡譬ｼ繧貞渕貅悶↓蛟咲紫繧定ｨ育ｮ・    const stockStartPrice = optimizedData[0].close;
    // indexData縺九ｉdata[0].date縺ｫ譛繧りｿ代＞譌･縺ｮ萓｡譬ｼ繧呈爾縺・    const targetDate = optimizedData[0].date;
    const indexStartPoint = indexData.find(d => d.date >= targetDate) || indexData[0];
    const indexStartPrice = indexStartPoint.close;

    const ratio = stockStartPrice / indexStartPrice;

    // data[i].date 縺ｫ蜷医ｏ縺帙※ indexData 繧偵・繝・ヴ繝ｳ繧ｰ
    return extendedData.labels.map(label => {
      const idxClose = indexMap.get(label);
      return idxClose !== undefined ? idxClose * ratio : NaN;
    });
  }, [optimizedData, indexData, extendedData, indexMap]);

  return { extendedData, normalizedIndexData };
};
