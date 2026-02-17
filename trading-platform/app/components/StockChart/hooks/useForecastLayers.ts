import { useMemo } from 'react';
import { OHLCV, Signal } from '@/app/types';
import { analyzeStock } from '@/app/lib/analysis';
import { GHOST_FORECAST, FORECAST_CONE, OPTIMIZATION } from '@/app/lib/constants';
import { usePreCalculatedIndicators } from './usePreCalculatedIndicators';

interface UseForecastLayersProps {
  data: OHLCV[];
  extendedData: { labels: string[]; prices: number[] };
  signal: Signal | null;
  market: 'japan' | 'usa';
  hoveredIdx: number | null;
  accuracyData?: {
    predictionError: number;
  } | null;
}

/**
 * 予測レイヤーフック
 *
 * このフックは2種類の予測データを生成します:
 *
 * 1. ゴースト予測（ghostForecastDatasets）:
 *    - チャート上でマウスオーバーした際に表示される過去の予測再現
 *    - ホバー位置までのデータのみを使用してシグナルを再計算
 *    - 「あの時点でどう予測されていたか」をタイムトライルして確認する機能
 *    - 常時表示の予測線とは異なる値を表示する（これは仕様）
 *
 * 2. 予測コーン（forecastDatasets）:
 *    - 常にチャート上に表示される最新の予測
 *    - 最新の全データを使用したシグナルに基づく予測
 *    - 未来の価格変動を予測するコーンを表示
 */
export const useForecastLayers = ({
  data,
  extendedData,
  signal,
  market,
  hoveredIdx,
  accuracyData = null
}: UseForecastLayersProps) => {
  // Optimized: Pre-calculate indicators once to avoid re-calculation on every hover
  const preCalculatedIndicators = usePreCalculatedIndicators(data);

  // 2. AI Time Travel: Ghost Cloud (過去の予測再現)
  const ghostForecastDatasets = useMemo(() => {
    if (hoveredIdx === null || hoveredIdx >= data.length || data.length < OPTIMIZATION.MIN_DATA_PERIOD) return [];

    // Note: analyzeStock might be expensive, so it's good this is memoized
    // Optimized: Pass full data with endIndex and pre-calculated indicators to avoid slice & re-calc
    const pastSignal = analyzeStock({
      symbol: data[0].symbol || '',
      data,
      market,
      context: { endIndex: hoveredIdx, preCalculatedIndicators }
    });
    if (!pastSignal) return [];

    const targetArr = new Array(data.length).fill(NaN);
    const stopArr = new Array(data.length).fill(NaN);

    const currentPrice = data[hoveredIdx].close;
    const stockATR = pastSignal.atr || (currentPrice * GHOST_FORECAST.DEFAULT_ATR_RATIO);
    const confidenceFactor = (110 - pastSignal.confidence) / 100;
    const momentum = pastSignal.predictedChange ? pastSignal.predictedChange / 100 : 0;

    // Ghost forecast: 過去の時点でのシグナル(pastSignal)を使用して、
    // その時点で利用可能だったデータのみで予測を再現（タイムトラベル機能）
    // 注: 常時表示の予測線とは異なる値を表示します（これは仕様です）
    for (let i = 1; i <= FORECAST_CONE.STEPS; i++) {
      if (hoveredIdx + i < extendedData.labels.length) {
        const timeRatio = i / FORECAST_CONE.STEPS;
        const centerPrice = currentPrice * (1 + (momentum * timeRatio));
        const spread = (stockATR * timeRatio) * confidenceFactor;
        targetArr[hoveredIdx + i] = centerPrice + spread;
        stopArr[hoveredIdx + i] = centerPrice - spread;
      }
    }

    const color = pastSignal.type === 'BUY' ? '34, 197, 94' : pastSignal.type === 'SELL' ? '239, 68, 68' : '100, 116, 139';
    return [
      {
        label: '過去予測(上)',
        data: targetArr,
        borderColor: `rgba(${color}, ${GHOST_FORECAST.TARGET_ALPHA})`,
        backgroundColor: `rgba(${color}, ${GHOST_FORECAST.TARGET_FILL_ALPHA})`,
        borderWidth: 1,
        borderDash: [3, 3],
        pointRadius: 0,
        fill: '+1',
        order: -2
      },
      {
        label: '過去予測(下)',
        data: stopArr,
        borderColor: `rgba(${color}, ${GHOST_FORECAST.STOP_ALPHA})`,
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
        order: -2
      }
    ];
  }, [hoveredIdx, data, market, extendedData.labels, preCalculatedIndicators]);

  return { ghostForecastDatasets, forecastDatasets: [] };
};
