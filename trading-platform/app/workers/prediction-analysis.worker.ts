/**
 * Prediction Analysis Web Worker
 * 
 * オフメインスレッドでの高度な予測・分析実行
 * メインスレッドを解放し、複雑な計算中もUIの応答性を維持します。
 */

import { integratedPredictionService } from '@/app/domains/prediction/services/integrated-prediction-service';
import { Stock, OHLCV } from '@/app/types';

// Web Worker message handling
const ctx: Worker = self as any;

ctx.onmessage = async (event: MessageEvent) => {
  const { requestId, stock, data, indexData } = event.data;

  if (!stock || !data) {
    ctx.postMessage({
      requestId,
      error: 'Missing required data: stock or historical data',
      success: false
    });
    return;
  }

  try {
    // 高度な統合予測を実行 (オフメインスレッド)
    const result = await integratedPredictionService.generatePrediction(
      stock as Stock,
      data as OHLCV[],
      indexData as OHLCV[]
    );

    ctx.postMessage({
      requestId,
      result,
      success: true
    });
  } catch (error) {
    console.error('[PredictionWorker] Analysis failed:', error);
    ctx.postMessage({
      requestId,
      error: error instanceof Error ? error.message : 'Unknown prediction error',
      success: false
    });
  }
};
