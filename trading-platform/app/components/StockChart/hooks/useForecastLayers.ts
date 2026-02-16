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
    const pastSignal = analyzeStock(
      data[0].symbol || '',
      data,
      market,
      undefined,
      { endIndex: hoveredIdx, preCalculatedIndicators }
    );
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

  // 4. 未来予測の予報円 (Forecast Cone) - 常に表示される最新の予測
  // 注: 最新の全データを使用したsignalを元に計算（ゴースト予測とは異なります）
  const forecastDatasets = useMemo(() => {
    if (data.length === 0) {
      return [];
    }

    const lastIdx = data.length - 1;
    const currentPrice = data[lastIdx].close;

    // Only generate forecast if we have a proper signal
    if (!signal) {
      return [];
    }

    // Use the provided signal
    const activeSignal = signal;

    const targetArr = new Array(extendedData.labels.length).fill(NaN);
    const stopArr = new Array(extendedData.labels.length).fill(NaN);

    const stockATR = activeSignal.atr || (currentPrice * GHOST_FORECAST.DEFAULT_ATR_RATIO);

    // Use real-time prediction error from accuracy data if available
    const predError = accuracyData?.predictionError ?? activeSignal.predictionError ?? 1.0;
    const errorFactor = Math.min(Math.max(predError, 0.5), 1.5);
    const confidenceUncertainty = 0.4 + ((100 - activeSignal.confidence) / 100) * 0.4;
    const combinedFactor = errorFactor * confidenceUncertainty;

    // 予測の傾きを強調（視認性向上のため係数を微調整）
    const momentum = activeSignal.predictedChange ? (activeSignal.predictedChange / 100) * 1.2 : 0;
    const confidenceFactor = (110 - activeSignal.confidence) / 100;

    let target = activeSignal.targetPrice, stop = activeSignal.stopLoss;
    
    // HOLD判定でも、予測騰落率(predictedChange)がある場合はそれを尊重する
    if (activeSignal.type === 'HOLD') {
      const spreadAdjustment = stockATR * combinedFactor * 1.5;
      // 予測値が0でない限り、センターをずらして傾きを出す
      const center = activeSignal.predictedChange !== 0 ? (activeSignal.targetPrice || currentPrice) : currentPrice;
      target = center + spreadAdjustment;
      stop = center - spreadAdjustment;
    } else {
      const uncertainty = stockATR * FORECAST_CONE.ATR_MULTIPLIER * combinedFactor;
      target += (activeSignal.type === 'BUY' ? 1 : -1) * uncertainty;
      stop -= (activeSignal.type === 'BUY' ? 1 : -1) * uncertainty;
    }

    // NaN safety check
    if (isNaN(target) || !target) target = currentPrice * 1.05;
    if (isNaN(stop) || !stop) stop = currentPrice * 0.95;

    targetArr[lastIdx] = stopArr[lastIdx] = currentPrice;

    // Use dynamic steps or default
    const steps = FORECAST_CONE.STEPS || 60;

    for (let i = 1; i <= steps; i++) {
      if (lastIdx + i < extendedData.labels.length) {
        const timeRatio = i / steps;
        const centerPrice = currentPrice * (1 + (momentum * timeRatio));
        const spread = (stockATR * timeRatio) * confidenceFactor;
        // Ensure spread is at least something visible
        const effectiveSpread = Math.max(spread, currentPrice * 0.005 * timeRatio);

        targetArr[lastIdx + i] = centerPrice + effectiveSpread;
        stopArr[lastIdx + i] = centerPrice - effectiveSpread;
      }
    }

    const color = activeSignal.type === 'BUY' ? '16, 185, 129' : activeSignal.type === 'SELL' ? '239, 68, 68' : '146, 173, 201';
    return [
      {
        label: 'ターゲット',
        data: targetArr,
        borderColor: `rgba(${color}, 1)`,
        backgroundColor: `rgba(${color}, 0.5)`, // Increased opacity from 0.3 for better visibility
        borderWidth: 2,
        borderDash: [6, 4],
        pointRadius: 0,
        fill: '+1', // Fills to the next dataset (Risk)
        spanGaps: true, // Ensure lines connect even if there are momentary gaps (though not expected)
        order: 5 // Ensure it sits above standard lines but behaves predictably with fill
      },
      {
        label: 'リスク',
        data: stopArr,
        borderColor: `rgba(${color}, 0.8)`,
        borderWidth: 2,
        borderDash: [6, 4],
        pointRadius: 0,
        fill: false,
        spanGaps: true,
        order: 5
      }
    ];
  }, [signal, data, extendedData, accuracyData]);

  return { ghostForecastDatasets, forecastDatasets };
};
