import { useMemo } from 'react';
import { OHLCV, Signal } from '@/app/types';
import { analyzeStock } from '@/app/lib/analysis';
import { GHOST_FORECAST, FORECAST_CONE, OPTIMIZATION } from '@/app/lib/constants';

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
  // 2. AI Time Travel: Ghost Cloud (過去の予測再現)
  const ghostForecastDatasets = useMemo(() => {
    if (hoveredIdx === null || hoveredIdx >= data.length || data.length < OPTIMIZATION.MIN_DATA_PERIOD) return [];

    // Note: analyzeStock might be expensive, so it's good this is memoized
    const pastSignal = analyzeStock(data[0].symbol || '', data.slice(0, hoveredIdx + 1), market);
    if (!pastSignal) return [];

    const targetArr = new Array(extendedData.labels.length).fill(NaN);
    const stopArr = new Array(extendedData.labels.length).fill(NaN);
    const currentPrice = data[hoveredIdx].close;
    targetArr[hoveredIdx] = stopArr[hoveredIdx] = currentPrice;

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
  }, [hoveredIdx, data, market, extendedData.labels]);

  // 4. 未来予測の予報円 (Forecast Cone) - 常に表示される最新の予測
  // 注: 最新の全データを使用したsignalを元に計算（ゴースト予測とは異なります）
  const forecastDatasets = useMemo(() => {
    if (!signal || data.length === 0) return [];
    const lastIdx = data.length - 1;
    const currentPrice = data[lastIdx].close;
    const targetArr = new Array(extendedData.labels.length).fill(NaN);
    const stopArr = new Array(extendedData.labels.length).fill(NaN);

    const stockATR = signal.atr || (currentPrice * GHOST_FORECAST.DEFAULT_ATR_RATIO);
    
    // Use real-time prediction error from accuracy data if available
    const predError = accuracyData?.predictionError ?? signal.predictionError ?? 1.0;
    const errorFactor = Math.min(Math.max(predError, 0.5), 1.5);
    const confidenceUncertainty = 0.4 + ((100 - signal.confidence) / 100) * 0.4;
    const combinedFactor = errorFactor * confidenceUncertainty;

    const momentum = signal.predictedChange ? signal.predictedChange / 100 : 0;
    const confidenceFactor = (110 - signal.confidence) / 100;

    let target = signal.targetPrice, stop = signal.stopLoss;
    if (signal.type === 'HOLD') {
      target = currentPrice + (stockATR * combinedFactor * 2);
      stop = currentPrice - (stockATR * combinedFactor * 2);
    } else {
      const uncertainty = stockATR * FORECAST_CONE.ATR_MULTIPLIER * combinedFactor;
      target += (signal.type === 'BUY' ? 1 : -1) * uncertainty;
      stop -= (signal.type === 'BUY' ? 1 : -1) * uncertainty;
    }

    targetArr[lastIdx] = stopArr[lastIdx] = currentPrice;
    const steps = FORECAST_CONE.STEPS;
    for (let i = 1; i <= steps; i++) {
      if (lastIdx + i < extendedData.labels.length) {
        const timeRatio = i / steps;
        const centerPrice = currentPrice * (1 + (momentum * timeRatio));
        const spread = (stockATR * timeRatio) * confidenceFactor;
        targetArr[lastIdx + i] = centerPrice + spread;
        stopArr[lastIdx + i] = centerPrice - spread;
      }
    }

    const color = signal.type === 'BUY' ? '16, 185, 129' : signal.type === 'SELL' ? '239, 68, 68' : '146, 173, 201';
    return [
      {
        label: 'ターゲット',
        data: targetArr,
        borderColor: `rgba(${color}, 1)`,
        backgroundColor: `rgba(${color}, 0.3)`,
        borderWidth: 3,
        borderDash: [6, 4],
        pointRadius: 0,
        fill: '+1',
        order: -1
      },
      {
        label: 'リスク',
        data: stopArr,
        borderColor: `rgba(${color}, 0.7)`,
        borderWidth: 3,
        borderDash: [6, 4],
        pointRadius: 0,
        fill: false,
        order: -1
      }
    ];
  }, [signal, data, extendedData, accuracyData]);

  return { ghostForecastDatasets, forecastDatasets };
};
