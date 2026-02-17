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
 *    - 「あの時点でどう予測されていたか」をタイムトラベルして確認する機能
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

  // 1. AI Forecast Cone (最新の予測表示)
  const forecastDatasets = useMemo(() => {
    if (!signal || !signal.targetPrice || data.length === 0) return [];

    const lastIdx = data.length - 1;
    const targetArr = new Array(extendedData.labels.length).fill(NaN);
    const stopArr = new Array(extendedData.labels.length).fill(NaN);

    // 現時点から未来に向かってコーンを形成
    const currentPrice = data[lastIdx].close;
    const predictionError = accuracyData?.predictionError || 1.0;
    
    // シグナルの信頼度と過去の誤差に基づき幅を調整
    const spreadMultiplier = (1.5 - (signal.confidence / 100)) * predictionError;
    const stockATR = signal.atr || (currentPrice * GHOST_FORECAST.DEFAULT_ATR_RATIO);

    targetArr[lastIdx] = currentPrice;
    stopArr[lastIdx] = currentPrice;

    for (let i = 1; i <= FORECAST_CONE.STEPS; i++) {
      const idx = lastIdx + i;
      if (idx < extendedData.labels.length) {
        const timeRatio = i / FORECAST_CONE.STEPS;
        const momentum = signal.predictedChange ? signal.predictedChange / 100 : 0;
        const centerPrice = currentPrice * (1 + (momentum * timeRatio));
        const spread = (stockATR * timeRatio) * spreadMultiplier;
        
        targetArr[idx] = centerPrice + spread;
        stopArr[idx] = centerPrice - spread;
      }
    }

    const color = signal.type === 'BUY' ? '34, 197, 94' : signal.type === 'SELL' ? '239, 68, 68' : '146, 173, 201';
    
    return [
      {
        label: '予測範囲(上)',
        data: targetArr,
        borderColor: `rgba(${color}, 0.3)`,
        backgroundColor: `rgba(${color}, 0.1)`,
        borderWidth: 1,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: '+1',
        order: -1
      },
      {
        label: '予測範囲(下)',
        data: stopArr,
        borderColor: `rgba(${color}, 0.3)`,
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
        order: -1
      }
    ];
  }, [signal, data, extendedData.labels, accuracyData]);

  // 2. AI Time Travel: Ghost Cloud (過去の予測再現)
  const ghostForecastDatasets = useMemo(() => {
    if (hoveredIdx === null || hoveredIdx >= data.length || data.length < OPTIMIZATION.MIN_DATA_PERIOD) return [];

    const pastSignal = analyzeStock(
      data[0].symbol || '',
      data,
      market,
      undefined,
      { endIndex: hoveredIdx, preCalculatedIndicators }
    );
    if (!pastSignal) return [];

    const targetArr = new Array(extendedData.labels.length).fill(NaN);
    const stopArr = new Array(extendedData.labels.length).fill(NaN);

    const currentPrice = data[hoveredIdx].close;
    const stockATR = pastSignal.atr || (currentPrice * GHOST_FORECAST.DEFAULT_ATR_RATIO);
    const confidenceFactor = (110 - pastSignal.confidence) / 100;
    const momentum = pastSignal.predictedChange ? pastSignal.predictedChange / 100 : 0;

    targetArr[hoveredIdx] = currentPrice;
    stopArr[hoveredIdx] = currentPrice;

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

  return { ghostForecastDatasets, forecastDatasets };
};
